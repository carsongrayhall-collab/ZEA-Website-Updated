# Pai Sho game archive

`/pai-sho` is an owner-only dashboard. Its shell is public; every read and management action requires `PAISHO_ADMIN_KEY`. The key stays in tab memory and is cleared by Lock. Store the key in a password manager.

## Configuration

- Create a dedicated **private** Vercel Blob store and connect it to this project.
- Set `PAISHO_BLOB_STORE_ID` to that store ID. Connected deployments use OIDC where supported; the connection also supplies `BLOB_READ_WRITE_TOKEN`.
- Local testing can set `PAISHO_BLOB_READ_WRITE_TOKEN` in ignored `.env.local`.
- Set `PAISHO_ADMIN_KEY` to a cryptographically random 32-byte secret, never a NEXT_PUBLIC variable. Set it for production and preview before deploying.

## Existing app test

1. Open `/pai-sho` and enter the dashboard key.
2. Create a capture link. Copy its complete URL into the app's backend URL setting.
3. Use the app's existing manual synchronization, then refresh the dashboard.
4. Select a game to inspect all event JSON or download the complete archive.

The existing app appends `POST /api/v1/games` for metadata and `POST /api/v1/games/{gameId}/events/batch` with `{events: [...]}`. Capture URLs include a random write-only capability in their path, expire after 24 hours, and can be revoked. They must be kept private, including in access logs. Raw capabilities are never persisted in Blob, only SHA-256 hashes. A new capture link creates a separate archive namespace, so resending the same game with a new link creates another copy.

JSON metadata and events retain extra app fields. Event IDs and nonnegative integer sequences are required. Retries are idempotent; changed existing events and duplicate sequence numbers are rejected. ETag conditional writes preserve concurrent uploads. Limits: 2 MB per request, 3 MB and 5,000 events per game. This initial development dashboard reads up to 1,000 records per collection; pagination/indexing is needed for a larger archive. It archives client-reported data and does not independently validate game legality.

## Data access requests

Requests are stored with `awaiting_app_support`, no delivery time, and no approval time. **No push is sent and no consent is inferred.** A later mobile integration must register devices, implement notification delivery, record explicit approval/refusal and honor opt-outs. The app has not been modified. Training consent remains separate from manual synchronization.

## Verification

Run `npm run build`. For full integration checks, configure `.env.local`, start `npm run dev -- --port 3100`, then run `node tests/pai-sho.integration.cjs`. Chrome must be installed. The test writes disposable records into the configured store and deletes only the records it creates. Screenshots go to ignored `test-results/`.
