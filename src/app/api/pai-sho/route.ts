import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ApiError, authorize, body, Capture, compactMetadata, createCapture, entries, failure, Game, read, response, write } from '@/lib/pai-sho';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  try {
    authorize(req);
    const [games, captures, requests] = await Promise.all([entries<Game>('games/'), entries<Capture>('captures/'), entries<Record<string, unknown>>('requests/')]);
    return response({ games: games.map(g => ({...g.value,metadata:compactMetadata(g.value.metadata)})), captures: captures.map(c => c.value), requests: requests.map(r => r.value) });
  } catch (error) { return failure(error); }
}
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('createCapture'), label: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal('revokeCapture'), id: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ action: z.literal('requestAccess'), captureId: z.string().regex(/^[a-f0-9]{64}$/), purpose: z.string().trim().min(10).max(500) })
]);
export async function POST(req: Request) {
  try {
    authorize(req);
    const action = actionSchema.parse(await body(req));
    if (action.action === 'createCapture') return response(await createCapture(action.label, new URL(req.url).origin));
    const captureId = action.action === 'revokeCapture' ? action.id : action.captureId;
    const path = `captures/${captureId}.json`, capture = await read<Capture>(path);
    if (!capture) throw new ApiError(404, 'Capture session not found.');
    if (action.action === 'revokeCapture') { await write(path, { ...capture.value, revoked: true }, capture.etag); return response({ revoked: true }); }
    const request = { id: randomUUID(), captureId, purpose: action.purpose, status: 'awaiting_app_support', createdAt: new Date().toISOString(), deliveredAt: null, approvedAt: null };
    await write(`requests/${request.id}.json`, request);
    return response({ request });
  } catch (error) { return failure(error); }
}
