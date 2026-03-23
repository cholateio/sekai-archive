import { NextResponse } from 'next/server';
import { ipAddress } from '@vercel/functions';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { DebugLogger } from '@/lib/debug-utils';

const logger = new DebugLogger('Proxy');

// --- 全域安全標頭設定 ---
const securityHeaders = {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
};

const BLOCKED_IPS = new Set(
    (process.env.BLOCKED_IPS || '')
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean),
);

const isLocal = process.env.NODE_ENV === 'development' || !process.env.REDIS_URL;
// Initialize Redis
const redis = Redis.fromEnv();

const ratelimit = isLocal
    ? null
    : new Ratelimit({
          redis: redis,
          limiter: Ratelimit.slidingWindow(10, '10 s'),
          ephemeralCache: new Map(),
          analytics: true,
      });

function normalizeIp(rawIp) {
    if (!rawIp) return 'unknown';
    const first = rawIp.split(',')[0].trim();
    if (first.startsWith('::ffff:')) return first.substring('::ffff:'.length);
    return first;
}

function applySecurityHeaders(response) {
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

export async function proxy(req) {
    try {
        const rawIp = ipAddress(req) || req.headers.get('x-forwarded-for') || 'unknown';
        const ip = normalizeIp(rawIp);

        // 黑名單阻擋
        if (BLOCKED_IPS.has(ip)) {
            logger.log(`[Security] Blocked access from blacklisted IP: ${ip}`, 'warn');
            const res = new NextResponse(JSON.stringify({ error: 'Access Denied' }), {
                status: 403,
                headers: { 'content-type': 'application/json' },
            });
            return applySecurityHeaders(res);
        }

        const path = req.nextUrl.pathname;
        if (!path.startsWith('/api/chat') && !path.startsWith('/api/judge')) {
            const res = NextResponse.next();
            return applySecurityHeaders(res);
        }

        if (isLocal || !ratelimit) {
            const res = NextResponse.next();
            return applySecurityHeaders(res);
        }

        // 正式環境的限流檢查
        const identifier = `ratelimit:${ip}:${path}`;
        const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

        if (!success) {
            logger.log(`[RateLimit] Blocked IP: ${ip} on ${path}`, 'warn');
            const res = new NextResponse(
                JSON.stringify({
                    error: 'Too Many Requests',
                    retryAfter: Math.ceil((reset - Date.now()) / 1000),
                }),
                {
                    status: 429,
                    headers: {
                        'content-type': 'application/json',
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': remaining.toString(),
                        'X-RateLimit-Reset': reset.toString(),
                    },
                },
            );
            return applySecurityHeaders(res);
        }

        const res = NextResponse.next();
        res.headers.set('X-RateLimit-Limit', limit.toString());
        res.headers.set('X-RateLimit-Remaining', remaining.toString());
        return applySecurityHeaders(res);
    } catch (error) {
        logger.log(`[Middleware Error] Rate limit execution failed: ${error.message}`, 'error');
        const res = NextResponse.next();
        return applySecurityHeaders(res);
    }
}

export const config = {
    matcher: '/api/:path*',
};
