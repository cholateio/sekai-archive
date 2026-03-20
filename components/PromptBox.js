'use client';

import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreprocess } from '@/hooks/usePreprocess';

export default function PromptBox({ input, setInput, onSubmit, disabled }) {
    const { inputError, clearError } = usePreprocess();

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e);
        }
    };

    return (
        <div className="w-full bg-[#212121] pb-10 pt-4">
            <div className="mx-auto max-w-3xl px-4">
                <div className="relative flex items-center justify-center gap-2 rounded-[26px] bg-[#2F2F2F] p-2 focus-within:ring-1 focus-within:ring-gray-500 transition-all">
                    <form onSubmit={onSubmit} className="flex-1 min-w-0">
                        <textarea
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                if (inputError) clearError();
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter your questions."
                            disabled={disabled}
                            rows={1}
                            className="w-full resize-none bg-transparent ml-2 px-2 py-3 text-white placeholder-gray-500 focus:outline-none min-h-11 max-h-[200px] disabled:opacity-50 text-sm leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        />
                    </form>

                    <button
                        onClick={onSubmit}
                        disabled={!input.trim() || disabled}
                        className={cn(
                            'mr-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                            input.trim() && !disabled
                                ? 'bg-white text-black hover:bg-gray-200'
                                : 'bg-transparent text-gray-500 cursor-not-allowed',
                        )}
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">AI content may be inaccurate.</div>
            </div>
        </div>
    );
}
