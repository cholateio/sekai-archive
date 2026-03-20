import { NextResponse } from 'next/server';
import { ipAddress } from '@vercel/functions';
import { SignJWT, jwtVerify } from 'jose';

// --- 全域安全標頭設定 ---
const securityHeaders = {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY', // 防止被 iframe 嵌入 (防點擊劫持)
    'X-Content-Type-Options': 'nosniff', // 防止瀏覽器嗅探 MIME type
    'Referrer-Policy': 'origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
};

const SECRET_KEY = new TextEncoder().encode(process.env.RATE_LIMIT_SECRET);

const BLOCKED_IPS = new Set(
    (process.env.BLOCKED_IPS || '')
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean),
);

function normalizeIp(rawIp) {
    if (!rawIp) return 'unknown';
    const first = rawIp.split(',')[0].trim();
    if (first.startsWith('::ffff:')) return first.substring('::ffff:'.length);
    return first;
}

async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return payload;
    } catch (err) {
        return null;
    }
}

async function signToken(payload) {
    return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2h').sign(SECRET_KEY);
}

export default async function proxy(req) {
    const rawIp = ipAddress(req) || req.headers.get('x-forwarded-for') || 'unknown';
    const ip = normalizeIp(rawIp);

    // 黑名單檢查
    if (BLOCKED_IPS.has(ip)) {
        return new NextResponse(JSON.stringify({ error: 'Access Denied' }), {
            status: 403,
            headers: { 'content-type': 'application/json' },
        });
    }

    // 動態路由限流設定 (Route-Based Limits)
    const path = req.nextUrl.pathname;
    let limit = 60; // 預設限制
    let windowSize = 60 * 60 * 1000; // 預設 1 小時

    if (path.startsWith('/api/chat') || path.startsWith('/api/run')) {
        // Chat API 消耗大，限制更嚴格 (例如：10 秒內 5 次)
        limit = 5;
        windowSize = 10 * 1000;
    } else if (path.startsWith('/api/judge')) {
        // Judge API 輕量，稍微放寬 (例如：1 分鐘內 30 次)
        limit = 30;
        windowSize = 60 * 1000;
    }

    const token = req.cookies.get('rate_limit_token')?.value;
    const now = Date.now();

    let usageData = {
        count: 0,
        startTime: now,
        ip: ip,
        pathType: path.split('/')[2] || 'general', // 將路徑類型也綁入 Token 避免跨路由共用
    };

    if (token) {
        const payload = await verifyToken(token);
        // 確保 IP 和請求的路徑類型一致
        if (payload && payload.ip === ip && payload.pathType === usageData.pathType) {
            usageData = {
                count: Number(payload.count),
                startTime: Number(payload.startTime),
                ip: payload.ip,
                pathType: payload.pathType,
            };
        }
    }

    if (now - usageData.startTime > windowSize) {
        usageData.count = 1;
        usageData.startTime = now;
    } else {
        usageData.count++;
    }

    if (usageData.count > limit) {
        console.log(`[RateLimit] IP ${ip} exceeded limit for ${path}: ${usageData.count}/${limit}`);
        return new NextResponse(
            JSON.stringify({
                error: 'Too Many Requests',
                retryAfter: Math.ceil((usageData.startTime + windowSize - now) / 1000),
            }),
            {
                status: 429,
                headers: { 'content-type': 'application/json' },
            },
        );
    }

    const newToken = await signToken(usageData);

    // 準備回應並套用安全標頭
    const res = NextResponse.next();

    // 寫入 Security Headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
        res.headers.set(key, value);
    });

    res.cookies.set('rate_limit_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: Math.ceil(windowSize / 1000) * 2, // 根據不同路由動態調整 Cookie 壽命
    });

    res.headers.set('X-RateLimit-Limit', limit.toString());
    res.headers.set('X-RateLimit-Remaining', (limit - usageData.count).toString());

    return res;
}

export const config = {
    matcher: '/api/:path*',
};
