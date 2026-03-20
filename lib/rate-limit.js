import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { ipAddress } from '@vercel/functions';

export async function checkRateLimit(req, { limit = 10, window = '10 s' } = {}) {
    const ip = ipAddress(req) || '127.0.0.1';

    // Fool Proofing
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        console.warn('[RateLimit] KV credentials missing, skipping rate limit check.');
        return { success: true, ip };
    }

    try {
        const ratelimit = new Ratelimit({
            redis: kv,
            limiter: Ratelimit.slidingWindow(limit, window),
            analytics: true,
        });

        const { success } = await ratelimit.limit(ip);
        return { success, ip };
    } catch (error) {
        console.error('[RateLimit]:', error);
        return { success: true, ip };
    }
}
