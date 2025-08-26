## Architecture

### Components
- On-chain program (`cto_dex_escrow`): holds campaign state, vault PDA, contributions, and payout guard using `merchant_hash`.
- Web app (`apps/web`): wallet connect, campaign management, contribution UI, metadata upload to IPFS/Arweave.
- Keeper (`scripts/keeper`): off-chain executor to complete DEX Screener checkout, collect merchant destination, set `merchant_hash`, and call `payout`.

### Data model
- Campaign
  - `target_amount` (u64, in minor units of `pay_mint`)
  - `deadline` (unix i64)
  - `pay_mint` (USDC preferred)
  - `total_contributed`, `status` (Pending|Succeeded|Failed|Paid)
  - `top_contributor`, `top_contributor_amount`
  - `metadata_uri` (IPFS/Arweave), `metadata_hash` (sha256)
  - `merchant_hash` (keccak256(pay_mint || merchant_ata || amount_le))

### Flows
1. Contribute: user transfers USDC to vault PDA, contribution account tracks sum; updates top contributor.
2. Submit metadata: only top contributor or creator; URI+hash stored on-chain.
3. Finalize: if goal met before deadline → Succeeded; else after deadline → Failed.
4. Refund: if Failed, each contributor withdraws their own full amount.
5. Payout: keeper gets a merchant ATA, amount; hashes and sets `merchant_hash`, then transfers funds from vault to merchant ATA using PDA authority.

### Trust assumptions
- Without an official DEX Screener API, payout requires an off-chain agent. The `merchant_hash` guard ensures funds can only leave to the precomputed destination and amount captured from checkout.
- Alternatively, replace keeper with a multisig workflow where top N contributors co-sign the final transfer.

### Token choice
- Use USDC to avoid price volatility. If SOL contributions are needed, accept SOL and swap to USDC via Jupiter in the keeper just before payout.


