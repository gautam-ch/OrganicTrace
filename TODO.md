# OrganiTrace TODO and Status

Updated: 2025-11-04

This document tracks what’s completed and what remains, especially wiring the smart contracts into the backend and UI.

## ✅ Completed

- Smart contracts implemented and unit-tested
  - CertificationRegistry.sol
    - Roles: `admin` can add/remove certifiers; approved `certifiers` can grant/revoke.
    - Functions:
      - `addCertifier(address)` / `removeCertifier(address)` (admin)
      - `grantCertification(address farmer, uint256 expiry, string body)` (certifier)
      - `revokeCertification(address farmer)` (certifier)
      - `verify(address farmer) -> bool`
      - `getCertification(address farmer) -> (certified, expiryDate, certificationBody, grantedAt)`
    - Events: `CertifierAdded`, `CertifierRemoved`, `CertificationGranted`, `CertificationRevoked`.
  - ProductTracker.sol
    - Depends on CertificationRegistry; only certified farmers can create products.
    - Data: `Product { productId, farmer, currentOwner, productName, parentProductId, historyLog[], createdAt }`.
    - Functions:
      - `createProduct(string name, uint256 parentId, string details) -> uint256` (only certified)
      - `transferProduct(uint256 productId, address newOwner, string action, string details)` (only current owner)
      - Reads: `getProduct(uint256)`, `getHistoryLength(uint256)`, `getHistoryEntry(uint256,index)`, `getFarmerProducts(address)`
    - Events: `ProductCreated`, `ProductTransferred`.
  - Tests under `test/` cover creation, transfer, history, verification, and revocation.
- Hardhat project configured
  - `hardhat.config.js` with networks (hardhat, localhost, sepolia) and Etherscan verify.
  - Deploy script `scripts/deploy.ts` deploys both contracts and prints addresses (with NEXT_PUBLIC hints) plus optional verify on Sepolia.
  - NPM scripts: compile, node, test, deploy local/sepolia.
- Next.js app UI and Supabase backend flows (non-chain) implemented
  - Auth, dashboards, product create form (`/dashboard/create-product`) writes to Supabase.
  - Certification add form (`/dashboard/add-certification`) writes to Supabase (not on-chain).
  - Consumer-facing product search (`/product`) and detail page (`/product/[id]`) currently read from Supabase.
- Initial blockchain read wiring (server-side)
  - `lib/blockchain.ts` provides read-only provider and helpers:
    - `verifyCertification(address)` and `getCertificationDetails(address)` from CertificationRegistry.
    - `getProductDetails(productId)` from ProductTracker.
  - API route `/api/product/[id]` fetches a product from the blockchain and includes certification verification in response.

## ❗ Gaps / To Wire Next

1) Environment configuration
- [ ] Add `.env.local` with:
  - `ETHEREUM_RPC_URL=` (e.g., Sepolia/Polygon RPC)
  - `CERT_REGISTRY_ADDRESS=` (from deploy)
  - `PRODUCT_TRACKER_ADDRESS=` (from deploy)
  - For client-side usage, optionally duplicate as `NEXT_PUBLIC_*` if needed.
- [ ] Document these in `README.md` and ensure Next exposes only what’s safe client-side.

2) Complete blockchain integration (writes)
- `lib/blockchain.ts`
  - [ ] Add write ABIs for:
    - `createProduct(string,uint256,string)`
    - `transferProduct(uint256,address,string,string)`
    - `addCertifier(address)`, `removeCertifier(address)` (admin)
    - `grantCertification(address,uint256,string)`, `revokeCertification(address)` (certifier)
  - [ ] Expose a signer-enabled contract factory. Options:
    - Server-based signer from `WALLET_PRIVATE_KEY` (custodial; easier for automation/admin flows).
    - Client-side signer via browser wallet (non-custodial; recommended for user-initiated actions like transfers, certifier grants).
  - [ ] Decide per action who signs:
    - Farmer creates product (farmer wallet).
    - Owner transfers product (current owner wallet).
    - Certifier grants/revokes (certifier wallet).
    - Admin adds/removes certifier (admin wallet).

3) API routes to bridge app ↔ blockchain
- Products
  - [ ] POST `/api/blockchain/products` → calls `createProduct` on ProductTracker. Body: `{ name, parentId?, details }`.
  - [ ] POST `/api/blockchain/products/:id/transfer` → calls `transferProduct`. Body: `{ to, action, details }`.
  - [ ] On success, persist tx hash, on-chain `productId`, and minimal metadata in Supabase for indexing/caching.
- Certifications
  - [ ] POST `/api/blockchain/certifications/grant` (certifier-only) → `grantCertification`.
  - [ ] POST `/api/blockchain/certifications/revoke` (certifier-only) → `revokeCertification`.
  - [ ] Admin endpoints for `/api/blockchain/certifiers/add|remove`.
  - [ ] Migrate `/api/certifications/verify` to rely on on-chain `verify(address)` (or add new route and deprecate old DB-based verify).

4) UI wiring and flows
- Product creation / transfer
  - [ ] Update `/dashboard/create-product` to trigger on-chain `createProduct` (client wallet or server API), then store linkage in Supabase: `{ product_id_onchain, tx_hash, ... }`.
  - [ ] Add UI to transfer a product (owner signs) → on-chain `transferProduct`, then append movement in Supabase with tx hash.
- Consumer product detail
  - [ ] Update `/product/[id]` to fetch from blockchain route (`/api/product/[id]`) instead of DB route (`/api/products/[id]`), or merge both: chain data for custody + DB data for descriptive fields.
  - [ ] Show certification status from on-chain registry with expiry countdown.
- Certifications
  - [ ] Add a certifier dashboard page to grant/revoke certifications (wallet-signing UI).
  - [ ] Add admin-only page to manage certifiers.

5) Data model alignment
- [ ] Decide source of truth for product identity:
  - Use on-chain `productId` as canonical ID. Supabase keeps auxiliary metadata referencing `productId`.
- [ ] Migrations/fields:
  - `products.product_id_onchain` (unique), `last_tx_hash`, `current_owner_address`.
  - `product_movements.tx_hash`, `actor_address`.
- [ ] Backfill strategy for any existing DB-only products (optional or mark as legacy/demo).

6) QR codes and deep links
- [ ] Generate QR codes that embed `/product/{productId}` (on-chain id).
- [ ] Optionally include a signature/shortlink if needed.

7) Indexing/caching and UX
- [ ] (Optional) Add a lightweight indexer to listen to `ProductCreated`/`ProductTransferred` events and sync Supabase for fast reads.
- [ ] Loading states reflect pending on-chain confirmations; display tx links to block explorer.

8) Networks and deployment
- [ ] Confirm target: Sepolia or Polygon Amoy/Mainnet.
- [ ] Update deploy script notes for chosen network and funding steps.
- [ ] Add basic runbook to `README.md` for local Hardhat node and Sepolia/Polygon deployment.

9) Security and roles
- [ ] Enforce role checks in API (if using server signer) and UI gating (if client signer).
- [ ] Avoid storing privileged private keys in the server when possible; prefer non-custodial flows for users and certifiers.

## 🧪 Validation / Quality Gates

- Build/lint/tests (current state):
  - Contracts: tests PASS locally via Hardhat.
  - Next.js app: build not yet validated against env vars for contracts.
  - Lint/Typecheck: not run as part of this review.
- Next steps:
  - [ ] Run `hardhat test` and note PASS/FAIL in this doc.
  - [ ] Run Next build with `.env.local` set and fix any type/runtime issues.

## 📎 Notes and Assumptions

- Current UI uses Supabase routes (`/api/products/:id`) for product details. There is also a blockchain route (`/api/product/:id`) that isn’t used by the product page yet—switch or combine sources.
- `lib/blockchain.ts` is read-only. It must be extended for transactions (with signer) to fully wire writes.
- Deploy script prints both server and `NEXT_PUBLIC_*` address hints; ensure consistency with how `lib/blockchain.ts` reads envs.
