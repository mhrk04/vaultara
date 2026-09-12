# Design — DecentralDrive

Privacy-first decentralized Drive. Files are encrypted client-side (AES-GCM via WebCrypto), ciphertext is stored on IPFS, and **file ownership + revocable, ENS-addressed access grants live onchain**. A live access log is indexed by The Graph. Privy provides an embedded wallet so non-crypto users avoid seed phrases.

## Onchain vs Offchain (ethskills litmus test)

| Concern | Location | Why |
|---|---|---|
| File ownership (owner of a CID) | **Onchain** | trustless ownership |
| Access grants (who can access which file) | **Onchain** | permanent, revocable, auditable commitment |
| Grant/revoke events | **Onchain** (events) → indexed offchain | activity feed = offchain indexing of onchain events |
| Encrypted file blob | **Offchain (IPFS)** | Solidity is not a database; blobs are content-addressed |
| Wrapped decryption key for a recipient | **Offchain (IPFS/metadata)**, referenced onchain | small ciphertext, keyed to recipient pubkey |
| File names, sizes, MIME, search, sorting | **Offchain (client + subgraph)** | UI concerns, not value transfer |
| Wallet / identity | **Privy embedded wallet + EOA** | UX |
| ENS name → address resolution | **Offchain read of ENS (mainnet/Sepolia)** | display + input resolution |

**Contract count: 1** (`DriveRegistry.sol`). Within ethskills' "1–2 for MVP" guidance. No factory, no proxy (immutability is a feature here), no admin key controlling user files.

## CROPS Gate

- **Censorship Resistance:** Files are content-addressed on IPFS and encrypted client-side; the contract has no admin who can seize or block a user's files. Compromise: IPFS *availability* depends on pinning (we use a pinning service for the demo) — escape path: any user can pin their own CID / run a node, and the CID is recorded onchain so the ciphertext is portable across gateways.
- **Open Source & Free:** Full stack is open-source (MIT), self-hostable; no proprietary lock-in. Privy is a third-party SDK (compromise) — escape path: a plain "connect wallet" (injected/MetaMask) fallback so the app works without Privy.
- **Privacy:** Plaintext never leaves the browser; storage provider sees only ciphertext. Compromise: *grant relationships are public onchain* (who shared with whom is visible) — this is intentional (auditability is the feature) and disclosed honestly in the demo. File names are kept client-side/off the public log to limit metadata leakage.
- **Security:** No pooled funds; the contract holds no value, only ownership + grant records → small attack surface. Owner-only mutations enforced by `msg.sender == file.owner`. Chosen default: user's EOA fully controls their files; no emergency admin.

## Chain Selection

**Base Sepolia** (testnet). Rationale: Base's superpower is consumer onboarding + smart wallets + Coinbase distribution, which matches a consumer-facing Drive with Privy embedded wallets; L2 has no public-mempool reordering; fast, cheap, easy faucet for a 1-day demo. Testnet because it's a hackathon MVP holding no real value.

## Contract: `DriveRegistry.sol`

Solidity ^0.8.24. OpenZeppelin only where it earns its place (we don't need Ownable — ownership is per-file, not per-contract). No token, no value held.

### Data model
```
struct FileMeta {
    address owner;        // who registered it
    string  cid;          // IPFS CID of the encrypted blob
    string  name;         // display name (kept short; not sensitive-by-policy)
    uint256 size;         // bytes (plaintext size, for UI)
    uint64  createdAt;    // block timestamp
    bool    exists;       // for delete tombstoning
}
mapping(uint256 => FileMeta) files;      // fileId => meta
uint256 nextFileId;                       // incrementing id

// grant: fileId => grantee => wrapped-key-CID ("" means no grant / revoked)
mapping(uint256 => mapping(address => string)) grants;
```

### Functions & State-Transition Audit
| Function | Who calls / why | If nobody calls | Access control |
|---|---|---|---|
| `registerFile(cid,name,size)` → fileId | owner, after encrypting+uploading | file simply isn't registered | anyone (becomes owner) |
| `grantAccess(fileId, grantee, wrappedKeyCid)` | owner, to share | no share happens | `msg.sender == owner`, `exists`, non-zero grantee |
| `revokeAccess(fileId, grantee)` | owner, to un-share | grant persists | `msg.sender == owner` |
| `deleteFile(fileId)` | owner, to remove | file persists | `msg.sender == owner` |
| `getFile(fileId)` view | UI/read | — | public view |
| `getWrappedKey(fileId, grantee)` view | recipient, to decrypt | — | public view (ciphertext only) |
| `getOwnerFiles(owner)` view | UI list | — | public view (via events preferred) |

### Events (indexer-first design — The Graph consumes these)
```
event FileRegistered(uint256 indexed fileId, address indexed owner, string cid, string name, uint256 size, uint64 createdAt);
event AccessGranted (uint256 indexed fileId, address indexed owner, address indexed grantee, string wrappedKeyCid, uint64 at);
event AccessRevoked (uint256 indexed fileId, address indexed owner, address indexed grantee, uint64 at);
event FileDeleted   (uint256 indexed fileId, address indexed owner, uint64 at);
```

### Security notes (from ethskills security checklist, applied)
- No funds held → no reentrancy surface on value; still follow CEI and validate inputs.
- Input validation: reject `grantee == address(0)`, reject grant/revoke/delete on non-existent or non-owned files.
- No token math → decimals/precision/oracle items N/A.
- No proxy/upgrade → storage-layout & init items N/A.
- No delegatecall, no signatures onchain (envelope keys handled client-side) → those items N/A.
- Every state change emits an event (required for The Graph + UI).
- Verify source on Basescan after deploy.

## Crypto model (Approach A — envelope encryption, self-contained)
1. Per file: generate random AES-GCM 256 key `K` + IV in browser (WebCrypto).
2. Encrypt file bytes with `K` → ciphertext → upload to IPFS → get `CID`.
3. Owner keeps `K` wrapped to their own key (derived from wallet signature) so they can re-open later.
4. **Share:** owner wraps `K` to the recipient's public key (X25519/ECIES via a small audited lib, or RSA-OAEP with a published recipient key) → upload wrapped key to IPFS → `wrappedKeyCid` → `grantAccess(fileId, grantee, wrappedKeyCid)`.
5. **Recipient decrypt:** read `wrappedKeyCid` from chain → fetch wrapped key from IPFS → unwrap with their private key → AES-decrypt the blob.
6. **Revoke:** `revokeAccess` clears the onchain grant; UI/subgraph stops serving the wrapped-key pointer. Honestly framed as access-layer revocation (a party who already downloaded+decrypted before revoke retains that copy — same as any real sharing system).

_Recipient public-key bootstrapping for the MVP:_ on first login a user publishes an encryption public key (stored via a small onchain field or a known IPFS record keyed by address). If time-constrained, MVP falls back to a demo mode where sharing between two known local keys is shown end-to-end.

## Frontend
- **Scaffold-ETH 2** (Next.js App Router + Foundry + wagmi/viem + RainbowKit) as the starter (public boilerplate — allowed). Privy layered for embedded-wallet onboarding, with injected-wallet fallback.
- Tailwind design system (no inline styles). Dark, dense, product-grade. Component set: Button (with per-action loader/disabled), Input, AddressInput (ENS-aware), Dialog (share), Toast, FileCard, EmptyState, Skeleton, AccessLog.
- Three-button onchain discipline: Switch Network → (no approval needed, no tokens) → Execute; each button its own loading state.
- Every feature has 5 states: happy, empty, loading, error, responsive.

## The Graph
- Subgraph indexes the 4 events → entities: `File`, `Grant`, `AccessEvent`. Powers "My Files", "Shared with me", and the **live Access Log** (headline). Consumes live data from Subgraph Studio (not mocked) per The Graph track rules.

## ENS
- Share dialog accepts `alice.eth`; resolve to address via ENS (public resolver). Display grantee as ENS name when reverse-resolvable, else truncated address. Store the resolved address onchain (grants are by address).

## Privy
- Embedded wallet for email/social login → self-custodial wallet, no seed phrase. Signs Base Sepolia txns. Fallback: injected wallet.

## Out of scope (video "future work")
Lit threshold decryption, Filecoin storage deals, ENSv2 subname-as-ACL, agent x402 pay-per-file, mobile-native, multi-file folders.
