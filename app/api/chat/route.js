import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { ipAddress } from '@vercel/functions';
import { createClient } from '@supabase/supabase-js';
import { DebugLogger } from '@/lib/debug-utils';
import { allToolDefinitions, toolImplementations } from '@/lib/tools/registry';
import { generateSystemPrompt } from '@/lib/prompts/system';

const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = 'nodejs';
export const maxDuration = 60; // 允許執行最長 60 秒

function normalizeIp(rawIp) {
    if (!rawIp) return 'unknown';
    const first = rawIp.split(',')[0].trim();
    if (first.startsWith('::ffff:')) return first.substring('::ffff:'.length);
    return first;
}

export async function POST(req) {
    const logger = new DebugLogger('API/Chat');
    const startTime = performance.now();
    const rawIp = ipAddress(req) || req.headers.get('x-forwarded-for') || 'unknown';
    const ip = normalizeIp(rawIp);
    const country = req.headers.get('x-vercel-ip-country') || 'unknown';

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
        logger.log(`Chating input: "${queryContent.slice(0, 20)}${queryContent.length > 20 ? '...' : ''}"`, 'info');
        logger.log(`Received tools: ${allowed_tools}`, 'info');

        let logData = {
            ip,
            country,
            session_id: sessionId,
            user_agent: userAgent,
            query_content: queryContent.slice(0, 1000),
            favorite: config?.character || 'Unknown',
            model_used: 'gpt-4.1-mini',
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

                // 這樣前端就能透過 parsed.type 來區分這包資料是文字還是狀態更新
                const sendStreamEvent = (type, payload) => {
                    const chunk = JSON.stringify({ type, payload }) + '\n';
                    controller.enqueue(encoder.encode(chunk));
                };

                async function runAgentLoop() {
                    while (currentStep < MAX_STEPS) {
                        currentStep++;
                        const isLastStep = currentStep === MAX_STEPS;

                        logger.log(`Agent Step ${currentStep}/${MAX_STEPS} started`, 'info');
                        currentStep === 1 ? sendStreamEvent('status', '思考中...') : sendStreamEvent('status', '彙整數據中...');

                        const runner = await openai.chat.completions.create({
                            model: 'gpt-4.1-mini',
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
                                sendStreamEvent('text', delta.content);
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

                                sendStreamEvent('tool_start', { name: functionName }); // tell frontend user is using tools

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

                                await new Promise((resolve) => setTimeout(resolve, 500)); // little bug，先刻意寫死 500ms 讓前端渲染狀態
                                sendStreamEvent('tool_end', { name: functionName });

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
                            logger.log('Sufficient information, complete answer.', 'info');
                            break;
                        }
                    }
                }

                try {
                    await runAgentLoop();
                    sendStreamEvent('status', '完成');
                } catch (err) {
                    logger.log(`Agent Loop Error: ${err.message}`, 'error');
                    logData.status = 'error';
                    logData.error_msg = err.message;
                    sendStreamEvent('error', `系統錯誤: ${err.message}`);
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
                        logger.log(`Log write failed: ${e.message}`, 'error');
                    }
                }
            },
        });

        return new NextResponse(stream, {
            headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
        });
    } catch (error) {
        logger.log(`Fatal Route Error: ${error.message}`, 'error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
