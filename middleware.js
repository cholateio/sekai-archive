import { NextResponse } from 'next/server';
import { ipAddress } from '@vercel/functions';
import { SignJWT, jwtVerify } from 'jose';

// --- 設定區 ---
const RATE_LIMIT = 100; // 每小時 60 次
const WINDOW_SIZE = 60 * 60 * 1000; // 1 小時 (毫秒)
const SECRET_KEY = new TextEncoder().encode(process.env.RATE_LIMIT_SECRET);

// 黑名單 (沿用你的邏輯)
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

// --- JWT 輔助函式 ---
async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return payload;
    } catch (err) {
        return null; // 驗證失敗或過期視為無效
    }
}

async function signToken(payload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h') // Token 有效期設得比 Window 稍長即可
        .sign(SECRET_KEY);
}

export default async function middleware(req) {
    const rawIp = ipAddress(req) || req.headers.get('x-forwarded-for') || 'unknown';
    const ip = normalizeIp(rawIp);

    if (BLOCKED_IPS.has(ip)) {
        return new NextResponse(JSON.stringify({ error: 'Access Denied' }), {
            status: 403,
            headers: { 'content-type': 'application/json' },
        });
    }

    const token = req.cookies.get('rate_limit_token')?.value;
    const now = Date.now();

    let usageData = {
        count: 0,
        startTime: now,
        ip: ip, // 綁定 IP 到 Token 中，防止偷別人的 Token 來用
    };

    if (token) {
        const payload = await verifyToken(token);
        if (payload && payload.ip === ip) {
            // 確保是同一個 IP
            usageData = {
                count: Number(payload.count),
                startTime: Number(payload.startTime),
                ip: payload.ip,
            };
        }
    }

    // 計算是否重置視窗 (滑動視窗的簡化版：固定重置時間點)
    if (now - usageData.startTime > WINDOW_SIZE) {
        // 超過一小時，重置
        usageData.count = 1;
        usageData.startTime = now;
    } else {
        // 還在時間內，累加
        usageData.count++;
    }

    // 檢查是否超量
    if (usageData.count > RATE_LIMIT) {
        console.log(`[RateLimit] IP ${ip} exceeded limit: ${usageData.count}/${RATE_LIMIT}`);
        return new NextResponse(
            JSON.stringify({
                error: 'Too Many Requests (Please come back after 1 hour)',
                retryAfter: Math.ceil((usageData.startTime + WINDOW_SIZE - now) / 1000),
            }),
            {
                status: 429,
                headers: { 'content-type': 'application/json' },
            },
        );
    }

    // 注意：我們必須更新 Cookie，這樣客戶端的計數器才會增加
    const newToken = await signToken(usageData);
    const res = NextResponse.next();

    // 設定 Cookie (httpOnly 避免 JS 修改，雖然這是簽名的，但多一層保護也好)
    res.cookies.set('rate_limit_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 2, // 2 小時
    });
    res.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
    res.headers.set('X-RateLimit-Remaining', (RATE_LIMIT - usageData.count).toString());

    return res;
}

export const config = {
    matcher: '/api/:path*',
};
