# Vaultara — subgraph

Indexes `DriveRegistry` events on Base Sepolia into `File`, `Grant`, and a chronological `AccessEvent` feed that powers the live Access Log.

## Deploy to Subgraph Studio
1. Create a subgraph named `decentral-drive` (network: Base Sepolia) at https://thegraph.com/studio
2. Authenticate with your **deploy key** (never commit it):
   ```bash
   npm install
   npx graph auth <DEPLOY_KEY>
   ```
3. Generate types + build + deploy:
   ```bash
   npm run codegen
   npm run build
   npm run deploy        # prompts for a version label, e.g. v0.0.1
   ```
4. Copy the **Query URL** it prints into `packages/nextjs/.env.local` as `NEXT_PUBLIC_SUBGRAPH_URL`.

Contract: `0xA554d0700a02F1F6186bE1B3ed97D530CE454fb5` · start block `46728984`.
