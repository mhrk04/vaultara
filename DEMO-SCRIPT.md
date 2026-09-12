# Demo Video Script — DecentralDrive (target 3:00, max 4:00)

Rules reminder: **your real voice** (no AI voiceover), **720p+**, no music-over-text, don't speed up. Two browser windows/profiles side by side = Account 1 (owner) and Account 2 (recipient). Pre-fund both with Base Sepolia ETH. Edit out tx-confirmation waits.

---

## 0:00–0:20 — Hook (keep it short)
> "This is DecentralDrive — a file drive where the storage provider literally can't read your files, and every share is a revocable, auditable grant recorded onchain. Files are encrypted in the browser, stored on IPFS, and access is controlled by a smart contract on Base."

Show the landing page.

## 0:20–0:50 — Login (Privy)
> "I log in with just an email — Privy gives me a self-custodial wallet, no seed phrase. Sharing auto-enables with one signature."

Show email login → wallet appears → the copy-address chip.

## 0:50–1:40 — Upload = encrypt + IPFS + onchain
> "I upload a file. It's encrypted in my browser with AES-GCM — watch: only ciphertext leaves the device. The ciphertext goes to IPFS, and the file's ownership is registered onchain."

- Drop a file. Point out the loaders (encrypt → upload → tx).
- Open the **Live access log** (right column): "This log is indexed by **The Graph** from the contract's onchain events — not mocked, live from a subgraph." Point at the "registered" entry.
- (Optional flex) open the tx on Basescan via the timestamp link.

## 1:40–2:40 — The headline: onchain ENS-addressed share + revoke
> "Now the interesting part. I share this file to an ENS name."

- Open Share dialog, type an `.eth` name (or Account 2's address), Share.
- Show the grant appear in **Current access** and in the **access log** ("granted access to …").
- Switch to **Account 2**: "From the recipient's side — it shows under *Shared with me*, and their access log says *shared with you*. Same event, both sides, provable onchain."
- Account 2 clicks **Open** → file decrypts and downloads. "It decrypts — the recipient could read it."

## 2:40–3:10 — Revoke (the differentiator)
> "And because access is onchain, I can revoke it."

- Account 1: Share dialog → **Revoke**. Show it hit the access log on both accounts.
- Account 2: refresh → file is gone from *Shared with me*.
- Be honest (judges respect it): "Revoke stops future access; anyone who already downloaded keeps their copy — same as any real system. Key-layer revocation is our next step."

## 3:10–3:40 — Wrap: stack + why it matters
> "Under the hood: a single Solidity contract on Base Sepolia for ownership and grants, client-side AES-GCM, IPFS via Pinata, ENS for human-readable sharing, The Graph for the live audit log, and Privy for onboarding. It's a Google Drive that Google can't read, with an access trail nobody can forge."

Show the architecture diagram (from README) on a slide (≤4 bullets).

## 3:40–end — Close
> "That's DecentralDrive. Encrypted, onchain, auditable. Thanks."

---

### Shot checklist
- [ ] Two accounts pre-funded on Base Sepolia
- [ ] A small demo file ready (e.g. a 1-page PDF or txt)
- [ ] Both browser windows arranged before recording
- [ ] `npm run dev` already running & warm (visit once first)
- [ ] Trim tx waits in edit
- [ ] Export 720p+, 2–4 min
```
