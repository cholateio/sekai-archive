'use client';

import { useState, useCallback } from 'react';
import { useSettings } from '@/context/SettingsContext';

export function useStatelessLLM() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState('');
    const [agentState, setAgentState] = useState(null);

    const { language, character } = useSettings();

    const generate = useCallback(
        async (message, sessionId = null) => {
            setIsLoading(true);
            setResult(''); // 清空舊結果
            setAgentState('思考中...');

            const config = { language, character };

            try {
                const messages = [{ role: 'user', content: message }];

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages,
                        config,
                        sessionId: `card_${sessionId}`,
                        allowed_tools: ['get_event_border', 'get_event_top100', 'calculate_event_strategy'],
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

                        // 把最後一包可能不完整的 JSON 塞回 buffer 等下一次
                        buffer = chunks.pop();

                        for (const chunk of chunks) {
                            if (!chunk.trim()) continue;

                            try {
                                const parsed = JSON.parse(chunk);

                                switch (parsed.type) {
                                    case 'text':
                                        setResult((prev) => prev + parsed.payload);
                                        setAgentState(null); // 一旦開始產出文字，清空思考狀態
                                        break;
                                    case 'status':
                                        setAgentState(parsed.payload);
                                        break;
                                    case 'tool_start':
                                        // 針對這個 Hook 常用的工具做中文對映
                                        const toolMap = {
                                            get_event_border: '獲取活動分數線',
                                            get_event_top100: '獲取前百名玩家',
                                            calculate_event_strategy: '計算活動策略',
                                        };
                                        setAgentState(`正在${toolMap[parsed.payload.name] || '執行工具'}...`);
                                        break;
                                    case 'tool_end':
                                        setAgentState('分析資料中...');
                                        break;
                                    case 'error':
                                        console.error('[Backend Error]:', parsed.payload);
                                        setResult((prev) => prev + `\n\n[系統錯誤]: ${parsed.payload}`);
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
                    setResult((prev) => prev + `\n\n[Error]: ${errorMsg}`);
                }
            } finally {
                setIsLoading(false);
                setAgentState(null);
            }
        },
        [language, character],
    );

    return { isLoading, agentState, setIsLoading, result, generate };
}
