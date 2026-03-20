import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { DebugLogger } from '@/lib/debug-utils';
import { allToolDefinitions, toolImplementations } from '@/lib/tools/registry';
import { generateSystemPrompt } from '@/lib/prompts/system';
import { checkRateLimit } from '@/lib/rate-limit';

const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = 'nodejs';
export const maxDuration = 60; // 允許執行最長 60 秒

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function POST(req) {
    const logger = new DebugLogger('API/Chat');
    const startTime = performance.now();

    // Check JWT token
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.log('Missing or invalid Authorization header', 'warn');
            return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];

        // jwtVerify 若發現過期或簽章不符，會自動拋出 Error
        const { payload } = await jwtVerify(token, secretKey);
        logger.log(`JWT verified for intent: ${payload.authorized_intent}`, 'info');
    } catch (err) {
        logger.log(`JWT Verification Failed: ${err.message}`, 'error');
        return NextResponse.json({ error: 'Forbidden: Invalid or expired token.' }, { status: 403 });
    }

    // Check rate limit
    const { success, ip } = await checkRateLimit(req, { limit: 5, window: '10 s' });
    const country = req.headers.get('x-vercel-ip-country') || 'unknown';
    logger.log(`Received request from ${ip} (${country})`, 'info');

    if (!success) {
        logger.log(`Rate limit exceeded for IP: ${ip}`, 'warn');
        return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    try {
        const requestData = await req.json();

        // 前端負責傳送 history (純對話) + config (設定) + tools (允許使用的工具)
        const { messages: history, config, sessionId, allowed_tools } = requestData;

        const lastUserMsg = Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;

        const queryContent = lastUserMsg?.role === 'user' ? lastUserMsg.content : 'Unknown/Empty';

        const userAgent = req.headers.get('user-agent') || '';

        let availableTools = [];
        if (allowed_tools && Array.isArray(allowed_tools) && allowed_tools.length > 0) {
            availableTools = allToolDefinitions.filter((tool) => allowed_tools.includes(tool.function.name));
        }
        logger.log(`Received tools: ${availableTools}`, 'info');

        let logData = {
            ip,
            country,
            session_id: sessionId,
            user_agent: userAgent,
            query_content: queryContent.slice(0, 1000),
            favorite: config?.character || 'Unknown',
            model_used: 'gpt-4o-mini',
            tool_used: [],
            status: 'success',
            tokens_input: 0,
            tokens_output: 0,
            duration_ms: 0,
            cost_usd: 0,
            response_preview: '',
            error_msg: null,
            finish_reason: null,
        };

        // Need to add system prompt at backend, do not add it at frontend
        const systemPromptContent = generateSystemPrompt(config || {});
        // prevent system prompt injection attack at backend
        const safeMessages = [
            { role: 'system', content: systemPromptContent },
            ...(Array.isArray(history) ? history.filter((m) => m.role !== 'system') : []),
        ];

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let fullResponse = '';
                let accumulatedUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

                const MAX_STEPS = 5; // Max agent steps
                let currentStep = 0;

                async function runAgentLoop() {
                    while (currentStep < MAX_STEPS) {
                        currentStep++;
                        const isLastStep = currentStep === MAX_STEPS;

                        logger.log(`Agent Step ${currentStep}/${MAX_STEPS} started`, 'info');

                        const runner = await openai.chat.completions.create({
                            model: 'gpt-4o-mini',
                            messages: safeMessages,
                            stream: true,
                            stream_options: { include_usage: true },
                            max_tokens: 2000,
                            ...(availableTools.length > 0 && !isLastStep
                                ? {
                                      tools: availableTools,
                                      tool_choice: 'auto',
                                  }
                                : {}),
                        });

                        let toolCalls = [];
                        let loopResponse = ''; // 紀錄單次迴圈 Assistant 產生的文字

                        // 處理 OpenAI Stream Chunk
                        for await (const chunk of runner) {
                            const delta = chunk.choices[0]?.delta;
                            if (chunk.choices[0]?.finish_reason) logData.finish_reason = chunk.choices[0].finish_reason;
                            if (chunk.system_fingerprint) logData.system_fingerprint = chunk.system_fingerprint;

                            // 串流文字給前端
                            if (delta?.content) {
                                controller.enqueue(encoder.encode(delta.content));
                                loopResponse += delta.content;
                                fullResponse += delta.content;
                            }

                            // 收集 Tool Calls 參數
                            if (delta?.tool_calls) {
                                delta.tool_calls.forEach((toolCall) => {
                                    const index = toolCall.index;
                                    if (!toolCalls[index]) {
                                        toolCalls[index] = toolCall;
                                        toolCalls[index].function.arguments = '';
                                    }
                                    if (toolCall.function?.name) {
                                        toolCalls[index].function.name = toolCall.function.name;
                                        if (!logData.tool_used.includes(toolCall.function.name)) {
                                            logData.tool_used.push(toolCall.function.name);
                                        }
                                    }
                                    if (toolCall.function?.arguments) {
                                        toolCalls[index].function.arguments += toolCall.function.arguments;
                                    }
                                });
                            }

                            // 累加 Token 計算
                            if (chunk.usage) {
                                accumulatedUsage.prompt_tokens += chunk.usage.prompt_tokens;
                                accumulatedUsage.completion_tokens += chunk.usage.completion_tokens;
                                accumulatedUsage.total_tokens += chunk.usage.total_tokens;
                            }
                        }

                        // 判斷是否需要執行工具
                        if (toolCalls.length > 0) {
                            logger.log(`Tool usage detected in step ${currentStep}: ${toolCalls.length} calls`, 'warn');

                            // 將 Assistant 的意圖 (包含可能產生的一點點文字 + tool_calls) 加回紀錄
                            safeMessages.push({
                                role: 'assistant',
                                content: loopResponse || null,
                                tool_calls: toolCalls,
                            });

                            // 執行所有被呼叫的工具
                            for (const toolCall of toolCalls) {
                                const functionName = toolCall.function.name;
                                const functionArgs = toolCall.function.arguments;
                                const functionToCall = toolImplementations[functionName];

                                if (!functionToCall) {
                                    logger.log(`Tool ${functionName} not found`, 'error');
                                    safeMessages.push({
                                        role: 'tool',
                                        tool_call_id: toolCall.id,
                                        name: functionName,
                                        content: JSON.stringify({ error: `Tool ${functionName} not allowed or missing.` }),
                                    });
                                    continue;
                                }

                                let args = {};
                                try {
                                    if (functionArgs) args = JSON.parse(functionArgs);
                                } catch (e) {
                                    logger.log(`Parse args failed: ${e.message}`, 'error');
                                }

                                // Core: run the tool implementation
                                const toolResult = await functionToCall(args);

                                // 將工具執行結果寫回對話歷史，準備進入下一個迴圈
                                safeMessages.push({
                                    role: 'tool',
                                    tool_call_id: toolCall.id,
                                    name: functionName,
                                    content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
                                });
                            }
                            // continue 迴圈，讓模型閱讀 Tool 結果後決定下一步
                        } else {
                            // 若沒有 tool_calls，代表模型認為資訊已充足，回答完畢，跳出迴圈
                            break;
                        }
                    }
                }

                try {
                    await runAgentLoop();
                } catch (err) {
                    console.error('Agent Loop Error:', err);
                    logData.status = 'error';
                    logData.error_msg = err.message;
                    controller.enqueue(encoder.encode(`\n\n[系統錯誤: ${err.message}]`));
                } finally {
                    logData.tool_used = logData.tool_used.join(',');
                    const duration = (performance.now() - startTime).toFixed(0);
                    logData.duration_ms = parseInt(duration);
                    logData.response_preview = fullResponse.slice(0, 1000);

                    const PRICE_IN = 0.15;
                    const PRICE_OUT = 0.6;
                    const cost =
                        (accumulatedUsage.prompt_tokens / 1e6) * PRICE_IN +
                        (accumulatedUsage.completion_tokens / 1e6) * PRICE_OUT;

                    logData.tokens_input = accumulatedUsage.prompt_tokens;
                    logData.tokens_output = accumulatedUsage.completion_tokens;
                    logData.cost_usd = cost;

                    controller.close();

                    try {
                        await supabaseClient.from('ai_inferences').insert(logData);
                        logger.log('Agent execution logged to DB', 'success');
                    } catch (e) {
                        console.error('Log write failed:', e);
                    }
                }
            },
        });

        return new NextResponse(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    } catch (error) {
        console.error('Fatal Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
