import { createHash, timingSafeEqual } from 'node:crypto';
import { failure, purgeExpired, response } from '@/lib/pai-sho';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return response({ error: 'Retention scheduler is not configured.' }, 503);
  const actual = createHash('sha256').update(req.headers.get('authorization') || '').digest();
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  if (!timingSafeEqual(actual, expected)) return response({ error: 'Unauthorized.' }, 401);
  try { return response(await purgeExpired()); } catch (error) { return failure(error); }
}
