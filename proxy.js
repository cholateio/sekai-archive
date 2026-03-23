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
const redis = isLocal ? null : Redis.fromEnv();

const ratelimit = isLocal
    ? null
    : new Ratelimit({
          redis: redis,
          limiter: Ratelimit.slidingWindow(10, '10 s'),
          ephemeralCache: new Map(),
          analytics: true,
      });

// Turnstile checking whether user is robot
async function verifyTurnstile(token, ip) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        logger.log('[Turnstile] Secret key missing, skipping validation', 'warn');
        return true;
    }

    try {
        const formData = new FormData();
        formData.append('secret', secret);
        formData.append('response', token);
        formData.append('remoteip', ip); // 帶入客戶端 IP 可提升 Cloudflare 的判斷準確度

        // 直接透過 fetch 呼叫 Cloudflare 驗證節點 (Edge 友善)
        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            body: formData,
            method: 'POST',
        });

        const outcome = await result.json();
        return outcome.success;
    } catch (err) {
        logger.log(`[Turnstile Error] Validation failed: ${err.message}`, 'error');
        return true;
    }
}

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

        // 非部屬網頁來源觸發阻擋
        if (!isLocal) {
            const referer = req.headers.get('referer') || '';
            const origin = req.headers.get('origin') || '';
            const allowedDomain = 'sekai-archive.vercel.app';

            if (!referer.includes(allowedDomain) && !origin.includes(allowedDomain)) {
                logger.log(`[Security] Blocked cross-origin request from IP: ${ip}`, 'warn');
                return new NextResponse(JSON.stringify({ error: 'Invalid Origin' }), { status: 403 });
            }
        }

        const path = req.nextUrl.pathname;
        if (!path.startsWith('/api/chat') && !path.startsWith('/api/judge')) {
            const res = NextResponse.next();
            return applySecurityHeaders(res);
        }

        // Turnstile 機器人判斷 (先關掉)
        // if (!isLocal) {
        //     // 預期前端會在 Header 帶上 x-turnstile-token
        //     const turnstileToken = req.headers.get('x-turnstile-token');

        //     if (!turnstileToken) {
        //         logger.log(`[Security] Missing Turnstile token from IP: ${ip}`, 'warn');
        //         const res = new NextResponse(JSON.stringify({ error: 'Turnstile token is required' }), {
        //             status: 403,
        //             headers: { 'content-type': 'application/json' },
        //         });
        //         return applySecurityHeaders(res);
        //     }

        //     const isHuman = await verifyTurnstile(turnstileToken, ip);
        //     if (!isHuman) {
        //         logger.log(`[Security] Bot detected by Turnstile from IP: ${ip}`, 'warn');
        //         const res = new NextResponse(JSON.stringify({ error: 'Bot verification failed' }), {
        //             status: 403,
        //             headers: { 'content-type': 'application/json' },
        //         });
        //         return applySecurityHeaders(res);
        //     }
        // }

        // 確認真人玩家也沒有濫用 API (isLocal 略過)
        if (isLocal || !ratelimit) {
            const res = NextResponse.next();
            return applySecurityHeaders(res);
        }

        const identifier = `ratelimit:${ip}:${path}`; // make sure different api has different limit counter
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
