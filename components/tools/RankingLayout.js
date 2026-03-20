'use client';

import { motion } from 'framer-motion';
import { RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import ProgressBar from '../ProgressBar';

export default function RankingTableLayout({
    // 資料與狀態
    event,
    loading,
    error,
    refetch,
    // Tab 設定
    rankGroups,
    activeRankGroupId,
    setActiveRankGroupId,
    // Mobile 分頁設定 (Optional)
    mobileDatePages = [],
    mobileDatePageIndex = 0,
    setMobileDatePageIndex = () => {},
    // 內容 (表格本體)
    children,
}) {
    if (loading)
        return (
            <div className="flex h-full items-center justify-center text-gray-500 text-xs tracking-widest animate-pulse">
                SYNCING DATA...
            </div>
        );
    if (error) return <div className="flex h-full items-center justify-center text-red-400 text-xs">CONNECTION FAILED</div>;

    const currentMobileDateRange = mobileDatePages[mobileDatePageIndex];

    return (
        <div className="flex flex-col h-full w-full bg-[#212121] overflow-hidden font-sans">
            {/* Header Area */}
            <header className="flex-none flex flex-col bg-[#212121] z-20 border-b border-white/5">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-12">
                        <h2 className="text-base font-bold text-gray-100 tracking-wider flex items-center gap-6">
                            {event?.name || 'Event Data'}
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        </h2>
                        <ProgressBar />
                    </div>
                    {/* Refresh Button */}
                    <button
                        onClick={refetch}
                        className="absolute right-4 top-2 lg:static group p-2 rounded-md hover:bg-white/5 text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                        <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                    </button>
                </div>

                {/* Rank Group Tabs */}
                <div className="flex items-center w-full px-2 border-t border-white/5">
                    {rankGroups.map((group) => {
                        const isActive = activeRankGroupId === group.id;
                        return (
                            <button
                                key={group.id}
                                onClick={() => setActiveRankGroupId(group.id)}
                                className="relative py-3 flex-1 flex justify-center group cursor-pointer"
                            >
                                <div
                                    className={`flex items-center gap-2 text-xs lg:text-sm font-medium transition-colors ${
                                        isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                                    }`}
                                >
                                    <span className="font-mono tracking-wide">{group.label}</span>
                                </div>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabUnderline"
                                        className={`absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {mobileDatePages.length > 0 && (
                    <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-[#212121] border-t border-dashed border-white/10">
                        <button
                            disabled={mobileDatePageIndex === 0}
                            onClick={() => setMobileDatePageIndex((prev) => Math.max(0, prev - 1))}
                            className="p-1 text-gray-400 disabled:opacity-20 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 tracking-widest">
                            <span>{currentMobileDateRange?.label}</span>
                        </div>

                        <button
                            disabled={mobileDatePageIndex === mobileDatePages.length - 1}
                            onClick={() => setMobileDatePageIndex((prev) => Math.min(mobileDatePages.length - 1, prev + 1))}
                            className="p-1 text-gray-400 disabled:opacity-20 hover:text-white transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </header>

            {/* Content Area (Table) */}
            <div className="flex-1 flex flex-col overflow-hidden relative">{children}</div>
        </div>
    );
}
