# Security Policy

## Supported Versions

We support the latest main branch. Report vulnerabilities against `main`.

## Reporting a Vulnerability

- Please email security reports to security@dexcto.io (or open a private security advisory in GitHub).
- Include a detailed description, steps to reproduce, and potential impact.
- We aim to acknowledge within 72 hours and provide a remediation plan within 7 days.
- Please do not create public issues for security vulnerabilities.

## Scope

- Smart contract at `programs/cto_dex_escrow`
- Web app in `apps/web`
- Keeper scripts in `scripts/keeper`

## Out of Scope

- Third-party dependencies and services (e.g., RPC providers), except where misconfiguration in this repo is the root cause.

## Security Best Practices

- Never commit secrets. Use `.env.example` templates and store real values in CI/CD secrets or local untracked files.
- Rotate keys periodically and on role changes.
- Use least-privilege permissions for deployment keys and CI.
- Monitor `/api/health` and `/monitoring` dashboards for anomalies.

## Bounty

At this time we do not operate a formal bug bounty. High-impact findings may be eligible for recognition. Contact us to discuss prior to disclosure.
