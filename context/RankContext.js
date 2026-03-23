'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const RankingContext = createContext();

async function getLiveBorder() {
    const res = await fetch('https://api.hisekai.org/tw/event/live/border', {
        next: { revalidate: 60 }, // Next.js 快取設定：每 60 秒才更新一次，避免 API 被打爆
    });
    if (!res.ok) return null;
    return res.json();
}

export const getFloorDate = (inputDate = new Date()) => {
    const date = new Date(inputDate);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 10) * 10;
    date.setMinutes(roundedMinutes, 0, 0);
    return date;
};

function generateDateMeta(startAt, endAt) {
    if (!startAt || !endAt) return { columns: [], pages: [] };

    const columns = [];

    const getTaipeiDate = (isoString) => {
        const date = new Date(isoString);
        // 取得該時間在台北的日期字串 (YYYY/MM/DD)
        const taipeiDateStr = date.toLocaleDateString('en-US', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return new Date(taipeiDateStr); // 回傳該日期的 00:00:00 (本地)
    };

    let current = getTaipeiDate(startAt);
    const end = getTaipeiDate(endAt);
    current.setDate(current.getDate() + 1);

    let index = 0;
    // 迴圈：從活動開始日 -> 活動結束日，每一天產生一個欄位
    while (current <= end) {
        // 格式化日期：format like 11/30
        const labelDate = current.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
        });

        columns.push({
            id: `d${index + 1}`, // d1, d2, d3...
            label: `${labelDate} 0h`, // 11/30 0h
            fullDate: new Date(current), // 保存完整日期物件備用
        });

        // 加一天 (開活當天不記)
        current.setDate(current.getDate() + 1);
        index++;
    }

    // 生成 Mobile 分頁 (每 3 天一頁)
    const pages = [];
    const pageSize = 3;
    for (let i = 0; i < columns.length; i += pageSize) {
        const chunk = columns.slice(i, i + pageSize);
        const first = chunk[0].label.split(' ')[0]; // "11/30"
        const last = chunk[chunk.length - 1].label.split(' ')[0]; // "12/02"

        pages.push({
            index: Math.floor(i / pageSize),
            label: `${first} - ${last}`,
            range: [i, i + pageSize], // [0, 3] 用於 array.slice
        });
    }

    return { columns, pages };
}

// Get the stored non-realtime ranking data from my supabase.
export function RankingProvider({ children }) {
    const [rankings, setRankings] = useState([]);
    const [dailyRankings, setDailyRankings] = useState([]);
    const [event, setEvent] = useState([]);
    const [dateMeta, setDateMeta] = useState({ columns: [], pages: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchRankings = async () => {
        try {
            setLoading(true);

            // Get the current event info first
            const eventData = await getLiveBorder();
            setEvent(eventData);

            // dateMeta for calculating default columns for future data on website
            if (eventData?.start_at && eventData?.aggregate_at) {
                const meta = generateDateMeta(eventData.start_at, eventData.aggregate_at);
                setDateMeta(meta);
            }

            // 平行請求：同時抓取「最新即時榜單」與「每日 00:00 歷史趨勢」
            const [currentRankingRes, dailyHistoryRes] = await Promise.all([
                supabase.from('view_all_ranking_report').select('*').order('rank', { ascending: true }),
                supabase.from('view_day_ranking_report').select('*').order('rank', { ascending: true }),
            ]);

            setRankings(currentRankingRes.data || []);
            setDailyRankings(dailyHistoryRes.data);
            setLastUpdated(getFloorDate());
            setError(null);
        } catch (err) {
            console.error('Context Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRankings();
    }, []);

    return (
        <RankingContext.Provider
            value={{ rankings, dailyRankings, event, dateMeta, loading, error, lastUpdated, refetch: fetchRankings }}
        >
            {children}
        </RankingContext.Provider>
    );
}

export function useRanking() {
    return useContext(RankingContext);
}
