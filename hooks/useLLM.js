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
        async ({ messages }) => {
            setIsLoading(true);

            const config = { language, character };

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages, config, sessionId: activeId }),
                    allowed_tools: [],
                });
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
        async (inputContent) => {
            // prevent system prompt injection attack at frontend
            let messages = currentMessages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
            messages.push({ role: 'user', content: `<user_input>${inputContent}</user_input>` });

            await streamResponse({ messages: messages });
        },
        [currentMessages, streamResponse],
    );

    const regenerate = useCallback(async () => {
        // 邏輯：拿目前的紀錄，去掉最後一則，不需要等 React 更新 State
        const historyForApi = currentMessages.slice(0, -1);

        deleteLastMessage();

        // UI 動作：馬上補一個空的 Assistant 訊息 (讓串流有地方寫入)
        addMessage({ id: Date.now().toString(), role: 'assistant', content: '', time: new Date().toLocaleTimeString() });

        await streamResponse({ messages: historyForApi });
    }, [currentMessages, addMessage, deleteLastMessage, streamResponse]);

    return { isLoading, sendMessage, regenerate };
}
