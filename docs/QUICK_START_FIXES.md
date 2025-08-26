# 🚨 Quick Start - Fix Critical Issues Immediately

## ⚡ IMMEDIATE ACTIONS (Next 2 hours)

### 1. Fix Program ID (CRITICAL - 30 minutes)

```bash
# Navigate to project root
cd /path/to/cto.dex

# Generate new program ID
solana-keygen new -o target/deploy/cto_dex_escrow-keypair.json
solana-keygen pubkey target/deploy/cto_dex_escrow-keypair.json
```

**Copy the output and update these files:**

```rust:programs/cto_dex_escrow/src/lib.rs
// Line 7: Replace the hardcoded ID
declare_id!("PASTE_NEW_PROGRAM_ID_HERE");
```

```toml:Anchor.toml
# Line 7: Update program ID
cto_dex_escrow = "PASTE_NEW_PROGRAM_ID_HERE"
```

### 2. Fix Hash Algorithm (CRITICAL - 30 minutes)

**Update the keeper script to use Keccak:**

```bash
cd scripts/keeper
npm install keccak
```

```javascript:scripts/keeper/src/index.js
// Line ~220: Replace crypto.createHash with keccak
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

### 3. Fix Frontend Campaign Logic (CRITICAL - 1 hour)

**Update ContributeCard to accept campaign address:**

```typescript:apps/web/components/ContributeCard.tsx
// Add props interface
interface ContributeCardProps {
    campaignAddress: PublicKey;
}

export function ContributeCard({ campaignAddress }: ContributeCardProps) {
    // ... existing code ...
    
    const onContribute = useCallback(async () => {
        // ... existing validation ...
        
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

## 🔧 TEST THE FIXES (30 minutes)

### 1. Build and Deploy
```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### 2. Test Frontend
```bash
cd apps/web
npm run dev
```

### 3. Test Basic Flow
- Create a campaign
- Contribute to campaign
- Verify hash consistency

## 📋 NEXT STEPS (After critical fixes)

### Week 1: Complete Critical Fixes
- [x] Fix Program ID
- [x] Fix Hash Algorithm  
- [x] Fix Frontend Campaign Logic
- [ ] Add comprehensive testing
- [ ] Deploy to devnet

### Week 2: Security & Validation
- [ ] Add missing validations
- [ ] Update dependencies
- [ ] Implement error recovery

### Week 3: Quality & Testing
- [ ] Improve error handling
- [ ] Fix memory management
- [ ] Add comprehensive testing

## 🚨 STOP SIGNS - Don't Deploy If:

- ❌ Program ID is still hardcoded
- ❌ Hash algorithms don't match
- ❌ Frontend can't handle different campaign addresses
- ❌ Basic tests fail
- ❌ Program won't build

## 📞 EMERGENCY CONTACTS

If you encounter issues:
1. Check the error logs
2. Verify all file paths are correct
3. Ensure Solana CLI is up to date
4. Check network connectivity to devnet

## ✅ SUCCESS CHECKLIST

After completing these fixes:
- [ ] Program builds successfully
- [ ] Program deploys to devnet
- [ ] Frontend can create campaigns
- [ ] Frontend can contribute to campaigns
- [ ] Hash verification works
- [ ] Basic error handling works

---

**Remember**: These are the MINIMUM fixes needed to get your program working. Don't skip any of them!
