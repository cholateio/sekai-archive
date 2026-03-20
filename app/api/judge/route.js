import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { DebugLogger } from '@/lib/debug-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { JUDGE_PROMPT } from '@/lib/prompts/judge';
import { SEKAI_JARGON } from '@/lib/jargon';

export const runtime = 'edge'; // 設定為 Edge Runtime，啟動速度快，適合輕量級邏輯

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function POST(req) {
    const logger = new DebugLogger('API/Judge');

    // Check rate limit
    const { success, ip } = await checkRateLimit(req, { limit: 10, window: '10 s' });
    if (!success) {
        logger.log(`Rate limit exceeded for IP: ${ip}`, 'warn');
        return NextResponse.json({ intent: 'system_error', reason: 'Too many requests.' }, { status: 429 });
    }

    // Begin to judge user's intent
    logger.time('Judge_Latency');
    try {
        const { queryText } = await req.json();
        if (!queryText) return NextResponse.json({ intent: 'system_error', reason: 'No input.' });

        logger.log(`Judging input: "${queryText.slice(0, 20)}${queryText.length > 20 ? '...' : ''}"`, 'info');

        // call lightweight llm model for judging intent
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: JUDGE_PROMPT },
                { role: 'user', content: `<<< ${queryText} >>>` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 100,
        });
        let result = JSON.parse(completion.choices[0].message.content);

        // quick check whether intent is valid
        const intent = result.intent;
        const validIntents = ['query_sekai', 'query_score', 'general', 'garbage'];

        // domain jargon check (change query from general to query_sekai is has domain jargon)
        const hasDomainJargon = SEKAI_JARGON.some((keyword) => queryText.toUpperCase().includes(keyword.toUpperCase()));
        if (hasDomainJargon && intent == 'general')
            result = { intent: 'query_sekai', reason: 'Change from general to query_sekai.' };

        if (validIntents.includes(intent)) {
            logger.log(`Verdict: (${intent}) (${result.reason})`);

            // 1 minute jwt token for calling chat api
            const token = await new SignJWT({ authorized_intent: intent })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('1m')
                .sign(secretKey);

            const duration = logger.timeEnd('Judge_Latency');
            logger.logSummary({ usage: completion.usage, duration: duration });

            return NextResponse.json({ ...result, token });
        }
        return NextResponse.json({ intent: 'system_error', reason: 'No valid intent.' });
    } catch (error) {
        logger.log(error.message, 'error');
        return NextResponse.json({ intent: 'system_error', reason: 'System error.' });
    }
}
