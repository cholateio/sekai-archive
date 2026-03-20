'use client';

import { useState, useCallback } from 'react';
import { useSettings } from '@/context/SettingsContext';

export function useStatelessLLM() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState('');

    const { language, character } = useSettings();

    const generate = useCallback(
        async (message, sessionId = null) => {
            setIsLoading(true);
            setResult(''); // 清空舊結果

            const config = { language, character };

            try {
                const messages = [{ role: 'user', content: message }];

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages, config, sessionId: `card_${sessionId}` }),
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

    return { isLoading, result, generate };
}
