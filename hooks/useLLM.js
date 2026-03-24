'use client';

import { useState, useCallback } from 'react';
import { useChat } from '@/context/ChatContext';
import { useSettings } from '@/context/SettingsContext';

const JUDGE_FALLBACK_MSG = `關於 **即時榜線與活動數據**，建議您使用**左側選單**中專用的工具查詢。\n\n那裡提供更完整、不被上下文干擾的即時數據！`;

// 它的工作是「收集材料」。它負責去 React 的各個角落（Context, State）把資料抓過來。
export function useLLM() {
    const [isLoading, setIsLoading] = useState(false);
    const [agentState, setAgentState] = useState(null);

    const { addMessage, updateStreamMessage, currentMessages, deleteLastMessage, activeId } = useChat();
    const { language, character } = useSettings();

    const streamResponse = useCallback(
        async ({ messages, intent }) => {
            setIsLoading(true);
            setAgentState('思考中...');

            const config = { language, character };

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages,
                        config,
                        sessionId: activeId,
                        allowed_tools: intent == 'query_sekai' ? ['search_knowledge_base'] : [],
                    }),
                });
                if (!response.ok) throw new Error(response.statusText);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { value, done: doneReading } = await reader.read();
                    if (doneReading) break;

                    if (value) {
                        buffer += decoder.decode(value, { stream: true });
                        const chunks = buffer.split('\n');

                        buffer = chunks.pop();

                        for (const chunk of chunks) {
                            if (!chunk.trim()) continue;

                            try {
                                const parsed = JSON.parse(chunk);

                                switch (parsed.type) {
                                    case 'text':
                                        updateStreamMessage(parsed.payload);
                                        setAgentState(null); // 開始吐出文字，隱藏思考狀態
                                        break;
                                    case 'status':
                                        setAgentState(parsed.payload);
                                        break;
                                    case 'tool_start':
                                        const toolMap = { search_knowledge_base: '搜尋知識庫' };
                                        setAgentState(`正在${toolMap[parsed.payload.name] || '執行工具'}...`);
                                        break;
                                    case 'tool_end':
                                        setAgentState('統整分析中...');
                                        break;
                                    case 'error':
                                        console.error('[Backend Error]:', parsed.payload);
                                        updateStreamMessage(`\n\n[系統錯誤]: ${parsed.payload}`);
                                        setAgentState('發生錯誤');
                                        break;
                                }
                            } catch (err) {
                                console.error('Failed to parse NDJSON chunk:', err, chunk);
                            }
                        }
                    }
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    let errorMsg = err.message;
                    if (errorMsg.includes('network error') || errorMsg.includes('chunked')) {
                        errorMsg = '連線逾時或中斷，請稍後重試';
                    }
                    console.error('[streamResponse Error]', err);
                    updateStreamMessage(`\n\n[系統錯誤]: ${errorMsg}`);
                }
            } finally {
                setIsLoading(false);
                setAgentState(null);
            }
        },
        [updateStreamMessage, activeId, language, character],
    );

    const sendMessage = useCallback(
        async (inputContent, intent) => {
            // prevent system prompt injection attack at frontend
            let messages = currentMessages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
            messages.push({ role: 'user', content: `<user_input>${inputContent}</user_input>` });

            await streamResponse({ messages: messages, intent: intent });
        },
        [currentMessages, streamResponse],
    );

    const regenerate = useCallback(async () => {
        const historyForApi = currentMessages.slice(0, -1);

        const lastUserMsg = historyForApi[historyForApi.length - 1];
        const queryText = lastUserMsg?.content || '';

        if (!queryText) {
            console.error('[Regenerate] 找不到使用者的歷史訊息');
            return;
        }

        deleteLastMessage();

        setIsLoading(true);
        setAgentState('分析意圖中...');

        // create empty bubble before judge
        addMessage({ id: Date.now().toString(), role: 'assistant', content: '', time: new Date().toLocaleTimeString() });

        try {
            const judgeRes = await fetch('/api/judge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queryText }),
            });
            if (!judgeRes.ok) throw new Error(`Judge API 發生錯誤: ${judgeRes.status}`);
            const judgeResult = await judgeRes.json();

            if (judgeResult.intent === 'query_score') {
                updateStreamMessage(JUDGE_FALLBACK_MSG);
                setIsLoading(false);
                setAgentState(null);
                return;
            } else if (judgeResult.intent === 'garbage') {
                updateStreamMessage(judgeResult.reason);
                setIsLoading(false);
                setAgentState(null);
                return;
            }

            await streamResponse({ messages: historyForApi, intent: judgeResult.intent });
        } catch (err) {
            console.error('[Regenerate Judge Error]', err);
            updateStreamMessage(`\n\n[系統錯誤]: 無法重新驗證請求，請稍後重試 (${err.message})`);
            setIsLoading(false);
            setAgentState(null);
        }
    }, [currentMessages, addMessage, deleteLastMessage, streamResponse, updateStreamMessage]);

    return { isLoading, agentState, setAgentState, setIsLoading, sendMessage, regenerate };
}
