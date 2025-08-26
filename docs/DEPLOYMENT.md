## Deployment & Development

### Prereqs
- Rust, Solana CLI, Anchor CLI
- Node 18+, pnpm (or npm/yarn), Playwright dependencies (for keeper automation)

### Localnet
1. `solana-test-validator` (in a separate terminal)
2. `anchor build`
3. `anchor deploy`
4. `pnpm -w install`
5. `pnpm -w dev` to start web at `http://localhost:3000`

### Devnet
1. Set provider in `Anchor.toml` to devnet; fund `~/.config/solana/id.json`
2. `anchor build && anchor deploy`
3. Update web `.env.local` using the `apps/web/.env.example` template (no secrets committed)
4. Ensure the IDL `metadata.address` matches your deployed `PROGRAM_ID`.

### Mainnet
1. Replace program ID in `Anchor.toml` under `[programs.mainnet]`
2. Set environment variables via `.env` files or CI secrets (do not commit real values):
   - `SOLANA_CLUSTER=mainnet`
   - `PROGRAM_ID=<your_mainnet_program_id>`
   - `NEXT_PUBLIC_PROGRAM_ID=<your_mainnet_program_id>`
   - `KEEPER_RPC_URL=https://api.mainnet-beta.solana.com`
   - `USE_MOCK_DEX=false`
   - `METADATA_MAX_BYTES=102400` (optional)
   - `METADATA_FETCH_TIMEOUT=5000` (optional)
3. Build and deploy:
   - `anchor build`
   - `node scripts/deploy-program.js`
4. Update web `.env.local` from `apps/web/.env.example` and set:
   - `NEXT_PUBLIC_RPC_URL=<your_mainnet_rpc_url>`
   - `NEXT_PUBLIC_PROGRAM_ID=<your_mainnet_program_id>`

### Keeper
- Copy `.env.example` → `.env` and set `KEEPER_PRIVATE_KEY` (JSON array), `KEEPER_RPC_URL`. Keep secrets out of git and prefer CI secrets.
- `cd scripts/keeper && pnpm install && pnpm start`
- Extend `src/index.js` to:
  - Poll for `Succeeded` campaigns without `Paid`
  - Open checkout on DEX Screener, capture merchant destination
  - Compute `merchant_hash` and call `set_merchant_hash`
  - Call `payout` with amount and merchant ATA
  - Health checks use `getLatestBlockhash` with timeout; program id must match IDL `metadata.address`.


