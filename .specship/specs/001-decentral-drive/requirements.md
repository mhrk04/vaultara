# Sprint Contract — DecentralDrive

## Scope
**IN:** 1 Solidity contract (`DriveRegistry`) on Base Sepolia; client-side AES-GCM encryption; IPFS upload of ciphertext; register/list/download files; envelope-key sharing to an address or ENS name via onchain grant; onchain revoke; delete; The Graph subgraph powering a live access log; Privy embedded-wallet login with injected fallback; full 5-state product UI; Foundry tests; deploy + verify; demo-ready.

**OUT:** Lit threshold decryption; Filecoin deals; ENSv2 subname ACLs; agent/x402 access; mobile-native; folders; real mainnet value.

## Acceptance Criteria

### Contract
1. When an owner calls `registerFile(cid,name,size)`, then a `FileRegistered` event is emitted with a new incrementing `fileId` and the caller as owner.
2. When a non-owner calls `grantAccess`/`revokeAccess`/`deleteFile` on a file, then the tx reverts with an ownership error.
3. When an owner calls `grantAccess(fileId, grantee, wrappedKeyCid)` with a non-zero grantee on an existing file, then the wrapped key is stored and `AccessGranted` is emitted.
4. When `grantAccess` is called with `grantee == address(0)` or on a non-existent/deleted file, then it reverts.
5. When an owner calls `revokeAccess(fileId, grantee)`, then the stored wrapped key is cleared and `AccessRevoked` is emitted.
6. When an owner calls `deleteFile(fileId)`, then `exists` becomes false and `FileDeleted` is emitted; subsequent grants on it revert.
7. Every state-changing function emits its event; all view functions return correct data.

### Crypto / Storage
8. When a user uploads a file, then encryption happens in the browser and only ciphertext bytes are sent to IPFS (verifiable: the uploaded blob does not equal the plaintext; decrypting the blob with the file key reproduces the original bytes).
9. When a recipient with a valid grant opens a shared file, then they can fetch the wrapped key, unwrap it, and decrypt the blob back to the original file.
10. When a grant is revoked, then the app no longer serves the wrapped-key pointer for that grantee (access-layer revocation).

### Frontend / UX
11. When a user visits with no files, then an empty state ("No files yet — upload your first encrypted file") is shown (not a blank page).
12. When any async action runs (encrypt, upload, tx submit, decrypt), then that specific control shows its own loading state and is disabled; no shared global spinner.
13. When an action fails (tx rejected, upload error, wrong network), then a clear error toast/message is shown and the UI recovers (no stuck spinner).
14. When a user is on the wrong network, then a "Switch to Base Sepolia" prompt is shown before contract actions.
15. When sharing, then the recipient input accepts either a `0x` address or an `alice.eth` name; an ENS name resolves to an address before the grant, and unresolvable input shows an inline error.
16. When a grantee is reverse-resolvable to an ENS name, then the UI displays the ENS name instead of the raw address.
17. All UI uses a Tailwind design system — no inline styles, no unstyled browser-default elements.
18. The layout is responsive: usable on a narrow (mobile-width) viewport and on desktop.
19. Every interactive element has hover/active/focus/disabled states.

### The Graph (headline)
20. When files are registered and grants are made/revoked onchain, then the subgraph indexes them and the app renders a **live Access Log** (chronological grant/revoke/register/delete events with actor + target + time) sourced from the subgraph (not mocked/local).

### Privy
21. When a new user logs in via Privy (email/social), then a self-custodial embedded wallet is created and can sign Base Sepolia transactions without a seed phrase; an injected-wallet fallback also works.

## Failure Modes (what a lazy impl gets wrong)
- Uploads plaintext to IPFS "to save time" and only pretends to encrypt → **AC-8 forbids**.
- Sharing that never actually records an onchain grant (just client state) → **AC-3/AC-20 forbid**.
- Revoke that only hides in the UI but never emits `AccessRevoked` → **AC-5 forbids**.
- Inline styles / browser-default forms / single global `isLoading` → **AC-12/AC-17 forbid**.
- Happy path only: no empty/loading/error/responsive states → **AC-11..19 forbid**.
- ENS input accepted but never resolved (grant made to the literal string) → **AC-15 forbids**.
- Access log faked from local array instead of the subgraph → **AC-20 forbids** (must consume live Graph data).
- Missing ownership checks so anyone can revoke others' grants → **AC-2 forbids**.
- Contract deployed but unverified on Basescan → ship checklist forbids.
- Single giant commit (ETHGlobal DQ risk) → per-milestone commits required.

## Design Spec
- **System:** Tailwind CSS design tokens; component library (Button, Input, AddressInput, Dialog, Toast, FileCard, EmptyState, Skeleton, AccessLog, NetworkGuard).
- **Palette:** zinc/slate neutrals; indigo/violet accent (`indigo-500`); green (`emerald-500`) = granted; red (`rose-500`) = revoked.
- **Type scale:** 12 / 14 / 16 / 20 / 24 px. 4px spacing grid.
- **Shape:** rounded-lg cards, 1px subtle borders, minimal shadow.
- **Icons:** lucide-react.
- **States:** every interactive element defines hover/active/focus/disabled; every feature defines happy/empty/loading/error/responsive.

## Table-Stakes → AC mapping (HARD GATE)
| Table stake | AC |
|---|---|
| Client-side encryption | 8 |
| Decentralized ciphertext storage (IPFS/CID) | 8, 9 |
| Onchain file registry | 1, 7 |
| Share a file | 3, 9, 15 |
| Wallet auth/identity | 21 |
| File list w/ name/size/time | 11, 20 |
| Download + decrypt | 9 |
| Delete / remove | 6 |
| (Originality) revocable, auditable, ENS-addressed onchain sharing + live log | 3,5,15,16,20 |

## Baseline commands (to be confirmed during build)
| Command | Purpose |
|---|---|
| `forge test` | contract tests |
| `forge build` | compile contracts |
| `yarn start` (SE2) | run frontend |
| `graph codegen && graph build` | subgraph build |
