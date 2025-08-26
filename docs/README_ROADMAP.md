## Roadmap

### v0 (MVP)
- Anchor program: init, contribute, submit_metadata, finalize, refund, set_merchant_hash, payout
- Web: connect wallet, create campaign, contribute, show timer/goal, finalize, refund button, metadata form + IPFS upload
- Keeper: CLI skeleton to monitor and propose payout

### v0.1
- Highest-donor rights with timeout + fallback to next highest
- Overfunding handling (auto-refund excess or community treasury)
- Optional SOL acceptance + Jupiter swap to USDC before payout

### v1
- Multicampaign per creator (separate seeds)
- Snapshot vote option (weighted by contribution) to select metadata
- Keeper Playwright flow to auto-complete DEX Screener checkout


