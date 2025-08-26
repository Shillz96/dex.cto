# Solana Backend Fixes - Implementation Plan

## 🚀 Phase 1: Critical Fixes (Week 1)

### 1. Fix Program ID - Generate and Configure Proper Program ID

#### Step 1: Generate New Program ID
```bash
# Navigate to project root
cd /path/to/cto.dex

# Generate new keypair for program
solana-keygen new -o target/deploy/cto_dex_escrow-keypair.json

# Get the public key (this is your new program ID)
solana-keygen pubkey target/deploy/cto_dex_escrow-keypair.json
```

#### Step 2: Update Program Source
```rust:programs/cto_dex_escrow/src/lib.rs
// Replace the hardcoded program ID with the new one
declare_id!("YOUR_NEW_PROGRAM_ID_HERE");
```

#### Step 3: Update Anchor Configuration
```toml:Anchor.toml
[programs.localnet]
cto_dex_escrow = "YOUR_NEW_PROGRAM_ID_HERE"

[programs.devnet]
cto_dex_escrow = "YOUR_NEW_PROGRAM_ID_HERE"

[programs.mainnet]
cto_dex_escrow = "YOUR_NEW_PROGRAM_ID_HERE"
```

#### Step 4: Update Frontend Environment
```bash
# Create/update .env.local in apps/web/
NEXT_PUBLIC_PROGRAM_ID=<YOUR_PROGRAM_ID>
```

#### Step 5: Update Keeper Environment
```bash
# Create/update .env in scripts/keeper/
PROGRAM_ID=<YOUR_PROGRAM_ID>
```

#### Step 6: Test Deployment
```bash
# Build and deploy to devnet
anchor build
anchor deploy --provider.cluster devnet
```

---

### 2. Fix Hash Algorithm - Ensure Consistency Between On-Chain and Off-Chain

#### Decision: Use Keccak (SHA3-256) consistently

#### Step 1: Update On-Chain Hash (Rust Program)
```rust:programs/cto_dex_escrow/src/lib.rs
// In the payout function, ensure we're using Keccak
use tiny_keccak::{Hasher, Keccak};

// ... existing code ...

pub fn payout(ctx: Context<Payout>, amount: u64) -> Result<()> {
    // ... existing validation code ...
    
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
    
    // ... rest of function ...
}
```

#### Step 2: Update Off-Chain Hash (Keeper Script)
```javascript:scripts/keeper/src/index.js
// Install keccak package
npm install keccak

// Update the computeMerchantHash function
import keccak from 'keccak';

computeMerchantHash(payMint, merchantAta, amount) {
    const input = Buffer.concat([
        payMint.toBuffer(),
        merchantAta.toBuffer(),
        Buffer.from(new BN(amount).toArray('le', 8))
    ]);
    
    // Use keccak256 to match on-chain implementation
    return keccak('keccak256').update(input).digest();
}
```

#### Step 3: Test Hash Consistency
```javascript
// Add test to verify hash matching
function testHashConsistency() {
    const payMint = new PublicKey("11111111111111111111111111111111");
    const merchantAta = new PublicKey("22222222222222222222222222222222");
    const amount = 1000000;
    
    // Test both implementations produce same hash
    const onChainHash = computeOnChainHash(payMint, merchantAta, amount);
    const offChainHash = computeOffChainHash(payMint, merchantAta, amount);
    
    console.log("Hash consistency:", Buffer.compare(onChainHash, offChainHash) === 0);
}
```

---

### 3. Fix Frontend Campaign Logic - Proper Campaign Address Handling

#### Step 1: Update ContributeCard Component
```typescript:apps/web/components/ContributeCard.tsx
interface ContributeCardProps {
    campaignAddress: PublicKey;
    campaignData?: any; // Add proper type
}

export function ContributeCard({ campaignAddress, campaignData }: ContributeCardProps) {
    // ... existing state ...
    
    const onContribute = useCallback(async () => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            setMessage('Connect wallet');
            return;
        }
        
        setLoading(true);
        setMessage('');
        
        try {
            const program = getProgram(connection, wallet as any);
            const payMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);
            
            // Use passed campaign address instead of deriving from wallet
            const contributorAta = getAssociatedTokenAddressSync(payMint, wallet.publicKey);
            const vault = getAssociatedTokenAddressSync(payMint, campaignAddress, true);
            const [contributionPda] = deriveContributionPda(campaignAddress, wallet.publicKey, program.programId);

            await program.methods
                .contribute(new BN(amount))
                .accounts({
                    contributor: wallet.publicKey,
                    campaign: campaignAddress, // Use passed address
                    payMint,
                    contributorAta,
                    vault,
                    contribution: contributionPda,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .rpc();
                
            setMessage('Contribution sent');
        } catch (e: any) {
            setMessage(e.message || 'Failed to contribute');
        } finally {
            setLoading(false);
        }
    }, [connection, wallet, amount, campaignAddress]);

    // ... rest of component ...
}
```

#### Step 2: Update Campaign View Page
```typescript:apps/web/pages/campaign/[tokenAddress].tsx
export default function CampaignPage() {
    const router = useRouter();
    const { tokenAddress } = router.query;
    const [campaignData, setCampaignData] = useState(null);
    
    useEffect(() => {
        if (tokenAddress) {
            // Fetch campaign data using tokenAddress
            fetchCampaignData(tokenAddress as string);
        }
    }, [tokenAddress]);
    
    if (!campaignData) {
        return <div>Loading campaign...</div>;
    }
    
    return (
        <div>
            <h1>Campaign: {tokenAddress}</h1>
            <ContributeCard 
                campaignAddress={new PublicKey(tokenAddress as string)}
                campaignData={campaignData}
            />
            {/* Other campaign components */}
        </div>
    );
}
```

---

## 🛡️ Phase 2: Security & Validation (Week 2)

### 4. Add Missing Validations - Fund Checks, Deadline Limits, etc.

#### Step 1: Add New Error Variants
```rust:programs/cto_dex_escrow/src/lib.rs
#[error_code]
pub enum EscrowError {
    // ... existing errors ...
    #[msg("Insufficient funds in vault")] 
    InsufficientFunds,
    #[msg("Campaign duration too long")] 
    DurationTooLong,
    #[msg("Contribution amount too small")] 
    ContributionTooSmall,
    #[msg("Contribution amount too large")] 
    ContributionTooLarge,
    #[msg("Invalid campaign creator")] 
    InvalidCreator,
    #[msg("Deadline too far in future")] 
    DeadlineTooFar,
}
```

#### Step 2: Add Validation Constants
```rust:programs/cto_dex_escrow/src/lib.rs
impl Campaign {
    pub const MAX_URI_LEN: usize = 256;
    pub const MAX_CAMPAIGN_DURATION: i64 = 365 * 24 * 60 * 60; // 1 year
    pub const MIN_CONTRIBUTION: u64 = 1_000; // 0.001 USDC
    pub const MAX_CONTRIBUTION: u64 = 1_000_000_000; // 1000 USDC
    
    // ... existing constants ...
}
```

#### Step 3: Update Init Campaign Function
```rust:programs/cto_dex_escrow/src/lib.rs
pub fn init_campaign(
    ctx: Context<InitCampaign>,
    target_amount: u64,
    deadline_unix: i64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    
    require!(target_amount > 0, EscrowError::InvalidAmount);
    require!(target_amount >= Campaign::MIN_CONTRIBUTION, EscrowError::ContributionTooSmall);
    require!(target_amount <= Campaign::MAX_CONTRIBUTION, EscrowError::ContributionTooLarge);
    require!(deadline_unix > now, EscrowError::InvalidDeadline);
    require!(deadline_unix <= now + Campaign::MAX_CAMPAIGN_DURATION, EscrowError::DeadlineTooFar);
    
    // ... rest of function ...
}
```

#### Step 4: Update Contribute Function
```rust:programs/cto_dex_escrow/src/lib.rs
pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
    require!(amount > 0, EscrowError::InvalidAmount);
    require!(amount >= Campaign::MIN_CONTRIBUTION, EscrowError::ContributionTooSmall);
    require!(amount <= Campaign::MAX_CONTRIBUTION, EscrowError::ContributionTooLarge);
    
    // ... rest of function ...
}
```

#### Step 5: Update Payout Function
```rust:programs/cto_dex_escrow/src/lib.rs
pub fn payout(ctx: Context<Payout>, amount: u64) -> Result<()> {
    // ... existing validation ...
    
    // Check vault has sufficient funds
    let vault_balance = ctx.accounts.vault.amount;
    require!(amount <= vault_balance, EscrowError::InsufficientFunds);
    
    // ... rest of function ...
}
```

---

### 5. Update Dependencies - Align Versions Across All Components

#### Step 1: Update Frontend Dependencies
```json:apps/web/package.json
{
  "dependencies": {
    "@coral-xyz/anchor": "^0.31.1",
    "@solana/spl-token": "^0.4.8",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.30",
    "@solana/web3.js": "^1.95.3",
    "next": "^14.2.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zod": "^3.23.8"
  }
}
```

#### Step 2: Update Program Dependencies
```toml:programs/cto_dex_escrow/Cargo.toml
[dependencies]
anchor-lang = { version = "0.31.1", features = ["init-if-needed"] }
anchor-spl = { version = "0.31.1", features = ["associated_token", "token"] }
tiny-keccak = { version = "2", features = ["keccak"] }
```

#### Step 3: Update Anchor Configuration
```toml:Anchor.toml
[toolchain]
anchor_version = "0.31.1"
```

#### Step 4: Update Lock Files
```bash
# In apps/web/
npm install

# In project root
cargo update
```

---

### 6. Add Error Recovery - Implement Retry Logic and Alerting

#### Step 1: Create Error Handling Utilities
```typescript:apps/web/lib/errorHandler.ts
export class RetryManager {
    private maxRetries: number;
    private baseDelay: number;
    
    constructor(maxRetries = 3, baseDelay = 1000) {
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
    }
    
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        context: string
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === this.maxRetries) {
                    console.error(`Failed after ${attempt} attempts:`, error);
                    throw error;
                }
                
                const delay = this.baseDelay * Math.pow(2, attempt - 1);
                console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError!;
    }
}

export class AlertManager {
    static async sendAlert(message: string, level: 'info' | 'warning' | 'error') {
        // Implement your alerting system here
        // Could be Discord webhook, email, Slack, etc.
        console.log(`[${level.toUpperCase()}] ${message}`);
        
        // Example Discord webhook
        if (process.env.DISCORD_WEBHOOK_URL) {
            try {
                await fetch(process.env.DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: `[${level.toUpperCase()}] ${message}`
                    })
                });
            } catch (error) {
                console.error('Failed to send Discord alert:', error);
            }
        }
    }
}
```

#### Step 2: Update Anchor Client with Retry Logic
```typescript:apps/web/lib/anchorClient.ts
import { RetryManager, AlertManager } from './errorHandler';

export function getProgram(connection: Connection, wallet: any) {
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
    return new Program(idl as Idl, programId, provider);
}

export class EnhancedProgramClient {
    private program: Program;
    private retryManager: RetryManager;
    
    constructor(connection: Connection, wallet: any) {
        this.program = getProgram(connection, wallet);
        this.retryManager = new RetryManager();
    }
    
    async executeTransaction(
        transactionBuilder: () => any,
        context: string
    ) {
        return this.retryManager.executeWithRetry(
            async () => {
                const tx = transactionBuilder();
                return await tx.rpc();
            },
            context
        );
    }
    
    async initCampaign(targetAmount: BN, deadlineUnix: BN, accounts: any) {
        return this.executeTransaction(
            () => this.program.methods
                .initCampaign(targetAmount, deadlineUnix)
                .accounts(accounts),
            'initCampaign'
        );
    }
    
    // ... other methods ...
}
```

#### Step 3: Update Keeper Script with Error Recovery
```javascript:scripts/keeper/src/index.js
import { AlertManager } from './alertManager.js';

class CampaignKeeper {
    constructor(connection, programId, keypair) {
        // ... existing initialization ...
        this.retryAttempts = new Map();
        this.maxRetries = 3;
    }
    
    async executeWithRetry(operation, context, campaignPubkey) {
        const attempts = this.retryAttempts.get(campaignPubkey.toString()) || 0;
        
        if (attempts >= this.maxRetries) {
            await AlertManager.sendAlert(
                `Campaign ${campaignPubkey.toString().slice(0, 8)} failed after ${attempts} attempts: ${context}`,
                'error'
            );
            return false;
        }
        
        try {
            await operation();
            this.retryAttempts.delete(campaignPubkey.toString());
            return true;
        } catch (error) {
            this.retryAttempts.set(campaignPubkey.toString(), attempts + 1);
            
            await AlertManager.sendAlert(
                `Campaign ${campaignPubkey.toString().slice(0, 8)} attempt ${attempts + 1} failed: ${error.message}`,
                'warning'
            );
            
            // Exponential backoff
            const delay = Math.pow(2, attempts) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return false;
        }
    }
    
    async finalizeCampaign(campaignPubkey) {
        return this.executeWithRetry(
            async () => {
                await this.program.methods
                    .finalize()
                    .accounts({ campaign: campaignPubkey })
                    .rpc();
            },
            'finalize',
            campaignPubkey
        );
    }
    
    // ... update other methods similarly ...
}
```

---

## 🧪 Phase 3: Quality & Testing (Week 3)

### 7. Improve Error Handling and Context

### 8. Fix Keeper Script Memory Management

### 9. Add Comprehensive Testing

---

## 📋 Testing Strategy

### Unit Tests
```bash
# Test program functions
cd programs/cto_dex_escrow
cargo test

# Test frontend utilities
cd apps/web
npm test
```

### Integration Tests
```bash
# Test complete workflows
anchor test
```

### Security Tests
- Use tools like `cargo-audit` for dependency vulnerabilities
- Test reentrancy protection
- Validate access controls

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All critical issues resolved
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Deployment
- [ ] Program deployed to devnet
- [ ] Frontend updated and tested
- [ ] Keeper script deployed and tested
- [ ] Monitoring and alerting active

### Post-Deployment
- [ ] Production monitoring active
- [ ] Error tracking implemented
- [ ] Performance metrics collected
- [ ] User feedback collected
