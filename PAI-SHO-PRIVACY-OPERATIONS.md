# Pai Sho privacy operations — 2026-11-06

Operator: ZEA LLC. Monitored request inbox: pai-sho@zeabroker.com.

## Implemented and deployed

- `/pai-sho-compliance` is public; `/pai-sho/privacy` redirects permanently.
- Administrator access uses the existing server-only `PAISHO_ADMIN_KEY`.
- Legacy capability upload endpoints return 410. Do not reopen them: a shared link is not per-user authentication.
- `/pai-sho` searches games by capture reference and exposes verified group deletion. Player names and references locate records; independently verify ownership and scope before deleting or disclosing them. One development capture can include multiple players.
- Deletion revokes a capture, physically removes its games and pending requests, then removes the capture. A storage error is a failure, not a success. Retry the same reference; partial deletion is idempotent. User/device keys do not establish ownership of old shared records.
- Daily scheduled cleanup runs at 03:00 UTC using a production-only CRON_SECRET. It deletes records at 29 days to leave scheduling margin within 30 days; authenticated dashboard refresh also runs cleanup. Dates use firstAcceptedAt, then createdAt, then legacy updatedAt, then Blob upload time. Legacy writes are closed, so retries cannot extend their age.
- No persistent server-generated exports or secondary archive backups are created by these changes. Downloaded exports and provider-controlled logs/backups require separate treatment and verification. Do not claim these have a verified 30-day limit.

## Verification

- `node tests/privacy-operations.cjs`: authorization, legacy-write rejection, scoped deletion, storage failure/retry, idempotency, expiry and malformed timestamps passed with isolated mocked storage.
- `npx tsc --noEmit` and `npm run build`: passed.
- Production public policy: 200; old policy: 308 to new policy.
- Unauthenticated dashboard API and retention endpoint: 401.
- Legacy upload request with disposable test ID: 410, no record accepted.
- Authenticated production retention endpoint: 200, `{deleted:0}`. No aged production record was available to prove a real expired-object deletion. Mocked-storage deletion tests are not that proof.

## Still release blockers

- Mobile archive enrollment, signed per-user ownership, access/deletion endpoints and anti-replay/rate-limit controls are NOT implemented. The mobile transport remains disabled. Existing capture references are administrative groups, not a new per-user tracking system.
- Garden Gate sign-in/account creation, associated-data deletion and accessible chat/moderation require third-party verification, or explicit removal from the first release.
- Verify provider log/backup retention and international-transfer terms. Production and preview currently share a Blob configuration; isolate preview before integration testing against private data.
- Publish full corresponding source for the exact mobile release; audit separately credited artwork and sounds. Do not distribute private signing keys, credentials or upstream test keys.
- Complete target audience, content rating, Data safety, app access and other applicable Play declarations. These cannot be certified by changing source text.
- Build/sign the final AAB, verify its merged permissions and behavior on devices, and satisfy account-specific testing/developer-verification requirements. No final AAB was generated or submitted here.

The deployment is on `codex/pai-sho-compliance`, not main. Keep main aligned before subsequent production releases so they do not remove these controls.
