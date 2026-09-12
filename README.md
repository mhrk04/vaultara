# Vaultara

**Privacy-first decentralized Drive.** Files are encrypted in your browser (the storage provider literally can't read them), the ciphertext lives on IPFS, and every share is a **revocable, auditable, ENS-addressed access grant recorded onchain** — surfaced as a **live access log indexed by The Graph**.

Built for ETHOnline 2026.

> ⚠️ Hackathon / reference implementation. Deployed to Base Sepolia (testnet). All code is sample-grade and needs a security review before any production use.

## Why it's different from "another IPFS drive"

Most encrypted-drive demos share by silently re-encrypting to a recipient, with no auditable trail. Vaultara makes **onchain, revocable sharing the headline**: every grant and revoke is a first-class onchain event, addressed to a human-readable ENS name, and rendered as a two-sided live access log (owner sees "granted to alice.eth", recipient sees "shared with you").

## Architecture

```
Browser (encrypt AES-GCM) ──► IPFS/Pinata (ciphertext only)
        │                              ▲
        │ CID + ownership + grants     │ fetch ciphertext
        ▼                              │
  DriveRegistry.sol (Base Sepolia) ──► The Graph subgraph ──► Live access log
        ▲                                                      (UI)
        │ grant/revoke to ENS name
   Privy embedded wallet (email login, no seed phrase)
```

- **Onchain (Solidity):** file ownership + revocable access grants + events. One contract, no funds held. `packages/foundry/src/DriveRegistry.sol`.
- **Offchain:** encrypted blobs on IPFS; UI, search, key-wrapping in the browser.
- **Crypto:** AES-GCM per-file keys (WebCrypto); sharing via ECIES envelope (secp256k1 + `@noble`), key derived deterministically from a wallet signature.

## Partner integrations
- **The Graph** — subgraph indexes contract events into a live access log (consumes live Studio data, not mocked). `packages/subgraph/`
- **ENS** — share to `alice.eth`; grantees reverse-resolve to names.
- **Privy** — email/social embedded wallet, no seed phrase (injected-wallet fallback).

## Deployed
- **DriveRegistry (Base Sepolia):** [`0xA554d0700a02F1F6186bE1B3ed97D530CE454fb5`](https://sepolia.basescan.org/address/0xa554d0700a02f1f6186be1b3ed97d530ce454fb5) (verified)
- **Subgraph:** `https://api.studio.thegraph.com/query/1760145/decentral-drive/0.98.1`

## Run locally

```bash
# 1. Contracts (Foundry)
cd packages/foundry
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-git
forge test          # 14 tests

# 2. Frontend
cd ../nextjs
cp .env.example .env.local     # fill in per SETUP-KEYS.md
npm install
npm test            # 8 crypto/share tests
npm run dev         # http://localhost:3000
```

Keys required (see `SETUP-KEYS.md`): Pinata JWT, Privy app ID, Base Sepolia RPC + funded wallet, The Graph subgraph URL. `.env*` files are gitignored.

## Demo flow
1. Log in (Privy email, or connect a Base Sepolia wallet). Sharing auto-enables (one signature).
2. Upload a file → encrypted in-browser → pinned to IPFS → registered onchain.
3. Share to an ENS name / address → onchain grant → appears in the live access log.
4. Recipient sees it under "Shared with me" → opens & decrypts.
5. Revoke → recipient loses future access; the revoke shows in both parties' logs.

## Honest limitations (future work)
- **Revocation is access-layer:** a recipient who already downloaded a file keeps that copy (true of any sharing system). Key-layer revocation (e.g. Lit Protocol threshold decryption) is future work.
- **Owner key record is per-device** (localStorage): opening your own files on a new device needs the record synced. Moving it fully onto IPFS is future work.
- Testnet only; not audited.

## Spec-driven development
Built with the SpecShip workflow. All planning artifacts (market research, design, sprint contract, tasks) are in `.specship/specs/001-decentral-drive/` for transparency, per ETHGlobal's AI-tooling rules.

## License
MIT
