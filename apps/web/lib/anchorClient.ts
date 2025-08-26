import { Connection, PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import idl from '../idl/cto_dex_escrow.json';

// Simple program interface
export interface SimpleProgram extends Program {
  methods: any;
}

// Basic program getter
export function getProgram(connection: Connection, wallet: any): SimpleProgram {
  try {
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const envProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID;
    if (!envProgramId) {
      throw new Error('NEXT_PUBLIC_PROGRAM_ID is not set. Please configure your frontend env.');
    }
    const programId = new PublicKey(envProgramId);
    const program = new (Program as any)(idl, programId, provider) as SimpleProgram;
    
    return program;
  } catch (error) {
    console.error('Failed to get program:', error);
    throw error;
  }
}

// Basic transaction sender
export async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: any[],
  options: any = {}
): Promise<TransactionSignature> {
  try {
    const signature = await connection.sendTransaction(transaction, signers, options);
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    return signature;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

// Basic account fetcher
export async function fetchAccount<T>(
  program: Program,
  accountType: string,
  publicKey: PublicKey
): Promise<T> {
  try {
    const account = await (program.account as any)[accountType].fetch(publicKey);
    return account as T;
  } catch (error) {
    console.error(`Failed to fetch ${accountType}:`, error);
    throw error;
  }
}

// Basic campaign fetcher
export async function fetchCampaign(
  program: Program,
  campaignPubkey: PublicKey
) {
  try {
    return await (program.account as any).campaign.fetch(campaignPubkey);
  } catch (error) {
    console.error('Failed to fetch campaign:', error);
    throw error;
  }
}

// Basic campaign creator
export async function createCampaign(
  program: Program,
  campaignData: any
): Promise<TransactionSignature> {
  try {
    const tx = await program.methods
      .initCampaign(
        campaignData.targetAmount,
        campaignData.deadline,
        campaignData.payMint
      )
      .accounts({
        campaign: campaignData.campaignPubkey,
        creator: campaignData.creator,
        payMint: campaignData.payMint,
        vault: campaignData.vault,
        tokenProgram: campaignData.tokenProgram,
        systemProgram: campaignData.systemProgram,
        rent: campaignData.rent
      })
      .rpc();
    
    return tx;
  } catch (error) {
    console.error('Failed to create campaign:', error);
    throw error;
  }
}

// Basic contribution
export async function contribute(
  program: Program,
  contributionData: any
): Promise<TransactionSignature> {
  try {
    const tx = await program.methods
      .contribute(contributionData.amount)
      .accounts({
        campaign: contributionData.campaign,
        contributor: contributionData.contributor,
        contributorAta: contributionData.contributorAta,
        vault: contributionData.vault,
        tokenProgram: contributionData.tokenProgram,
        systemProgram: contributionData.systemProgram
      })
      .rpc();
    
    return tx;
  } catch (error) {
    console.error('Failed to contribute:', error);
    throw error;
  }
}

// Basic campaign finalization
export async function finalizeCampaign(
  program: Program,
  campaignPubkey: PublicKey
): Promise<TransactionSignature> {
  try {
    const tx = await program.methods
      .finalize()
      .accounts({
        campaign: campaignPubkey
      })
      .rpc();
    
    return tx;
  } catch (error) {
    console.error('Failed to finalize campaign:', error);
    throw error;
  }
}

// Basic payout
export async function payout(
  program: Program,
  payoutData: any
): Promise<TransactionSignature> {
  try {
    const tx = await program.methods
      .payout(payoutData.amount)
      .accounts({
        campaign: payoutData.campaign,
        payMint: payoutData.payMint,
        vault: payoutData.vault,
        merchantAta: payoutData.merchantAta,
        tokenProgram: payoutData.tokenProgram
      })
      .rpc();
    
    return tx;
  } catch (error) {
    console.error('Failed to payout:', error);
    throw error;
  }
}

// Basic connection health check
export async function checkConnectionHealth(connection: Connection): Promise<boolean> {
  try {
    await connection.getLatestBlockhash();
    return true;
  } catch (error) {
    console.error('Connection health check failed:', error);
    return false;
  }
}

// Basic program health check
export async function checkProgramHealth(program: Program): Promise<boolean> {
  try {
    // Simple check - if we can access the program ID, it's accessible
    const programId = program.programId;
    return true;
  } catch (error) {
    console.error('Program health check failed:', error);
    return false;
  }
}


