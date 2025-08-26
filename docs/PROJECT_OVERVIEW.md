## Dex.Cto — Project Overview

### Identity
- **Name**: Dex.Cto
- **Domain**: `dexcto.io`
- **Ticker**: `$Dex.CTO`

### Elevator pitch
Dex.Cto is a time-locked, trust-minimized crowdfund on Solana that lets a community pool funds to purchase DEX Screener’s Enhanced Token Info for new meme coins. If the goal isn’t reached within the deadline, contributors can withdraw their deposits in full.

Reference product: [DEX Screener Enhanced Token Info](https://marketplace.dexscreener.com/product/token-info)

### Problem
CTO communities frequently form around new meme coins without an active developer willing or able to front the listing costs and coordination effort for token info setup.

### Solution
Provide a transparent escrow vault and simple rules so anyone can contribute. When the target is met before the deadline, the system executes a guarded payout and completes the listing process using community-supplied metadata.

### Core mechanics
- **Asset**: USDC on Solana (to avoid volatility; SOL acceptance optional via swap)
- **Goal + deadline**: Target amount (e.g., $300) and a short time window (e.g., 2 hours)
- **Escrow**: Funds are held in a program-owned vault PDA
- **Success**: If goal is met before deadline → status Succeeded → keeper executes payout to DEX Screener
- **Failure**: If goal is not met by deadline → status Failed → contributors refund their deposits trustlessly
- **Metadata**: URI + hash stored on-chain; used to fill out token info (logo, links, text)

### Governance rule for metadata
- Default: **Highest contributor** can submit metadata; tie → earliest
- Fallback: If highest contributor fails to submit within a grace period, rights pass to the next highest
- Optional future mode: quick weighted vote by contribution

### What gets submitted
- Project logo
- Social links (Twitter/X, Telegram, Discord, website)
- Basic description and roadmap snippet
- Wallets holding locked supply (for accurate market cap)

### Payment execution (guarded)
- Keeper opens DEX Screener checkout, captures merchant destination and amount
- Computes `merchant_hash = keccak256(pay_mint || merchant_ata || amount_le)`
- Calls `set_merchant_hash` then `payout(amount)` on-chain
- Program releases funds only if the hash matches, minimizing trust

### User flows
1) Connect wallet → view campaign (target, timer)
2) Contribute USDC → see progress bar and your share
3) If goal is met → keeper executes payout; status becomes Paid
4) If deadline passes without success → Refund button appears; withdraw in full

### Success metrics
- Completion rate of campaigns before deadline
- Average time to goal
- Number of successful DEX Screener submissions completed without manual intervention

### Brand notes
- Visual identity: clean, bold, fun (memecoin energy), reassuring escrow visuals
- Copy tone: playful but clear about trust and refunds
- Primary CTA: “Fund the listing”

### Roadmap alignment
- MVP covers escrow, contributions, metadata rights, finalize, refund, payout guard via keeper
- v0.1 adds fallback rights, overfund handling, optional SOL → USDC swap
- v1 adds multi-campaign per creator, weighted voting, automated checkout flow


