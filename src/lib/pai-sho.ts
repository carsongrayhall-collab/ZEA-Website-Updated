import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { get, list, put } from '@vercel/blob';
import { z } from 'zod';

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const metadataSchema = z.object({ gameId: id }).passthrough();
export const eventSchema = z.object({ eventId: id, sequence: z.number().int().nonnegative() }).passthrough();
export const batchSchema = z.object({ events: z.array(eventSchema).max(5000) });
type Event = z.infer<typeof eventSchema>;
export type Game = { metadata: Record<string, unknown>; events: Event[]; updatedAt: string; captureId: string };
export type Capture = { id: string; label: string; createdAt: string; expiresAt: string; revoked: boolean };
const options = () => ({ token: process.env.PAISHO_BLOB_READ_WRITE_TOKEN, storeId: process.env.PAISHO_BLOB_STORE_ID });
function configured() {
  if (!process.env.PAISHO_BLOB_READ_WRITE_TOKEN && !process.env.PAISHO_BLOB_STORE_ID) throw new ApiError(503, 'Pai Sho storage has not been connected yet.');
}
export function authorize(req: Request) {
  const key = process.env.PAISHO_ADMIN_KEY;
  const supplied = req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!key) throw new ApiError(503, 'Dashboard access has not been configured.');
  const a = createHash('sha256').update(key).digest(), b = createHash('sha256').update(supplied).digest();
  if (!timingSafeEqual(a, b)) throw new ApiError(401, 'Enter your dashboard access key.');
}
export async function read<T>(path: string) {
  configured();
  const result = await get(`pai-sho/${path}`, { ...options(), access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return { value: await new Response(result.stream).json() as T, etag: result.blob.etag };
}
export async function write(path: string, value: unknown, etag?: string) {
  configured();
  await put(`pai-sho/${path}`, JSON.stringify(value), { ...options(), access: 'private', addRandomSuffix: false,
    contentType: 'application/json', ...(etag ? { ifMatch: etag } : { allowOverwrite: false }) });
}
export async function entries<T>(prefix: string) {
  configured();
  let cursor: string | undefined;
  const result: { path: string; value: T }[] = [];
  do {
    const page = await list({ ...options(), prefix: `pai-sho/${prefix}`, limit: 100, cursor });
    for (let i = 0; i < page.blobs.length; i += 10) {
      const rows = await Promise.all(page.blobs.slice(i, i + 10).map(async blob => {
        const path = blob.pathname.slice('pai-sho/'.length);
        const record = await read<T>(path);
        return record ? { path, value: record.value } : null;
      }));
      result.push(...rows.filter((row): row is { path: string; value: T } => row !== null));
    }
    cursor = page.hasMore ? page.cursor : undefined;
    if (result.length >= 1000 && cursor) throw new ApiError(422, 'Archive exceeds this dashboard’s 1,000-record limit. Add pagination before expanding capture.');
  } while (cursor);
  return result;
}
export async function createCapture(label: string, origin: string) {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  const capture: Capture = { id: hash, label, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), revoked: false };
  await write(`captures/${hash}.json`, capture);
  return { capture, url: `${origin}/pai-sho/sync/${token}` };
}
export async function captureFor(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(401, 'Invalid capture link.');
  const hash = createHash('sha256').update(token).digest('hex');
  const capture = await read<Capture>(`captures/${hash}.json`);
  if (!capture || capture.value.revoked || Date.parse(capture.value.expiresAt) <= Date.now()) throw new ApiError(401, 'Capture link expired or revoked. Create a new link in the dashboard.');
  return capture.value;
}
export function mergeEvents(existing: Event[], incoming: Event[]) {
  const byId = new Map(existing.map(event => [event.eventId, event]));
  const sequences = new Map(existing.map(event => [event.sequence, event.eventId]));
  for (const event of incoming) {
    const prior = byId.get(event.eventId);
    if (prior && !isDeepStrictEqual(prior, event)) throw new ApiError(409, 'An existing event cannot be changed.');
    if (sequences.has(event.sequence) && sequences.get(event.sequence) !== event.eventId) throw new ApiError(409, 'Two events have the same sequence.');
    byId.set(event.eventId, event); sequences.set(event.sequence, event.eventId);
  }
  if (byId.size > 5000) throw new ApiError(413, 'Game exceeds 5,000 events.');
  return [...byId.values()].sort((a, b) => a.sequence - b.sequence);
}
export async function saveGame(captureId: string, gameId: string, metadata?: Record<string, unknown>, events?: Event[]) {
  if (!id.safeParse(gameId).success) throw new ApiError(400, 'Invalid game ID.');
  const path = `games/${captureId}/${gameId}.json`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const previous = await read<Game>(path);
    if (!previous && !metadata) throw new ApiError(404, 'Send game metadata before events.');
    const game: Game = { captureId, metadata: metadata || previous!.value.metadata,
      events: mergeEvents(previous?.value.events || [], events || []), updatedAt: new Date().toISOString() };
    if (Buffer.byteLength(JSON.stringify(game)) > 3_000_000) throw new ApiError(413, 'Game archive exceeds 3 MB.');
    try { await write(path, game, previous?.etag); return game; }
    catch (error) {
      if (attempt === 3 || !(error instanceof Error) || !/precondition|already exists|etag/i.test(error.message)) throw error;
    }
  }
  throw new ApiError(409, 'Concurrent upload; retry the sync.');
}
export async function body(req: Request) {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new ApiError(415, 'Send application/json.');
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, 'JSON body required.');
  const chunks: Uint8Array[] = []; let length = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.length;
    if (length > 2_000_000) { await reader.cancel(); throw new ApiError(413, 'Upload exceeds 2 MB.'); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ApiError(400, 'Invalid JSON.'); }
}
export function response(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    'Access-Control-Allow-Origin': 'https://appassets.androidplatform.net', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } });
}
export function failure(error: unknown) {
  if (error instanceof z.ZodError) return response({ error: 'Invalid payload.', details: error.issues.map(i => ({ path: i.path, message: i.message })) }, 400);
  if (error instanceof ApiError) return response({ error: error.message }, error.status);
  console.error('Pai Sho storage operation failed', error instanceof Error ? error.name : 'UnknownError');
  return response({ error: 'Storage unavailable. Please retry.' }, 503);
}
