'use client';

import { useState, useCallback } from 'react';
import { useChat } from '@/context/ChatContext';
import { useSettings } from '@/context/SettingsContext';

// 它的工作是「收集材料」。它負責去 React 的各個角落（Context, State）把資料抓過來。
export function useLLM() {
    const [isLoading, setIsLoading] = useState(false);

    const { addMessage, updateStreamMessage, currentMessages, deleteLastMessage, activeId } = useChat();
    const { language, character } = useSettings();

    const streamResponse = useCallback(
        async ({ messages, intent, token }) => {
            setIsLoading(true);

            const config = { language, character };

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        messages,
                        config,
                        sessionId: activeId,
                        allowed_tools: intent == 'query_sekai' ? ['search_knowledge_base'] : [],
                    }),
                });
                if (response.status === 401 || response.status === 403) throw new Error('安全驗證已過期，請重新發送您的訊息。');
                if (!response.ok) throw new Error(response.statusText);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let done = false;

                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) {
                        const chunkValue = decoder.decode(value, { stream: true });
                        updateStreamMessage(chunkValue);
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
            }
        },
        [updateStreamMessage, activeId, language, character],
    );

    const sendMessage = useCallback(
        async (inputContent, intent, tokenFromJudge) => {
            // prevent system prompt injection attack at frontend
            let messages = currentMessages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
            messages.push({ role: 'user', content: `<user_input>${inputContent}</user_input>` });

            await streamResponse({ messages: messages, intent: intent, token: tokenFromJudge });
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
        addMessage({ id: Date.now().toString(), role: 'assistant', content: '', time: new Date().toLocaleTimeString() });

        setIsLoading(true);
        try {
            const judgeRes = await fetch('/api/judge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queryText }),
            });
            if (!judgeRes.ok) throw new Error(`Judge API 發生錯誤: ${judgeRes.status}`);
            const judgeResult = await judgeRes.json();

            await streamResponse({ messages: historyForApi, intent: judgeResult.intent, token: judgeResult.token });
        } catch (err) {
            console.error('[Regenerate Judge Error]', err);
            updateStreamMessage(`\n\n[系統錯誤]: 無法重新驗證請求，請稍後重試 (${err.message})`);
            setIsLoading(false);
        }
    }, [currentMessages, addMessage, deleteLastMessage, streamResponse, updateStreamMessage]);

    return { isLoading, setIsLoading, sendMessage, regenerate };
}
