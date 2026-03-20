'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, X, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStatelessLLM } from '@/hooks/useStatelessLLM';
import { usePreprocess } from '@/hooks/usePreprocess';
import { useMonitor } from '@/context/MonitorContext';
import { cn } from '@/lib/utils';
import PromptBox from '../PromptBox';
import WarningModal from '../WarningModal';

const NOTICE = `
- 此區問答不會參考上下文，詢問時請打出完整問題。
- 此區追分/防守分析僅支援 100 名內，其餘名次僅能查詢分數。
- 玩家首次進 T100 時，會判讀他剛上 T100 的總分和時速，數值可能偏大，非數據錯誤。
`;

export default function RankingView() {
    const { cards, addCard, updateCard, removeCard } = useMonitor();
    const { generate, isLoading, result } = useStatelessLLM();
    const [input, setInput] = useState('');
    const [activeCardId, setActiveCardId] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [warningMsg, setWarningMsg] = useState('');
    const [isChecking, setIsChecking] = useState(false); // 專門給 Judge 用的 loading
    const { validateInput } = usePreprocess();
    const bottomRef = useRef(null);

    // Add default card when init
    useEffect(() => {
        if (cards.length === 0) {
            const noticeCard = {
                id: 'notice',
                title: '⚡ 注意事項',
                prompt: '',
                content: NOTICE,
                isLoading: false,
                timestamp: null,
            };
            const defaultCard = {
                id: 'default-ranking-100',
                title: '第 100 名分數多少?',
                prompt: '目前的第 100 名分數是多少？請使用 get_event_top100',
                content: '',
                isLoading: false,
                timestamp: null,
            };
            addCard(noticeCard);
            addCard(defaultCard);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeCardId && result) {
            updateCard(activeCardId, { content: result });
        }
    }, [result, activeCardId, updateCard]);

    // Loading 結束處理
    useEffect(() => {
        if (!isLoading && activeCardId) {
            updateCard(activeCardId, { isLoading: false, timestamp: new Date() });
            setActiveCardId(null);
        }
    }, [isLoading, activeCardId, updateCard]);

    // --- 自動捲動邏輯 (Auto Scroll) ---
    useEffect(() => {
        if (cards.length > 0 && activeCardId) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [cards.length, activeCardId, result]);

    const handleQuery = async (e) => {
        e?.preventDefault();
        if (isLoading || isChecking) return;

        // Quick check if input is valid
        if (!validateInput(input)) {
            setInput('');
            setWarningMsg(inputError);
            setShowWarning(true);
            return;
        }
        const queryText = input;
        setInput('');

        // Call judge agent for intent check
        setIsChecking(true);
        try {
            const judgeRes = await fetch('/api/judge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queryText: queryText.trim().slice(0, 30) }),
            });
            const judgeResult = await judgeRes.json();

            if (judgeResult.intent != 'query_score') {
                setWarningMsg(judgeResult.reason); // (Optional: 顯示被拒原因)
                setShowWarning(true);
                setIsChecking(false);
                return; // 直接中斷，不建立卡片
            }
        } catch (err) {
            console.error('[ChatWindow] Router check failed: ', err);
            setWarningMsg('System error, please try again later.');
            setShowWarning(true);
            setIsChecking(false);
            return; // 直接中斷，不建立卡片
        }
        setIsChecking(false);

        // Finish judge, creating card and ask for score api
        const cardTitle = queryText.length > 20 ? queryText.slice(0, 20) + '...' : queryText;

        const newId = Date.now().toString();
        const newCard = {
            id: newId,
            title: cardTitle,
            prompt: queryText,
            content: '',
            isLoading: true,
            timestamp: new Date(),
        };

        addCard(newCard);
        setActiveCardId(newId);
        generate(queryText, newId);
    };

    const handleRefreshCard = (e, card) => {
        e.stopPropagation();
        if (isLoading || card.id === 'notice') return;

        const newId = Date.now().toString();
        const newCard = {
            ...card,
            id: newId,
            content: '',
            isLoading: true,
            timestamp: new Date(),
        };

        // 先刪除舊卡片，再新增新卡片
        removeCard(card.id);
        addCard(newCard);

        setActiveCardId(newId);
        generate(card.prompt, newId);
    };

    const handleDeleteCard = (e, cardId) => {
        e.stopPropagation();
        removeCard(cardId);
    };

    return (
        <div className="flex flex-col h-full w-full relative bg-[#212121]">
            <WarningModal isOpen={showWarning} onClose={() => setShowWarning(false)} message={warningMsg} />
            {/* --- 內容顯示區 (Top) --- */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 border border-dashed border-white/10 rounded-xl mx-auto w-full max-w-lg opacity-50">
                        <p className="text-sm font-mono">NO ACTIVE MONITORS</p>
                    </div>
                ) : (
                    // --- Masonry Layout ---
                    <div className="columns-1 xl:columns-2 gap-4 space-y-4 pb-4">
                        {cards.map((card) => (
                            <div
                                key={card.id}
                                className={cn(
                                    // break-inside-avoid 防止卡片被切斷
                                    'break-inside-avoid group relative flex flex-col rounded-lg transition-all duration-200',
                                    'bg-transparent border border-white/20 hover:border-white/40',
                                    card.isLoading && 'border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.1)]',
                                )}
                            >
                                <div className="p-4 flex flex-col h-full">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between mb-3 shrink-0">
                                        <div className="flex items-center gap-2 text-cyan-400">
                                            {card.isLoading ? (
                                                <RefreshCw className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <div
                                                    className={cn(
                                                        'h-1.5 w-1.5 rounded-full',
                                                        card.content ? 'bg-cyan-500' : 'bg-gray-600',
                                                    )}
                                                />
                                            )}
                                            <span className="text-xs font-bold font-mono uppercase tracking-wider opacity-90 text-gray-100">
                                                {card.title}
                                            </span>
                                        </div>

                                        {/* Actions (Hover Only) */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleRefreshCard(e, card)}
                                                disabled={isLoading}
                                                className="text-gray-500 hover:text-cyan-400 transition-colors"
                                                title="Refresh"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteCard(e, card.id)}
                                                className="text-gray-500 hover:text-red-400 transition-colors"
                                                title="Close"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div
                                        className={cn(
                                            'text-sm text-gray-200 leading-relaxed font-sans min-h-[60px]',
                                            'max-h-[600px] overflow-y-auto pr-2',
                                            '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20',
                                        )}
                                    >
                                        {card.content ? (
                                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-gray-100 prose-headings:text-xs prose-headings:font-bold prose-headings:uppercase prose-strong:text-cyan-300 prose-table:w-full prose-table:text-left prose-th:text-gray-400 prose-th:font-normal prose-td:text-gray-300 prose-td:py-1">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.content}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            // Empty State (Idle)
                                            <div
                                                className="flex flex-col items-center justify-center h-20 text-gray-600 space-y-2 cursor-pointer"
                                                onClick={(e) => handleRefreshCard(e, card)}
                                            >
                                                {card.isLoading ? (
                                                    <span className="animate-pulse font-mono text-xs">FETCHING DATA...</span>
                                                ) : (
                                                    <>
                                                        <Activity className="h-5 w-5 opacity-50" />
                                                        <span className="text-[10px] font-mono opacity-50">
                                                            CLICK TO RUN QUERY
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Timestamp */}
                                    {card.timestamp && !card.isLoading && (
                                        <div className="mt-3 shrink-0 text-[10px] text-gray-200 font-mono text-right opacity-60">
                                            {new Date(card.timestamp).toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {/* 隱藏的錨點 */}
                <div ref={bottomRef} className="w-full h-px" />
            </div>

            <div className="shrink-0 w-full bg-[#212121]">
                <PromptBox input={input} setInput={setInput} onSubmit={handleQuery} disabled={isLoading || isChecking} />
            </div>
        </div>
    );
}
