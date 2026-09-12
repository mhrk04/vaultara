# 🔑 Gather Your Keys — DecentralDrive

You need 4 free accounts before **Milestone 4** (sharing, ENS, Privy, subgraph, Base Sepolia deploy). Milestones 1–3 need none of these, so grab them while M3 is being built.

> ⚠️ **Security:** every secret below goes into `packages/nextjs/.env.local` or `packages/foundry/.env` — both are gitignored. **Never commit a private key or JWT.** If you ever paste one into chat, rotate it afterward. Values are referenced by name in code, never hardcoded.

Create the env files now (they're gitignored):
```bash
cp packages/nextjs/.env.example packages/nextjs/.env.local   # after M3 creates the example
touch packages/foundry/.env
```

---

## 1. Pinata — IPFS pinning (encrypted blobs + wrapped keys)
**Why:** stores the client-side-encrypted ciphertext and wrapped decryption keys. We only ever upload ciphertext.

1. Go to https://pinata.cloud → **Sign up** (free tier is plenty).
2. Dashboard → **API Keys** → **New Key**.
3. Enable **Admin** (or at least `pinFileToIPFS` + `pinJSONToIPFS`), name it `decentral-drive`, **Create**.
4. Copy the **JWT** (long token). You won't see it again — save it now.
5. Also copy your **Gateway domain** (Dashboard → Gateways, e.g. `your-name.mypinata.cloud`).

Put in `packages/nextjs/.env.local`:
```
NEXT_PUBLIC_PINATA_GATEWAY=your-name.mypinata.cloud
PINATA_JWT=eyJ...        # server-side only, no NEXT_PUBLIC_ prefix
```

---

## 2. Privy — embedded wallet (email/social login, no seed phrase)
**Why:** lets non-crypto users log in with email and get a self-custodial wallet (AC-21).

1. Go to https://dashboard.privy.io → **Sign up**.
2. **Create app** → name it `DecentralDrive`.
3. Copy the **App ID** (looks like `clxxxx...` / `cmxxxx...`).
4. In app settings → **Login methods**: enable **Email** and **Wallet** (external).
5. Under **Domains/Allowed origins** add `http://localhost:3000`.

Put in `packages/nextjs/.env.local`:
```
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxx
```

---

## 3. Base Sepolia — testnet wallet + RPC (deploy the contract)
**Why:** deploy `DriveRegistry` to a public testnet so the subgraph + demo work (AC deploy/verify).

**A. A funded testnet wallet (use a THROWAWAY key — never your real funds):**
1. Create a fresh wallet (MetaMask → add account, or `cast wallet new`). Copy its **private key**.
2. Get free Base Sepolia ETH from a faucet:
   - https://www.alchemy.com/faucets/base-sepolia
   - or Coinbase Developer Platform faucet: https://portal.cdp.coinbase.com/products/faucet
   Paste the wallet address, request funds (~0.05 ETH is plenty).

**B. An RPC URL (pick one):**
- Public (works, rate-limited): `https://sepolia.base.org`
- Or Alchemy: https://dashboard.alchemy.com → create app on **Base Sepolia** → copy HTTPS URL.

**C. Basescan API key (to verify the contract):**
- https://basescan.org → sign up → **API Keys** → **Add** → copy key.

Put in `packages/foundry/.env`:
```
PRIVATE_KEY=0xYOUR_THROWAWAY_TESTNET_PRIVATE_KEY
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=YOUR_BASESCAN_KEY
```
And in `packages/nextjs/.env.local`:
```
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_DRIVE_REGISTRY_ADDRESS=      # filled in after we deploy in M4
```

---

## 4. The Graph — Subgraph Studio (live access log)
**Why:** indexes the contract's grant/revoke/register/delete events into the live Access Log — our originality headline (AC-20). Must consume live Graph data (not mocked).

1. Go to https://thegraph.com/studio → **Connect Wallet** (any wallet; this identifies your studio account).
2. **Create a Subgraph** → name it `decentral-drive` → select network **Base Sepolia**.
3. On the subgraph page copy:
   - the **Deploy Key** (top of the page), and
   - the **Subgraph Slug** (used in `graph deploy`).
4. We'll run `graph init` / `graph deploy` during M4 using these; the query URL it gives you goes into the frontend.

Put in `packages/nextjs/.env.local` (query URL filled after deploy):
```
NEXT_PUBLIC_SUBGRAPH_URL=      # e.g. https://api.studio.thegraph.com/query/xxxxx/decentral-drive/version/latest
```
Keep the **deploy key** out of the repo — you'll paste it into the `graph auth` prompt in the terminal.

---

## ✅ Checklist before Milestone 4
- [ ] `PINATA_JWT` + `NEXT_PUBLIC_PINATA_GATEWAY`
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID`
- [ ] `packages/foundry/.env`: `PRIVATE_KEY` (funded), `BASE_SEPOLIA_RPC_URL`, `BASESCAN_API_KEY`
- [ ] The Graph deploy key + subgraph slug (`decentral-drive`, Base Sepolia)
- [ ] Wallet funded with Base Sepolia ETH (check on https://sepolia.basescan.org)

Ping me once you have these and I'll wire them in.
