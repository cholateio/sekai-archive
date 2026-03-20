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
    { id: 'top', label: 'TOP 1 - 10', ranks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { id: 'mid', label: '# 20 ~ 200', ranks: [20, 30, 40, 50, 60, 70, 80, 90, 100, 200] },
    { id: 'low', label: '# 300 ~ 10000', ranks: [300, 400, 500, 1000, 1500, 2000, 2500, 3000, 5000, 10000] },
];

export default function RankingDaily() {
    const { dailyRankings, event, dateMeta, loading, error, refetch } = useRanking();
    const [activeRankGroupId, setActiveRankGroupId] = useState('top');
    const [mobileDatePageIndex, setMobileDatePageIndex] = useState(0);

    const currentRows = useMemo(() => {
        const group = RANK_GROUPS.find((g) => g.id === activeRankGroupId);
        console.log(group);
        if (!dailyRankings) return [];
        return dailyRankings.filter((row) => group.ranks.includes(row.rank));
    }, [dailyRankings, activeRankGroupId]);

    const currentMobileDateRange = dateMeta.pages[mobileDatePageIndex];

    const getRankStyle = (rank) => {
        if (rank <= 3) return 'text-lg text-yellow-500';
        if (TIER_BORDERS.has(rank))
            return 'text-base lg:text-lg text-fuchsia-400 font-bold drop-shadow-[0_0_5px_rgba(232,121,249,0.3)]';
        return 'text-base text-gray-400';
    };

    const gridStyle = {
        '--daily-cols': `4rem repeat(${dateMeta.columns.length}, minmax(0, 1fr)) 4rem`,
    };

    // --- 使用 Layout 元件 ---
    return (
        <RankingLayout
            event={event}
            loading={loading}
            error={error}
            refetch={refetch}
            rankGroups={RANK_GROUPS}
            activeRankGroupId={activeRankGroupId}
            setActiveRankGroupId={setActiveRankGroupId}
            mobileDatePages={dateMeta.pages}
            mobileDatePageIndex={mobileDatePageIndex}
            setMobileDatePageIndex={setMobileDatePageIndex}
        >
            <div
                style={gridStyle}
                className={`grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] lg:grid-cols-(--daily-cols) gap-0 lg:gap-2 px-4 lg:px-6 py-4 lg:py-5 border-b border-white/5 bg-[#212121]/80 backdrop-blur-sm text-[10px] lg:text-sm text-gray-400 font-mono uppercase tracking-tighter lg:tracking-widest sticky top-0 z-30`}
            >
                <div className="flex items-center justify-center font-semibold border-r border-white/10 lg:border-none">Rank</div>

                {dateMeta.columns.map((col, index) => {
                    const isVisibleOnMobile = index >= currentMobileDateRange.range[0] && index < currentMobileDateRange.range[1];
                    return (
                        <div
                            key={col.id}
                            className={`text-center font-semibold flex items-center justify-center ${
                                isVisibleOnMobile ? 'block' : 'hidden'
                            } lg:block`}
                        >
                            <span className="lg:hidden">{col.label.split(' ')[0]}</span>
                            <span className="hidden lg:inline">{col.label}</span>
                        </div>
                    );
                })}

                <div className="hidden lg:flex items-center justify-center font-semibold border-l border-white/10 lg:border-none">
                    Rank
                </div>
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
                            style={gridStyle}
                            className={`grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] lg:grid-cols-(--daily-cols) gap-0 lg:gap-2 items-center px-4 lg:px-6 py-4 lg:py-4.5 hover:bg-white/3 transition-colors border-b border-white/5 last:border-0`}
                        >
                            <div className="flex justify-center border-r border-white/5 lg:border-none h-full items-center">
                                <span className={`font-mono font-bold text-sm text-center ${getRankStyle(row.rank)}`}>
                                    {row.rank}
                                </span>
                            </div>

                            {dateMeta.columns.map((col, index) => {
                                const isVisibleOnMobile =
                                    index >= currentMobileDateRange.range[0] && index < currentMobileDateRange.range[1];
                                const score = row.scores[index];
                                const hasScore = score !== undefined && score !== null;

                                return (
                                    <div
                                        key={col.id}
                                        className={`text-center truncate px-1 ${isVisibleOnMobile ? 'block' : 'hidden'} lg:block`}
                                    >
                                        <div
                                            className={`text-[11px] lg:text-sm tracking-tight font-mono ${
                                                hasScore ? 'text-gray-300' : 'text-gray-700'
                                            }`}
                                        >
                                            {formatNumber(score)}
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

                <span className="w-full mt-2 flex justify-center items-center text-xs text-gray-500 font-mono pb-4">
                    Updated daily at 00:00
                </span>
            </div>
        </RankingLayout>
    );
}
