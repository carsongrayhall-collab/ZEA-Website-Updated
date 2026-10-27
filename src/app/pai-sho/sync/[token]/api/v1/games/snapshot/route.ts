import { z } from 'zod';
import { batchSchema, body, captureFor, failure, metadataSchema, response, saveGame } from '@/lib/pai-sho';
export const runtime = 'nodejs';
const schema = z.object({ metadata: metadataSchema, events: batchSchema.shape.events });
export async function OPTIONS() { return response({}); }
export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const capture = await captureFor((await context.params).token);
    const { metadata, events } = schema.parse(await body(req));
    if (events.some(event => event.gameId && event.gameId !== metadata.gameId)) return response({ error: 'Event game ID mismatch.' }, 400);
    const game = await saveGame(capture.id, metadata.gameId, metadata, events);
    return response({ gameId: metadata.gameId, accepted: events.length, total: game.events.length, complete: true });
  } catch (error) { return failure(error); }
}
