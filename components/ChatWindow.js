'use client';

import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { useLLM } from '@/hooks/useLLM';
import { usePreprocess } from '@/hooks/usePreprocess';
import MessageList from './MessageList';
import PromptBox from './PromptBox';

const JUDGE_FALLBACK_MSG = `關於 **即時榜線與活動數據**，建議您使用**左側選單**中專用的工具查詢。\n\n那裡提供更完整、不被上下文干擾的即時數據！`;

export default function ChatWindow() {
    const [input, setInput] = useState('');
    const { currentMessages, addMessage } = useChat();
    const { isLoading, setIsLoading, sendMessage, regenerate, agentState } = useLLM();
    const { inputError, validateInput } = usePreprocess();

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (isLoading) return;

        // Quick check if input is valid
        if (!validateInput(input)) {
            setInput('');
            alert(inputError);
            return;
        }
        const queryText = input.trim();
        setInput('');

        // First add user's message into chat room window
        addMessage({
            id: Date.now().toString(),
            role: 'user',
            content: queryText,
            time: new Date().toLocaleTimeString(),
        });

        // Call judge agent for intent check
        setIsLoading(true);
        try {
            const judgeRes = await fetch('/api/judge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queryText: queryText }),
            });
            const judgeResult = await judgeRes.json();

            setIsLoading(false);

            let robotMessage = { id: (Date.now() + 1).toString(), role: 'assistant', time: new Date().toLocaleTimeString() };
            if (judgeResult.intent == 'query_score') {
                addMessage({
                    ...robotMessage,
                    content: JUDGE_FALLBACK_MSG,
                });
            } else if (judgeResult.intent == 'garbage') {
                addMessage({
                    ...robotMessage,
                    content: judgeResult.reason,
                });
            } else {
                // Create an empty assistant message in the UI and prepare to receive the stream
                addMessage({ ...robotMessage, content: '' });
                sendMessage(queryText, judgeResult.intent);
            }
        } catch (err) {
            console.error('[ChatWindow] Router check failed: ', err);
            addMessage({
                ...robotMessage,
                content: 'System error, please try again later.',
                time: new Date().toLocaleTimeString(),
            });
        }
    };

    return (
        <div className="relative flex flex-1 flex-col h-full bg-[#212121]">
            <MessageList messages={currentMessages} isLoading={isLoading} agentState={agentState} onRegenerate={regenerate} />

            <PromptBox
                input={input}
                setInput={setInput}
                onSubmit={handleSubmit}
                disabled={isLoading} // 當 AI 思考中時，暫時禁止輸入
            />
        </div>
    );
}
