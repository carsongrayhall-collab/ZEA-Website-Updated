import { batchSchema, body, captureFor, failure, response, saveGame } from '@/lib/pai-sho';
export const runtime = 'nodejs';
export async function OPTIONS() { return response({}); }
export async function POST(req: Request, context: { params: Promise<{ token: string; gameId: string }> }) {
  try {
    const { token, gameId } = await context.params;
    const capture = await captureFor(token);
    const { events } = batchSchema.parse(await body(req));
    const game = await saveGame(capture.id, gameId, undefined, events);
    return response({ gameId, accepted: events.length, total: game.events.length });
  } catch (error) { return failure(error); }
}
