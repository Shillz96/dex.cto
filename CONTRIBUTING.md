# Contributing

Thanks for your interest in contributing!

## Getting Started

- Read `README.md` and `docs/PROJECT_OVERVIEW.md`.
- Install toolchain and run the app:
  - `pnpm -w install`
  - `anchor build`
  - `pnpm -w dev`

## Environment

- Copy env templates:
  - `apps/web/.env.example` → `apps/web/.env.local`
  - `scripts/keeper/.env.example` → `scripts/keeper/.env`
- Do not commit real secrets.

## Coding Standards

- TypeScript/React on web, Rust/Anchor on program, Node for keeper.
- Follow existing formatting and linting. Prefer clear naming and early returns.
- Add tests where possible (Jest/Playwright, Rust tests).

## Pull Requests

- Create a feature branch from `main`.
- Include a clear description, screenshots for UI changes, and tests.
- Ensure `pnpm -w build` and tests pass locally.
- Link related issues.

## Commit Messages

- Use concise, imperative messages: "Fix payout guard validation".

## Code of Conduct

- Be respectful and inclusive.

## Security

- Do not include sensitive data in issues or PRs. Use private channels for security reports (see `SECURITY.md`).
