import { body, captureFor, failure, metadataSchema, response, saveGame } from '@/lib/pai-sho';
export const runtime = 'nodejs';
export async function OPTIONS() { return response({}); }
export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const capture = await captureFor((await context.params).token);
    const metadata = metadataSchema.parse(await body(req));
    await saveGame(capture.id, metadata.gameId, metadata);
    return response({ gameId: metadata.gameId, accepted: true });
  } catch (error) { return failure(error); }
}
