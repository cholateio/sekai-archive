'use client';

import { useState, useCallback } from 'react';
import { useSettings } from '@/context/SettingsContext';

export function useStatelessLLM() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState('');

    const { language, character } = useSettings();

    const generate = useCallback(
        async (message, sessionId = null, token = null) => {
            setIsLoading(true);
            setResult(''); // 清空舊結果

            const config = { language, character };

            if (!token) {
                try {
                    const judgeRes = await fetch('/api/judge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ queryText: message.trim() }),
                    });
                    const judgeResult = await judgeRes.json();
                    token = judgeResult.token;
                } catch (err) {
                    console.error('[Token Refresh Error]', err);
                    setResult(`\n\n[系統錯誤]: 無法重新驗證請求，請稍後重試 (${err.message})`);
                    setIsLoading(false);
                    return; // 中斷執行
                }
            }

            try {
                const messages = [{ role: 'user', content: message }];

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        messages,
                        config,
                        sessionId: `card_${sessionId}`,
                        allowed_tools: ['get_event_border', 'get_event_top100', 'calculate_event_strategy'],
                    }),
                });
                if (response.status === 401 || response.status === 403) throw new Error('安全驗證已過期，請重新發送您的請求。');
                if (!response.ok) throw new Error(response.statusText);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let done = false;

                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) {
                        const chunkValue = decoder.decode(value, { stream: true });
                        setResult((prev) => prev + chunkValue);
                    }
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    let errorMsg = err.message;
                    if (errorMsg.includes('network error') || errorMsg.includes('chunked')) {
                        errorMsg = '連線逾時或中斷，請稍後重試';
                    }
                    console.error('[streamResponse Error]', err);
                    setResult((prev) => prev + `\n\n[Error]: ${errorMsg}`);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [language, character],
    );

    return { isLoading, setIsLoading, result, generate };
}
