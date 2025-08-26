use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use tiny_keccak::{Hasher, Keccak};

declare_id!("CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY");

// Validation constants
pub const MIN_CONTRIBUTION_AMOUNT: u64 = 1_000_000; // 1 token (assuming 6 decimals)
pub const MAX_CONTRIBUTION_AMOUNT: u64 = 1_000_000_000_000; // 1M tokens (assuming 6 decimals)
pub const MIN_CAMPAIGN_DURATION: i64 = 3600; // 1 hour in seconds
pub const MAX_CAMPAIGN_DURATION: i64 = 365 * 24 * 3600; // 1 year in seconds
pub const MAX_CAMPAIGN_TARGET: u64 = 1_000_000_000_000_000; // 1B tokens (assuming 6 decimals)

// Reentrancy protection constants
pub const REENTRANCY_GUARD_DURATION: i64 = 300; // 5 minutes in seconds

// Scoped drop-guard that guarantees the guard flag is cleared on all exits
struct ReentrancyScope<'a, 'info> {
    campaign: &'a mut Account<'info, Campaign>,
}

impl<'a, 'info> ReentrancyScope<'a, 'info> {
    fn new(campaign: &'a mut Account<'info, Campaign>) -> Result<Self> {
        require!(!campaign.reentrancy_guard, EscrowError::ReentrancyDetected);
        campaign.reentrancy_guard = true;
        campaign.last_operation_timestamp = Clock::get()?.unix_timestamp;
        Ok(Self { campaign })
    }
}

impl<'a, 'info> Drop for ReentrancyScope<'a, 'info> {
    fn drop(&mut self) {
        // Always clear on scope exit
        self.campaign.reentrancy_guard = false;
    }
}

#[program]
pub mod cto_dex_escrow {
    use super::*;

    pub fn init_campaign(
        ctx: Context<InitCampaign>,
        target_amount: u64,
        deadline_unix: i64,
    ) -> Result<()> {
        // Enhanced amount validation
        require!(target_amount >= MIN_CONTRIBUTION_AMOUNT, EscrowError::AmountTooSmall);
        require!(target_amount <= MAX_CAMPAIGN_TARGET, EscrowError::AmountTooLarge);
        
        // Enhanced deadline validation
        let now = Clock::get()?.unix_timestamp;
        require!(deadline_unix > now, EscrowError::InvalidDeadline);
        
        let duration = deadline_unix - now;
        require!(duration >= MIN_CAMPAIGN_DURATION, EscrowError::DurationTooShort);
        require!(duration <= MAX_CAMPAIGN_DURATION, EscrowError::DurationTooLong);

        // Validate campaign creator has sufficient balance for rent
        let rent = Rent::get()?;
        let campaign_rent = rent.minimum_balance(Campaign::SPACE);
        let vault_rent = rent.minimum_balance(0); // Token account rent
        
        // Check if creator has enough SOL for rent
        require!(
            ctx.accounts.creator.lamports() >= campaign_rent + vault_rent,
            EscrowError::InsufficientRent
        );

        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.pay_mint = ctx.accounts.pay_mint.key();
        campaign.bump = ctx.bumps.campaign;
        campaign.target_amount = target_amount;
        campaign.total_contributed = 0;
        campaign.deadline = deadline_unix;
        campaign.status = CampaignStatus::Pending as u8;
        campaign.top_contributor = Pubkey::default();
        campaign.top_contributor_amount = 0;
        campaign.metadata_uri = String::new();
        campaign.metadata_hash = [0u8; 32];
        campaign.merchant_hash = [0u8; 32];
        campaign.merchant_hash_set = false;
        campaign.delegate_authority = Pubkey::default();
        
        // Initialize reentrancy protection
        campaign.reentrancy_guard = false;
        campaign.last_operation_timestamp = 0;
        
        Ok(())
    }

    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        // Enhanced amount validation
        require!(amount >= MIN_CONTRIBUTION_AMOUNT, EscrowError::AmountTooSmall);
        require!(amount <= MAX_CONTRIBUTION_AMOUNT, EscrowError::AmountTooLarge);
        
        let now = Clock::get()?.unix_timestamp;

        require!(campaign.status == CampaignStatus::Pending as u8, EscrowError::WrongStatus);
        require!(now <= campaign.deadline, EscrowError::DeadlinePassed);

        // Validate contributor has sufficient balance
        let contributor_balance = ctx.accounts.contributor_ata.amount;
        require!(contributor_balance >= amount, EscrowError::InsufficientBalance);

        // Validate campaign hasn't exceeded target
        let new_total = campaign.total_contributed
            .checked_add(amount)
            .ok_or(EscrowError::Overflow)?;
        require!(new_total <= campaign.target_amount, EscrowError::ExceedsTarget);

        // Precompute any values needed while not holding the guard
        let campaign_key = campaign.key();

        // Set guard only around the mutation/transfer section
        let mut _guard = ReentrancyScope::new(campaign)?;

        // Transfer tokens from contributor to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.contributor_ata.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.contributor.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update contributor record
        let contribution = &mut ctx.accounts.contribution;
        if contribution.amount == 0 {
            contribution.contributor = ctx.accounts.contributor.key();
            contribution.campaign = campaign_key;
            contribution.refunded = false;
        }
        contribution.amount = contribution
            .amount
            .checked_add(amount)
            .ok_or(EscrowError::Overflow)?;

        // Update campaign totals
        _guard.campaign.total_contributed = new_total;

        if contribution.amount > _guard.campaign.top_contributor_amount {
            _guard.campaign.top_contributor_amount = contribution.amount;
            _guard.campaign.top_contributor = ctx.accounts.contributor.key();
        }
        
        Ok(())
    }

    pub fn submit_metadata(ctx: Context<SubmitMetadata>, uri: String, metadata_hash: [u8; 32]) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        require!(campaign.status == CampaignStatus::Pending as u8, EscrowError::WrongStatus);
        
        // Only the top contributor or creator can submit
        let signer = ctx.accounts.submitter.key();
        require!(signer == campaign.top_contributor || signer == campaign.creator, EscrowError::Unauthorized);
        
        // Enhanced URI validation
        require!(!uri.is_empty(), EscrowError::EmptyUri);
        require!(uri.len() <= Campaign::MAX_URI_LEN, EscrowError::UriTooLong);
        
        // Prefer content-addressed or trusted schemes: ipfs:// or ar://. Allow https as fallback.
        let is_ipfs = uri.starts_with("ipfs://") && uri.len() > 7;
        let is_arweave = uri.starts_with("ar://") && uri.len() > 5;
        let is_https = uri.starts_with("https://");
        require!(is_ipfs || is_arweave || is_https, EscrowError::InvalidUriFormat);
        // Require a non-zero metadata hash to carry an integrity commitment
        require!(metadata_hash != [0u8; 32], EscrowError::InvalidMetadataHash);

        let mut _guard = ReentrancyScope::new(campaign)?;

        _guard.campaign.metadata_uri = uri;
        _guard.campaign.metadata_hash = metadata_hash;

        Ok(())
    }

    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        require!(campaign.status == CampaignStatus::Pending as u8, EscrowError::WrongStatus);
        let now = Clock::get()?.unix_timestamp;

        if campaign.total_contributed >= campaign.target_amount {
            let mut _guard = ReentrancyScope::new(campaign)?;
            _guard.campaign.status = CampaignStatus::Succeeded as u8;
        } else if now > campaign.deadline {
            let mut _guard = ReentrancyScope::new(campaign)?;
            _guard.campaign.status = CampaignStatus::Failed as u8;
        } else {
            return err!(EscrowError::GoalNotMet);
        }

        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        // Copy the fields we need before mutable borrow
        let creator = ctx.accounts.campaign.creator;
        let bump = ctx.accounts.campaign.bump;
        let status = ctx.accounts.campaign.status;

        require!(status == CampaignStatus::Failed as u8, EscrowError::WrongStatus);

        let contribution = &mut ctx.accounts.contribution;
        require!(!contribution.refunded, EscrowError::AlreadyRefunded);
        let amount = contribution.amount;
        require!(amount > 0, EscrowError::NothingToRefund);

        // Validate vault has sufficient balance for refund
        let vault_balance = ctx.accounts.vault.amount;
        require!(vault_balance >= amount, EscrowError::InsufficientVaultBalance);

        let campaign = &mut ctx.accounts.campaign;
        let mut _guard = ReentrancyScope::new(campaign)?;

        // Seeds for vault authority = campaign PDA itself
        let seeds: &[&[u8]] = &[b"campaign", creator.as_ref(), &[bump]]; // campaign PDA seeds
        let signer_seeds = &[seeds];
        // Transfer back to contributor
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.contributor_ata.to_account_info(),
            authority: _guard.campaign.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        contribution.refunded = true;

        Ok(())
    }

    pub fn set_merchant_hash(ctx: Context<SetMerchantHash>, merchant_hash: [u8; 32]) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        require!(campaign.status == CampaignStatus::Succeeded as u8, EscrowError::WrongStatus);
        let signer = ctx.accounts.authority.key();
        require!(
            signer == campaign.top_contributor || signer == campaign.creator || signer == campaign.delegate_authority,
            EscrowError::Unauthorized
        );
        
        // Validate merchant hash is not all zeros
        require!(merchant_hash != [0u8; 32], EscrowError::InvalidMerchantHash);

        let mut _guard = ReentrancyScope::new(campaign)?;

        _guard.campaign.merchant_hash = merchant_hash;
        _guard.campaign.merchant_hash_set = true;

        Ok(())
    }

    // Allow the creator to set an optional delegate authority
    pub fn set_delegate_authority(ctx: Context<SetDelegateAuthority>, delegate: Pubkey) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(ctx.accounts.creator.key() == campaign.creator, EscrowError::Unauthorized);
        let mut _guard = ReentrancyScope::new(campaign)?;
        _guard.campaign.delegate_authority = delegate;
        Ok(())
    }

    pub fn payout(ctx: Context<Payout>, amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        // Copy the fields we need before mutable borrow
        let creator = campaign.creator;
        let pay_mint = campaign.pay_mint;
        let bump = campaign.bump;
        let status = campaign.status;
        let merchant_hash_set = campaign.merchant_hash_set;
        let merchant_hash = campaign.merchant_hash;
        
        require!(status == CampaignStatus::Succeeded as u8, EscrowError::WrongStatus);
        require!(merchant_hash_set, EscrowError::MerchantHashNotSet);
        require!(amount > 0, EscrowError::InvalidAmount);
        require!(amount >= MIN_CONTRIBUTION_AMOUNT, EscrowError::AmountTooSmall);
        require!(amount <= MAX_CONTRIBUTION_AMOUNT, EscrowError::AmountTooLarge);

        // Validate vault has sufficient balance for payout
        let vault_balance = ctx.accounts.vault.amount;
        require!(vault_balance >= amount, EscrowError::InsufficientVaultBalance);

        // Validate payout amount doesn't exceed campaign total
        require!(amount <= campaign.total_contributed, EscrowError::ExceedsCampaignTotal);

        // Compute keccak256(pay_mint || dest_ata || amount_le)
        let mut input: Vec<u8> = Vec::with_capacity(32 + 32 + 8);
        input.extend_from_slice(pay_mint.as_ref());
        input.extend_from_slice(ctx.accounts.merchant_ata.key().as_ref());
        input.extend_from_slice(&amount.to_le_bytes());
        let mut hasher = Keccak::v256();
        hasher.update(&input);
        let mut output = [0u8; 32];
        hasher.finalize(&mut output);
        require!(output == merchant_hash, EscrowError::MerchantHashMismatch);

        let mut _guard = ReentrancyScope::new(campaign)?;

        // transfer to merchant
        let seeds: &[&[u8]] = &[b"campaign", creator.as_ref(), &[bump]];
        let signer_seeds = &[seeds];
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.merchant_ata.to_account_info(),
            authority: _guard.campaign.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        // Update campaign status
        _guard.campaign.status = CampaignStatus::Paid as u8;

        Ok(())
    }

    // Emergency function to clear stuck reentrancy guards
    pub fn clear_reentrancy_guard(ctx: Context<ClearReentrancyGuard>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let now = Clock::get()?.unix_timestamp;
        
        // Only allow clearing if guard has been stuck for too long
        require!(
            campaign.reentrancy_guard && 
            (now - campaign.last_operation_timestamp) > REENTRANCY_GUARD_DURATION,
            EscrowError::CannotClearGuard
        );
        
        // Only campaign creator or top contributor can clear stuck guards
        let signer = ctx.accounts.authority.key();
        require!(
            signer == campaign.creator || signer == campaign.top_contributor,
            EscrowError::Unauthorized
        );
        
        campaign.reentrancy_guard = false;
        campaign.last_operation_timestamp = 0;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    pub pay_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        space = Campaign::SPACE,
        seeds = [b"campaign", creator.key().as_ref()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = pay_mint,
        associated_token::authority = campaign
    )]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub pay_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = pay_mint,
        associated_token::authority = contributor
    )]
    pub contributor_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = pay_mint,
        associated_token::authority = campaign
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = contributor,
        space = Contribution::SPACE,
        seeds = [b"contribution", campaign.key().as_ref(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SubmitMetadata<'info> {
    pub submitter: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub pay_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = pay_mint,
        associated_token::authority = contributor
    )]
    pub contributor_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = pay_mint,
        associated_token::authority = campaign
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"contribution", campaign.key().as_ref(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetMerchantHash<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct SetDelegateAuthority<'info> {
    pub creator: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct Payout<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub pay_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = pay_mint,
        associated_token::authority = campaign
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClearReentrancyGuard<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub pay_mint: Pubkey,
    pub bump: u8,
    pub target_amount: u64,
    pub total_contributed: u64,
    pub deadline: i64,
    pub status: u8,
    pub top_contributor: Pubkey,
    pub top_contributor_amount: u64,
    pub metadata_uri: String,
    pub metadata_hash: [u8; 32],
    pub merchant_hash: [u8; 32],
    pub merchant_hash_set: bool,
    pub delegate_authority: Pubkey,
    pub reentrancy_guard: bool,
    pub last_operation_timestamp: i64,
}

impl Campaign {
    pub const MAX_URI_LEN: usize = 256;
    pub const SPACE: usize = 8  // discriminator
        + 32 // creator
        + 32 // pay_mint
        + 1  // bump
        + 8  // target_amount
        + 8  // total_contributed
        + 8  // deadline
        + 1  // status
        + 32 // top_contributor
        + 8  // top_contributor_amount
        + 4 + Self::MAX_URI_LEN // metadata_uri
        + 32 // metadata_hash
        + 32 // merchant_hash
        + 1  // merchant_hash_set
        + 32 // delegate_authority
        + 1  // reentrancy_guard
        + 8; // last_operation_timestamp
}

#[account]
pub struct Contribution {
    pub contributor: Pubkey,
    pub campaign: Pubkey,
    pub amount: u64,
    pub refunded: bool,
}

impl Contribution {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1;
}

#[repr(u8)]
pub enum CampaignStatus {
    Pending = 0,
    Succeeded = 1,
    Failed = 2,
    Paid = 3,
}

#[error_code]
pub enum EscrowError {
    #[msg("Invalid amount")] 
    InvalidAmount,
    #[msg("Invalid deadline")] 
    InvalidDeadline,
    #[msg("Wrong status for this action")] 
    WrongStatus,
    #[msg("Deadline passed")] 
    DeadlinePassed,
    #[msg("Overflow")] 
    Overflow,
    #[msg("Unauthorized")] 
    Unauthorized,
    #[msg("URI too long")] 
    UriTooLong,
    #[msg("Goal not met")] 
    GoalNotMet,
    #[msg("Already refunded")] 
    AlreadyRefunded,
    #[msg("Nothing to refund")] 
    NothingToRefund,
    #[msg("Merchant hash not set")] 
    MerchantHashNotSet,
    #[msg("Merchant hash mismatch")] 
    MerchantHashMismatch,
    #[msg("Amount too small")] 
    AmountTooSmall,
    #[msg("Amount too large")] 
    AmountTooLarge,
    #[msg("Duration too short")] 
    DurationTooShort,
    #[msg("Duration too long")] 
    DurationTooLong,
    #[msg("Insufficient rent")] 
    InsufficientRent,
    #[msg("Insufficient balance")] 
    InsufficientBalance,
    #[msg("Exceeds target")] 
    ExceedsTarget,
    #[msg("Empty URI")] 
    EmptyUri,
    #[msg("Invalid URI format")] 
    InvalidUriFormat,
    #[msg("Invalid merchant hash")] 
    InvalidMerchantHash,
    #[msg("Invalid metadata hash")] 
    InvalidMetadataHash,
    #[msg("Exceeds campaign total")] 
    ExceedsCampaignTotal,
    #[msg("Insufficient vault balance")] 
    InsufficientVaultBalance,
    #[msg("Reentrancy detected")] 
    ReentrancyDetected,
    #[msg("Cannot clear guard")] 
    CannotClearGuard,
}