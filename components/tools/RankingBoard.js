'use client';

import { useState, useMemo } from 'react';
import { useRanking } from '@/context/RankContext';
import { motion } from 'framer-motion';
import RankingLayout from './RankingLayout';

// --- 輔助函式 ---
const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat('en-US').format(num);
};

// --- 設定數據 ---
const TIER_BORDERS = new Set([50, 100, 200, 500, 1000, 5000, 10000]);

const RANK_GROUPS = [
    { id: 'top', label: 'TOP 1 - 10', range: [0, 10] },
    { id: 'mid', label: '# 20 ~ 200', range: [10, 20] },
    { id: 'low', label: '# 300 ~ 10000', range: [20, 30] },
];

const COLUMNS = [
    { id: 'd1', label: 'Points', key: 'current_score', color: 'text-yellow-400 font-bold' },
    { id: 'd2', label: '1Hr Speed', key: 'last_1h_speed', color: 'text-gray-200' },
    { id: 'd3', label: '3Hr Speed', key: 'last_3h_speed' },
    { id: 'd4', label: '24Hr Speed', key: 'last_24h_speed' },
    { id: 'd5', label: 'Avg', key: 'overall_speed', color: 'text-gray-200' },
    { id: 'd6', label: 'MAX Speed', key: 'max_speed' },
];

const MOBILE_DATE_PAGES = [
    { index: 0, label: 'Base Data', range: [0, 3] },
    { index: 1, label: 'Additional Data', range: [3, 6] },
];

export default function RankingBoard() {
    const { rankings, event, loading, error, lastUpdated, refetch } = useRanking();
    const [activeRankGroupId, setActiveRankGroupId] = useState('top');
    const [mobileDatePageIndex, setMobileDatePageIndex] = useState(0);

    const currentRows = useMemo(() => {
        if (!rankings) return [];
        const group = RANK_GROUPS.find((g) => g.id === activeRankGroupId);
        if (!group) return [];
        return rankings.slice(group.range[0], group.range[1]);
    }, [rankings, activeRankGroupId]);

    const currentMobileDateRange = MOBILE_DATE_PAGES[mobileDatePageIndex];

    const getRankStyle = (rank) => {
        if (rank <= 3) return 'text-lg text-yellow-500';
        if (TIER_BORDERS.has(rank))
            return 'text-base lg:text-lg text-fuchsia-400 font-bold drop-shadow-[0_0_5px_rgba(232,121,249,0.3)]';
        return 'text-base text-gray-400';
    };

    // --- 使用 Layout 元件包裹內容 ---
    return (
        <RankingLayout
            event={event}
            loading={loading}
            error={error}
            refetch={refetch}
            rankGroups={RANK_GROUPS}
            activeRankGroupId={activeRankGroupId}
            setActiveRankGroupId={setActiveRankGroupId}
            mobileDatePages={MOBILE_DATE_PAGES}
            mobileDatePageIndex={mobileDatePageIndex}
            setMobileDatePageIndex={setMobileDatePageIndex}
        >
            {/* Desktop Header : Rank - Data - Rank */}
            <div className="grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] lg:grid-cols-[4rem_repeat(6,minmax(0,1fr))_4rem] gap-0 lg:gap-2 px-4 lg:px-6 py-4 lg:py-5 border-b border-white/5 bg-[#212121]/80 backdrop-blur-sm text-sm text-gray-400 font-mono uppercase tracking-tighter lg:tracking-widest sticky top-0 z-30">
                <div className="flex items-center justify-center font-bold border-r border-white/10 lg:border-none">Rank</div>

                {COLUMNS.map((col, index) => {
                    const isVisibleOnMobile = index >= currentMobileDateRange.range[0] && index < currentMobileDateRange.range[1];
                    return (
                        <div
                            key={col.id}
                            className={`text-center font-bold flex items-center justify-center ${
                                isVisibleOnMobile ? 'block' : 'hidden'
                            } lg:block`}
                        >
                            <span className="lg:hidden">{col.label.split(' ')[0]}</span>
                            <span className="hidden lg:inline">{col.label}</span>
                        </div>
                    );
                })}

                <div className="hidden lg:flex items-center justify-center font-bold">Rank</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <motion.div
                    key={activeRankGroupId + mobileDatePageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col"
                >
                    {currentRows.map((row) => (
                        <div
                            key={row.rank}
                            className="grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] lg:grid-cols-[4rem_repeat(6,minmax(0,1fr))_4rem] gap-0 lg:gap-2 items-center px-4 lg:px-6 py-4 lg:py-4.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                            <div className="flex justify-center border-r border-white/5 lg:border-none h-full items-center">
                                <span className={`font-mono font-bold text-sm text-center ${getRankStyle(row.rank)}`}>
                                    {row.rank}
                                </span>
                            </div>

                            {COLUMNS.map((col, index) => {
                                const isVisibleOnMobile =
                                    index >= currentMobileDateRange.range[0] && index < currentMobileDateRange.range[1];
                                const value = row[col.key];
                                const activeColor = col.color || 'text-gray-500';

                                return (
                                    <div
                                        key={col.id}
                                        className={`text-center truncate px-1 ${isVisibleOnMobile ? 'block' : 'hidden'} lg:block`}
                                    >
                                        <div className={`text-xs lg:text-sm tracking-tight font-mono ${activeColor}`}>
                                            {formatNumber(value)}
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="hidden lg:flex justify-center border-l border-white/5 lg:border-none h-full items-center">
                                <span className={`font-mono font-bold text-sm text-center ${getRankStyle(row.rank)}`}>
                                    {row.rank}
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {lastUpdated && (
                    <span className="w-full mt-2 flex justify-center items-center text-xs text-gray-500 font-mono pb-4">
                        Updated/5 min: {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
            </div>
        </RankingLayout>
    );
}
