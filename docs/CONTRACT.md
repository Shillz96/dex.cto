## Contract Interface (Anchor)

Program id: `ctoDexEscrow1111111111111111111111111111111`

### Accounts
- `Campaign` PDA seeds: `["campaign", creator, campaign_pubkey]`
- `Contribution` PDA seeds: `["contribution", campaign, contributor]`
- `vault` ATA owner: `Campaign` PDA; mint: `pay_mint`

### Instructions
- `init_campaign(target_amount: u64, deadline_unix: i64)` → creates `Campaign` and vault ATA.
- `contribute(amount: u64)` → transfer from contributor ATA to vault; upserts `Contribution`.
- `submit_metadata(uri: string, metadata_hash: [u8;32])` → only `top_contributor` or `creator`.
- `finalize()` → Pending → Succeeded if goal met before deadline; or → Failed after deadline.
- `refund()` → for Failed campaigns; returns full contribution to contributor.
- `set_merchant_hash(merchant_hash: [u8;32])` → only `top_contributor` or `creator`.
- `payout(amount: u64)` → transfers from vault to `merchant_ata` if `keccak(pay_mint||merchant_ata||amount_le)` matches stored `merchant_hash`.

### Status
`Pending` → `Succeeded` → `Paid`
`Pending` → `Failed`

### Notes
- URI length capped at 256 bytes. Hash is binary; compute sha256 off-chain over uploaded JSON+images bundle.
- `merchant_hash` is keccak256 to align with common crypto tooling; serves as payout guard.


