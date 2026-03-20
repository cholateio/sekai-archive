'use client';

import { useRanking } from '@/context/RankContext';

export default function LiveEventWidget() {
    const { event, loading } = useRanking();

    if (loading || !event?.id) {
        // 你可以回傳一個同樣大小的灰色方塊當作佔位符
        return (
            <div className="relative w-full h-24 overflow-hidden rounded-xl border border-white/10 bg-[#252525] shadow-md animate-pulse">
                <div className="absolute inset-0 bg-white/5" />
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#252525] shadow-md group">
            {/* Banner 圖片區 */}
            <div className="relative w-full h-24 overflow-hidden">
                <img
                    src={`banner/${event.id}.webp`}
                    alt="Event Banner"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />

                {/* 漸層遮罩：加強底部黑色，確保白色文字清楚 */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-90" />
            </div>
        </div>
    );
}
