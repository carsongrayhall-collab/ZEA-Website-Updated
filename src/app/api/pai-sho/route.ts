import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ApiError, authorize, body, Capture, compactMetadata, deleteCaptureRecords, entries, failure, Game, purgeExpired, read, response, write } from '@/lib/pai-sho';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  try {
    authorize(req);
    await purgeExpired();
    const [games, captures, requests] = await Promise.all([entries<Game>('games/'), entries<Capture>('captures/'), entries<Record<string, unknown>>('requests/')]);
    return response({ games: games.map(g => ({...g.value,metadata:compactMetadata(g.value.metadata)})), captures: captures.map(c => c.value), requests: requests.map(r => r.value) });
  } catch (error) { return failure(error); }
}
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('purgeExpired') }),
  z.object({ action: z.literal('deleteCapture'), id: z.string().regex(/^[a-f0-9]{64}$/), ownershipVerified: z.literal(true) }),
  z.object({ action: z.literal('revokeCapture'), id: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ action: z.literal('requestAccess'), captureId: z.string().regex(/^[a-f0-9]{64}$/), purpose: z.string().trim().min(10).max(500) })
]);
export async function POST(req: Request) {
  try {
    authorize(req);
    const action = actionSchema.parse(await body(req));
    if (action.action === 'purgeExpired') return response(await purgeExpired());
    if (action.action === 'deleteCapture') return response(await deleteCaptureRecords(action.id));
    const captureId = action.action === 'revokeCapture' ? action.id : action.captureId;
    const path = `captures/${captureId}.json`, capture = await read<Capture>(path);
    if (!capture) throw new ApiError(404, 'Capture session not found.');
    if (action.action === 'revokeCapture') { await write(path, { ...capture.value, revoked: true }, capture.etag); return response({ revoked: true }); }
    const request = { id: randomUUID(), captureId, purpose: action.purpose, status: 'awaiting_app_support', createdAt: new Date().toISOString(), deliveredAt: null, approvedAt: null };
    await write(`requests/${request.id}.json`, request);
    return response({ request });
  } catch (error) { return failure(error); }
}
