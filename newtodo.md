# OrganicTrace Flexible Journey Plan

## Objective
- Remove hard-coded "Harvested"/"Processed" history entries in `ProductTracker`.
- Introduce a reusable `addHistoryEvent` function for product owners to record any lifecycle action, along with Pinata-hosted imagery (IPFS hashes).
- Preserve `transferProduct` and parent-child product linkage while keeping `createProduct` focused on passport creation only.

## Storage Strategy (Pinata)
1. Capture event media (images, certificates) and pin them to Pinata.
2. Store the returned IPFS hash in the `ipfsImageHash` field of each history entry.
3. Front-end clients resolve the hash via a public gateway (e.g., `https://gateway.pinata.cloud/ipfs/<hash>`).

## Execution Checkpoints

### Checkpoint 1 — Contract Restructure
- Update `HistoryEntry` to include `ipfsImageHash`.
- Strip event logging from `createProduct`; keep only passport data (IDs, owner, timestamps, parent linkage).
- Implement `addHistoryEvent(productId, action, details, ipfsImageHash)` with `require(msg.sender == currentOwner)`.
- Emit a dedicated event (if needed) for history additions to mirror off-chain listeners.
- ✅ **Verification:** Run `pnpm hardhat test --grep Product Creation` to ensure passport logic still passes.

### Checkpoint 2 — Ownership & Transfers
- Keep `transferProduct` intact but ensure it does **not** auto-log processing; instead, rely on `addHistoryEvent` after transfers.
- Update tests covering transfers to reflect the new history counts (no default creation entry).
- ✅ **Verification:** `pnpm hardhat test --grep "Product Transfer"`.

### Checkpoint 3 — Flexible History Flow
- Add Hardhat tests for:
  - Certified owner adding custom events (`Seeding`, `Watering`, etc.).
  - Reverts when non-owners call `addHistoryEvent`.
  - History entries include `ipfsImageHash` and preserve chronological order.
- ✅ **Verification:** `pnpm hardhat test --grep "History"`.

### Checkpoint 4 — Integration & Pinata Hooks
- Sync TypeChain artifacts & ABI consumers (`lib/contracts.ts`, front-end hooks) to expose the new function.
- Document front-end flow: after uploading media to Pinata, call `addHistoryEvent` with the resulting hash.
  - Farmer dashboard now includes a "Log Event" dialog per product that collects action, notes, and Pinata CID, then calls `addHistoryEvent` on-chain.
- ✅ **Verification:** Launch the Next.js app with `pnpm dev`, use a local Hardhat node (or `pnpm hardhat node`) to simulate the full journey.

## Notes
- Parent processors should call `createProduct(..., parentId)` and immediately follow with `addHistoryEvent` describing their transformation.
- Consider emitting a `HistoryEventAdded` event for better indexing.
- The new flow keeps passport creation deterministic while letting downstream actors record arbitrary steps securely.
