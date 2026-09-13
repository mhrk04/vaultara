# Deploying Vaultara

**Live demo:** https://vaultara-nextjs.vercel.app

Vaultara's frontend deploys to Vercel from this monorepo. The contract (Base Sepolia) and subgraph (The Graph Studio) are already deployed.

## Vercel setup

1. Import `mhrk04/vaultara` at https://vercel.com → Add New → Project.
2. **Set Root Directory to `packages/nextjs`** (the app lives in the monorepo subfolder).
3. Framework preset: Next.js (auto-detected).
4. Add the environment variables below.
5. Deploy. Vercel builds on their servers — no local disk needed.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables. **Never commit real values** — `.env*` files are gitignored. Only `PINATA_JWT` is a secret (server-side; no `NEXT_PUBLIC_` prefix, so it never reaches the browser).

| Variable | Public? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | public | `84532` (Base Sepolia) |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC` | public | Base Sepolia RPC URL |
| `NEXT_PUBLIC_DRIVE_REGISTRY_ADDRESS` | public | deployed `DriveRegistry` address |
| `NEXT_PUBLIC_PINATA_GATEWAY` | public | Pinata gateway domain |
| `PINATA_JWT` | **SECRET** | Pinata JWT — server-side only, used by `/api/ipfs` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | public | Privy app id |
| `NEXT_PUBLIC_SUBGRAPH_URL` | public | The Graph Studio query URL |
| `NEXT_PUBLIC_SEPOLIA_RPC` | public | Ethereum Sepolia RPC (ENS reads) |

See `packages/nextjs/.env.example` for the exact keys.

## Post-deploy: allow the Vercel domain in Privy

Privy rejects logins from unknown origins. In the Privy dashboard → your app → Settings → Domains / Allowed origins, add:

```
https://vaultara-nextjs.vercel.app
```

Without this, wallet login fails on the live site.

## Security posture (verified live)

The public deployment was checked against the running site:

- **HTTPS + security headers** — HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geo disabled). Applied site-wide via `next.config.mjs`.
- **`/api/ipfs` (upload proxy)** — same-origin enforced (cross-origin POST → 403), caller-address header required (missing → 401), per-address+IP rate limit (10/min), 10 MB size cap. Keeps `PINATA_JWT` server-side.
- **`/api/pubkey` (directory write)** — same-origin + per-IP rate limit.
- **No secrets in the client bundle** — scanned the live JS bundles; the Pinata JWT and other secrets are absent (only the intended `NEXT_PUBLIC_*` values appear).

### Known limitations (honest, non-blocking for a testnet demo)
- Rate limits are per-serverless-instance (in-memory) — a speed bump for casual abuse, not a distributed guarantee. A production build would use a shared store + a SIWE-verified session.
- Access revocation is access-layer, not key-layer (a recipient who already downloaded keeps their copy).
- Dependabot flags transitive CVEs in **dev/build tooling** (subgraph CLI, wallet SDK internals). These do not ship to or run on the live site.
- Testnet only; not audited. Rotate the Pinata JWT before any long-term use.
