'use client';

import { useChat } from '@/context/ChatContext';
import WelcomeScreen from './WelcomeScreen';
import MessageBubble from './MessageBubble';
import { useAutoScroll } from '@/hooks/useAutoScroll';

export default function MessageList({ messages, isLoading, onRegenerate }) {
    const { scrollRef, bottomRef } = useAutoScroll(messages);
    const { deleteMessage } = useChat();

    if (!messages || messages.length === 0) {
        return <WelcomeScreen />;
    }

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
            <div className="mx-auto max-w-3xl space-y-8 py-4">
                {messages.map((m, i) => (
                    <MessageBubble
                        key={m.id || i}
                        message={m}
                        isLast={i === messages.length - 1}
                        isLoading={isLoading}
                        onRegenerate={onRegenerate}
                        onDelete={() => deleteMessage(i)}
                    />
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
