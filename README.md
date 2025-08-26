## Dex.Cto Crowdfund Escrow (Solana)

Time-locked, goal-based escrow for community-funded DEX Screener Enhanced Token Info orders. Contributors deposit USDC; if the target is reached before the deadline, funds are released to pay; otherwise contributors can refund pro‑rata, trustlessly on-chain.

- Product reference: DEX Screener Enhanced Token Info
- Project overview: see `docs/PROJECT_OVERVIEW.md`
- Contributor task board: see `docs/TASK_LIST.md`

### Monorepo layout
- `programs/cto_dex_escrow`: Anchor program (escrow + refund + payout guard)
- `apps/web`: Next.js app (wallet connect, create/join campaign, contribute, refund, submit metadata)
- `scripts/keeper`: Off-chain keeper template (executes checkout/payout)
- `docs/`: Architecture, contract spec, deployment

### Quick start
1) Install toolchain (Solana, Anchor, Rust, Node 18+). See `docs/DEPLOYMENT.md`.
2) Configure environment files from provided templates:
   - Web: copy `apps/web/.env.example` → `apps/web/.env.local` and fill values
   - Keeper: copy `scripts/keeper/.env.example` → `scripts/keeper/.env` and fill values
3) Build program: `anchor build`
4) Start web app: `pnpm -w install && pnpm -w dev`

### High level flow
- Users contribute USDC to a campaign vault PDA before `deadline`.
- If `total_contributed >= target_amount`, anyone can `finalize` → status `Succeeded` permanently (even after deadline). If deadline passes without reaching target, status `Failed`. Otherwise `finalize` returns `GoalNotMet`.
- Keeper opens checkout, captures merchant destination+amount, hashes it, calls `set_merchant_hash` (authorized by creator, top contributor, or creator-set `delegate_authority`), then calls `payout` to the verified address. Status → `Paid`.
- If deadline passes without reaching target, status `Failed`; contributors call `refund` to withdraw exactly their deposits.
### Authorization and metadata integrity
- `set_merchant_hash` authority: creator, top contributor, or `delegate_authority` set via `set_delegate_authority`.
- `submit_metadata` now accepts `https://`, `ipfs://`, or `ar://` and requires non-zero `metadata_hash` stored on-chain as a commitment.

### Keeper robustness
- Circuit breaker state is per operation/campaign, not global.
- Enforces `PROGRAM_ID` to match IDL `metadata.address`.
- Health check uses `getLatestBlockhash` with timeout.
- Metadata fetch uses timeout, size limit, and basic schema validation.

### CLI: Set delegate authority (via keeper)
Use the keeper `.env` file for secrets (do not export secrets in your shell):
```bash
cd scripts/keeper
pnpm start -- set-delegate <campaignPubkey> <delegatePubkey>
```

See details in `docs/ARCHITECTURE.md` and `docs/CONTRACT.md`.


