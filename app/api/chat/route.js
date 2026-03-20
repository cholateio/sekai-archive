import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DebugLogger } from '@/lib/debug-utils';
import { allToolDefinitions, toolImplementations } from '@/lib/tools/registry';
import { generateSystemPrompt } from '@/lib/prompts/system';
import { checkRateLimit } from '@/lib/rate-limit';

// --- Supabase Admin (用於寫入 Log) ---
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const maxDuration = 60; // 允許執行最長 60 秒

export async function POST(req) {
    const logger = new DebugLogger('API/Chat');
    const startTotal = performance.now();

    const { success, ip } = await checkRateLimit(req, { limit: 5, window: '10 s' });
    const country = req.headers.get('x-vercel-ip-country') || 'unknown';

    if (!success) {
        logger.log(`Rate limit exceeded for IP: ${ip}`, 'warn');
        return NextResponse.json({ error: 'Too Many Requests', reason: '系統偵測到請求過於頻繁，請稍後再試。' }, { status: 429 });
    }

    try {
        let requestData = {};
        requestData = await req.json();

        // 前端不再傳送完整的 messages (含 System Prompt)，而是傳送 history (純對話) + config (設定)
        const { messages: history, config, sessionId } = requestData;

        const lastUserMsg = Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;

        const queryContent = lastUserMsg?.role === 'user' ? lastUserMsg.content : 'Unknown/Empty';

        const userAgent = req.headers.get('user-agent') || '';

        logger.log(`Received request from ${ip} (${country})`, 'info');

        let logData = {
            ip: ip,
            country: country,
            query_content: queryContent.slice(0, 1000),
            favorite: config?.character || 'Unknown',
            model_used: 'gpt-4o-mini',
            tool_used: null,
            status: 'success',
            tokens_input: 0,
            tokens_output: 0,
            duration_ms: 0,
            response_preview: '',
            error_msg: null,
        };

        // Need to add system prompt at backend, do not add it at frontend
        const systemPromptContent = generateSystemPrompt(config);
        const systemMessage = { role: 'system', content: systemPromptContent };

        // prevent system prompt injection attack at backend
        const safeMessages = [systemMessage, ...(Array.isArray(history) ? history.filter((m) => m.role !== 'system') : [])];

        // 1st Pass: Router & Tool Selection
        const runner = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: safeMessages, // 使用清洗後的安全陣列
            tools: allToolDefinitions.length > 0 ? allToolDefinitions : undefined,
            tool_choice: allToolDefinitions.length > 0 ? 'auto' : 'none',
            stream: true,
            stream_options: { include_usage: true },
            max_tokens: 1000 || undefined,
        });

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let toolCalls = [];
                let accumulatedUsage = null;
                let fullResponse = '';
                let finishReason = null;
                let systemFingerprint = null;

                try {
                    for await (const chunk of runner) {
                        const delta = chunk.choices[0]?.delta;

                        if (chunk.system_fingerprint) systemFingerprint = chunk.system_fingerprint;
                        if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;

                        if (delta?.content) {
                            controller.enqueue(encoder.encode(delta.content));
                            fullResponse += delta.content;
                        }

                        if (delta?.tool_calls) {
                            delta.tool_calls.forEach((toolCall) => {
                                const index = toolCall.index;
                                if (!toolCalls[index]) {
                                    toolCalls[index] = toolCall;
                                    toolCalls[index].function.arguments = '';
                                }
                                if (toolCall.function?.name) {
                                    toolCalls[index].function.name = toolCall.function.name;

                                    if (!logData.tool_used) {
                                        logData.tool_used = toolCall.function.name;
                                    }
                                }
                                if (toolCall.function?.arguments) {
                                    toolCalls[index].function.arguments += toolCall.function.arguments;
                                }
                            });
                        }
                        if (chunk.usage) accumulatedUsage = chunk.usage;
                    }

                    // --- 處理工具呼叫 (Function Calling) ---
                    if (toolCalls.length > 0) {
                        logger.log(`Tool usage detected: ${toolCalls.length} calls`, 'warn');

                        // 把 Assistant 想要呼叫工具的意圖加回對話歷史
                        safeMessages.push({
                            role: 'assistant',
                            content: null,
                            tool_calls: toolCalls,
                        });

                        for (const toolCall of toolCalls) {
                            const functionName = toolCall.function.name;
                            const functionArgs = toolCall.function.arguments;
                            const functionToCall = toolImplementations[functionName];

                            if (!functionToCall) {
                                logger.log(`Tool ${functionName} not found in registry`, 'error');
                                messages.push({
                                    role: 'tool',
                                    tool_call_id: toolCall.id,
                                    name: functionName,
                                    content: JSON.stringify({ error: `Tool ${functionName} is not implemented.` }),
                                });
                                continue;
                            }

                            logger.log(`👉 [Tool Input] ${functionName} Args: ${functionArgs}`, 'info');

                            // 若有參數需在此解析 JSON.parse(toolCall.function.arguments)
                            let args = {};
                            try {
                                if (functionArgs) args = JSON.parse(functionArgs);
                            } catch (e) {
                                logger.log(`Failed to parse args for ${functionName}: ${e.message}`, 'error');
                            }

                            // 這裡將解析後的 args 物件傳進去
                            const toolResult = await functionToCall(args);

                            // Debug (See tool output)
                            // const previewResponse =
                            //     typeof toolResult === 'string'
                            //         ? toolResult.length > 300
                            //             ? toolResult.slice(0, 300) + '...'
                            //             : toolResult
                            //         : JSON.stringify(toolResult).slice(0, 300);
                            // logger.log(`👈 [Tool Output] ${functionName} Result: ${previewResponse}`, 'success');

                            logger.log(`👈 [Tool Result] Length: ${toolResult?.length || 0}`, 'success');

                            // 把工具執行結果加回對話歷史
                            safeMessages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                name: functionName,
                                content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
                            });
                        }

                        // 2nd Pass: Final Generation
                        const finalStream = await openai.chat.completions.create({
                            model: 'gpt-4o-mini',
                            messages: safeMessages,
                            stream: true,
                            stream_options: { include_usage: true },
                            max_tokens: 1000 || undefined,
                        });

                        for await (const chunk of finalStream) {
                            const content = chunk.choices[0]?.delta?.content;

                            if (chunk.system_fingerprint) systemFingerprint = chunk.system_fingerprint;
                            if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;

                            if (content) {
                                controller.enqueue(encoder.encode(content));
                                fullResponse += content;
                            }
                            if (chunk.usage) {
                                if (accumulatedUsage) {
                                    accumulatedUsage.total_tokens += chunk.usage.total_tokens;
                                    accumulatedUsage.prompt_tokens += chunk.usage.prompt_tokens;
                                    accumulatedUsage.completion_tokens += chunk.usage.completion_tokens;
                                } else {
                                    accumulatedUsage = chunk.usage;
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('Stream Process Error:', err);
                    logData.status = 'error';
                    logData.error_msg = err.message;

                    // 嘗試通知前端發生錯誤
                    const errorMsg = `\n\n[系統錯誤: ${err.message}]`;
                    controller.enqueue(encoder.encode(errorMsg));
                } finally {
                    const duration = (performance.now() - startTotal).toFixed(0);
                    logger.logSummary({ usage: accumulatedUsage, duration, steps: [] });

                    logData.duration_ms = parseInt(duration);
                    logData.response_preview = fullResponse.slice(0, 1000);

                    // 費率常數 (gpt-4o-mini)
                    const PRICE_IN = 0.15;
                    const PRICE_OUT = 0.6;

                    // 計算成本
                    const cost = accumulatedUsage
                        ? (accumulatedUsage.prompt_tokens / 1e6) * PRICE_IN +
                          (accumulatedUsage.completion_tokens / 1e6) * PRICE_OUT
                        : 0;

                    if (accumulatedUsage) {
                        logData.tokens_input = accumulatedUsage.prompt_tokens;
                        logData.tokens_output = accumulatedUsage.completion_tokens;
                    }

                    logData.session_id = sessionId;
                    logData.cost_usd = cost;
                    logData.finish_reason = finishReason;
                    logData.system_fingerprint = systemFingerprint;
                    logData.user_agent = userAgent;

                    // streaming is done, isLoading to false (! before uploading log 不然被 supabase 延遲搞過)
                    controller.close();

                    try {
                        // upload logData to supabase (3s timeout)
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Supabase connection timed out')), 3000),
                        );
                        const insertPromise = supabaseAdmin.from('ai_inferences').insert(logData);
                        await Promise.race([insertPromise, timeoutPromise]);

                        logger.log('Log saved to DB successfully', 'success');
                    } catch (dbError) {
                        console.error(`[DB Failed]: ${dbError.message}`);
                    }
                }
            },
        });

        return new NextResponse(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    } catch (error) {
        // 如果連 OpenAI 都還沒呼叫就掛了 (例如 JSON parse error)，在這裡捕獲
        console.error('Fatal Route Error:', error);

        await supabaseAdmin.from('ai_inferences').insert({
            ...logData,
            status: 'fatal_error',
            error_msg: error.message,
            duration_ms: parseInt((performance.now() - startTotal).toFixed(0)),
        });

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
