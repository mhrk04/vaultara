# DecentralDrive — Foundry package

Onchain registry for DecentralDrive. Holds no funds; records file ownership + revocable, ENS-addressed access grants. Every state change emits an event for The Graph.

## Setup
```bash
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-git
forge build
forge test -vvv
```

## Contracts
- `src/DriveRegistry.sol` — file registry + grant/revoke/delete, 4 events, per-file ownership.

## Deploy
```bash
# local anvil
anvil                       # in another terminal
forge script script/DeployDriveRegistry.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Base Sepolia (needs PRIVATE_KEY, BASE_SEPOLIA_RPC_URL, BASESCAN_API_KEY in env)
forge script script/DeployDriveRegistry.s.sol --rpc-url base_sepolia --broadcast --verify
```

## Tests
14 tests (register/grant/revoke/delete, ownership reverts, zero-address, missing/deleted file, event emission, owner enumeration, fuzz owner-only). Maps to acceptance criteria AC 1–7.
