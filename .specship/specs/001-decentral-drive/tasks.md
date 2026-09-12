# Implementation Plan — DecentralDrive

Build order = vertical slice (Option 1). Each milestone produces working, committable software and includes its own tests (HARD GATE). Milestones 1–3 need NO external keys; Milestone 4+ needs user-provided keys (Pinata/Privy/Subgraph/Base Sepolia).

---

## Milestone 1: Scaffold + Verify It Runs
Goal: a Foundry project that compiles + a Next.js app that renders (no blank page) + one passing test.
- Task 1.1: Initialize monorepo — `packages/foundry` (Foundry) + `packages/nextjs` (Next.js App Router + Tailwind). Root `package.json` workspaces.
- Task 1.2: Foundry config (`foundry.toml`), install OpenZeppelin + forge-std. One trivial passing test to prove the harness (RED→GREEN).
- Task 1.3: Next.js minimal landing page renders "DecentralDrive" with Tailwind styles applied. Verify it builds (`next build`).
- Task 1.4: Tailwind design tokens + base layout shell (dark theme, container). One component (Button) with hover/active/focus/disabled.
- Verify: `forge test` green, `next build` succeeds. Commit `[specship] milestone 1 complete: scaffold`.

## Milestone 2: DriveRegistry contract + full tests (AC 1–7)
Goal: the onchain core, fully tested. No external keys needed.
- Task 2.1: Write `DriveRegistry.t.sol` FIRST — tests for register, grant, revoke, delete, ownership reverts, zero-address revert, event emission (RED).
- Task 2.2: Implement `DriveRegistry.sol` — structs, mappings, 4 mutations + views, 4 events, input validation, CEI (GREEN).
- Task 2.3: Edge-case tests: non-existent file, deleted file re-grant, double revoke, non-owner calls. Fuzz where sensible.
- Task 2.4: `forge fmt`, run `forge test -vvv` all green; optional `slither` if available.
- Verify: all AC 1–7 tests pass. Commit `[specship] milestone 2 complete: DriveRegistry + tests`.

## Milestone 3: Encrypt → upload → register → list → decrypt (local chain) (AC 8–14, 17–19)
Goal: end-to-end vault flow against a LOCAL chain + a local/mock IPFS, so it works with zero external accounts.
- Task 3.1: Crypto lib (`lib/crypto.ts`) — AES-GCM encrypt/decrypt via WebCrypto; unit tests proving decrypt(encrypt(x)) == x and ciphertext != plaintext (AC-8).
- Task 3.2: Storage adapter (`lib/storage.ts`) with an interface + a **local/in-memory/dev IPFS** implementation now; real Pinata impl slots in at M4. Returns a CID-like id.
- Task 3.3: Deploy `DriveRegistry` to local Foundry chain; wire SE2 contract hooks.
- Task 3.4: Upload flow UI — pick file → encrypt (per-action loader) → upload → `registerFile` tx (switch-network guard, per-button loading, error toast). AC 12,13,14.
- Task 3.5: File list — read files for connected address; FileCard with name/size/relative-time; EmptyState; loading Skeleton. AC 11.
- Task 3.6: Download flow — fetch ciphertext → decrypt → save original file. AC 9 (owner path).
- Task 3.7: Responsive + interactive states pass (AC 18,19); no inline styles (AC 17).
- Verify: manual local run works end-to-end; crypto unit tests green. Commit `[specship] milestone 3 complete: local vault flow`.

## Milestone 4: Sharing, revoke, ENS, Privy, Subgraph (needs user keys) (AC 3,5,15,16,20,21)
Goal: the originality hook + partner integrations. Requires Pinata/Privy/Subgraph/Base Sepolia keys.
- Task 4.1: Real Pinata storage adapter (swap in for dev impl); env-configured JWT.
- Task 4.2: Recipient pubkey bootstrap + envelope-key wrap/unwrap; wrapped-key upload; recipient decrypt path (AC-9 recipient).
- Task 4.3: Share dialog — AddressInput accepts `alice.eth`, resolves via ENS before grant; unresolvable → inline error; `grantAccess` tx (AC-15). Display ENS name when reverse-resolvable (AC-16).
- Task 4.4: Revoke — `revokeAccess` tx; UI stops serving wrapped key (AC-5,10).
- Task 4.5: Deploy `DriveRegistry` to Base Sepolia + verify on Basescan.
- Task 4.6: The Graph subgraph — schema (File/Grant/AccessEvent), mappings for 4 events, deploy to Subgraph Studio; app renders live Access Log from it (AC-20).
- Task 4.7: Privy embedded wallet login + injected fallback (AC-21).
- Verify: full flow on Base Sepolia; access log live from subgraph. Commit per task.

## Milestone 5: Polish, QA, ship
- Task 5.1: Error boundaries, empty/error states audit across all features.
- Task 5.2: README (setup + run + demo creds) — ship-time only.
- Task 5.3: Validators (code/security/browser) + fix.
- Task 5.4: Push to a NEW branch, open PR (with explicit user confirmation). Record demo-video script.

---
### Notes
- Commit every milestone (no single giant commit — ETHGlobal DQ risk).
- Keep all `.specship/` artifacts in the repo (ETHGlobal spec-driven-dev rule).
- ethskills: no fabricated addresses; SafeERC20 N/A (no tokens); verify on explorer; fresh-context QA.
