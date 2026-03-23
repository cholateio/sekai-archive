import { DebugLogger } from '@/lib/debug-utils';

function formatPlayerCompact(p) {
    if (!p) return '';
    const speed = Math.round(p.last_1h_stats?.speed || 0).toLocaleString();
    const speed_3h = Math.round(p.last_3h_stats?.speed || 0).toLocaleString();
    return `[#${p.rank}] | ${p.score.toLocaleString()} | +${speed} | +${speed_3h}`;
}

export async function getEventTop100({ startRank = 1, endRank = 100 } = {}) {
    const logger = new DebugLogger('TOOL/Ranking');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒強制超時

    try {
        logger.log(`Fetching Top 100 data (Range: ${startRank}-${endRank})...`, 'info');

        // foolproof
        const start = Math.max(1, Math.min(100, startRank));
        const end = Math.max(1, Math.min(100, endRank));
        const finalStart = Math.min(start, end);
        const finalEnd = Math.max(start, end);

        const res = await fetch('https://api.hisekai.org/tw/event/live/top100', {
            next: { revalidate: 60 },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const data = await res.json();

        const fullList = data.top_100_player_rankings;
        const filteredList = fullList.filter((p) => p.rank >= finalStart && p.rank <= finalEnd);
        if (filteredList.length === 0) return `查無資料 (範圍: ${finalStart}-${finalEnd})`;

        const rankingsStr = filteredList.map(formatPlayerCompact).join('\n');

        return `
[系統數據更新時間]: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
[活動名稱]: ${data.name}
[資料範圍]: Rank ${finalStart} - ${finalEnd} (共 ${filteredList.length} 筆)

[榜線列表 (格式: [排名] | 分數 | 時速 | 3h均速)]:
${rankingsStr}

[⚠️ 資料解讀規則 (Data Context)]:
1. 此為篩選後的數據，僅包含第 ${finalStart} 名到第 ${finalEnd} 名。
2. **時速資訊**：此資料包含即時時速 (+xxx) 和 3h均速 (+xxx)。
        `.trim();
    } catch (error) {
        logger.log(`Cannot fetch data: ${error.message}`, 'error');
        return `無法取得榜線資料: ${error.message}`;
    } finally {
        clearTimeout(timeoutId);
    }
}
