# Market Research — DecentralDrive

_Content below is rephrased/summarized from live web sources for licensing compliance._

## Research Sources (live searches, Sept 12 2026)
1. GitHub: `EmanHerawy/web3Drive` — client-side encryption + IPFS + 3box identity Drive. https://github.com/EmanHerawy/web3Drive
2. ETHGlobal Showcase: "ETH Drive" — prior hackathon Web3 Google-Drive analog. https://ethglobal.com/showcase/eth-drive-sbid1
3. Pinata blog: encrypt/decrypt files on IPFS using Lit Protocol + Pinata. https://pinata.cloud/blog/how-to-encrypt-and-decrypt-files-on-ipfs-using-lit-protocol-and-pinata/
4. Springer 2025: blockchain framework for secure data sharing/access control with IPFS + ECC (AES-local → IPFS → metadata onchain). https://link.springer.com/10.1007/s10586-025-05703-4
5. Lit Protocol docs: decentralized access control (onchain conditions gate decryption). https://developer.litprotocol.com/lit-actions/migration/encryption
6. Chainstack: comparison of decentralized storage tools (IPFS, Filecoin, Arweave, Pinata, Lighthouse). https://chainstack.com/learn/compare/decentralized-storage-tools-web3-apps/
7. Devpost: "IPDrive" — IPFS Google Drive analog. https://devpost.com/software/ipdrive

## Reference Products
- **ETH Drive / web3Drive / IPDrive** — encrypted-file Drives on IPFS with onchain metadata. The base pattern is well-trodden.
- **Lit Protocol + Pinata** — productized encrypt→IPFS→onchain-access-conditions flow.
- **Google Drive / Dropbox** — the UX quality bar users expect (grid/list, drag-drop, share dialog, activity feed).

## What's Good / What's Bad
- ETH Drive / web3Drive (good): prove the hybrid architecture works; simple mental model. (bad): sharing is often re-encrypt-to-recipient with no *revocable, auditable* onchain grant; little activity/history UI; wallet UX assumes MetaMask + seed phrase.
- Lit + Pinata (good): strong key-layer access control. (bad): external network dependency; heavier to integrate; overkill for a 1-day MVP.
- Academic frameworks (good): validate the pattern. (bad): no polished consumer UX; not demoable products.

## Table Stakes Features (sourced — appears across ≥3 references)
1. Client-side encryption before upload (files unreadable by storage provider).
2. Decentralized storage of ciphertext (IPFS/Filecoin), content-addressed (CID).
3. Onchain metadata/registry of files owned by an address.
4. Share a file with another party.
5. Wallet-based auth/identity.
6. File list with names, sizes, timestamps.
7. Download + decrypt in browser.
8. Delete / unpin file.

## Professional UX Patterns
- Drive-style file grid + list toggle; file-type icons; human file sizes (KB/MB); relative timestamps ("2 min ago").
- Share dialog: enter recipient (address or `alice.eth`), see current shares, revoke inline.
- Every async action (encrypt, upload, tx confirm, decrypt) has its own loader + disabled button state (ethskills frontend-ux rule: no shared isLoading).
- Empty state ("No files yet — upload your first encrypted file"), loading skeletons, error toasts.
- Address display via truncation `0x1234…abcd`; ENS name shown when it resolves.

## Design Reference
- Dark, dense, product-grade (Linear/Vercel aesthetic). Tailwind + a small component set.
- Palette: neutral zinc/slate background, single indigo/violet accent, green=granted, red=revoked.
- Type scale: 12/14/16/20/24. 4px spacing grid. Rounded-lg cards, subtle borders not heavy shadows.

## Keyboard Shortcuts (nice-to-have)
- `u` upload, `/` focus search, `esc` close dialog. (Skip if time-constrained.)

## Common Complaints (become quality requirements)
- "Web3 drives feel like tech demos, not products" → we invest in real 5-state UI.
- "Can't tell who has access / no history" → **our headline: live Graph-indexed access log**.
- "Seed phrase scares normal users" → **Privy embedded wallet**.
- "Sharing to 0x addresses is inhuman" → **ENS-name sharing**.

## Our Target
**Must-have (MVP spine):** wallet connect (Privy) · client-side AES-GCM encrypt · upload ciphertext to IPFS · register file onchain (Base Sepolia) · file list (decrypt+download) · share to address/ENS via onchain envelope-key grant · revoke grant onchain · live access log from The Graph subgraph · full 5-state UI.
**Nice-to-have:** search, keyboard shortcuts, file previews, grid/list toggle.
**Explicitly skip (state in video as future work):** Lit threshold decryption, Filecoin storage deals, ENSv2 subname-as-ACL, agent x402 access, mobile-native.
**Quality bar:** matches Google Drive's *interaction* polish for the core flows; no inline styles; every feature has empty/loading/error/responsive states; onchain buttons follow switch→approve→execute discipline.

## Originality Hook (defensible answer to "how is this different from 10 other IPFS drives?")
Every access grant is a **first-class, revocable, publicly-auditable onchain event addressed to a human-readable ENS name**, surfaced as a **live access log indexed by The Graph**. Prior Drives share by silent re-encryption with no auditable, revocable onchain trail.
