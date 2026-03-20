function formatBorderPlayer(p) {
    if (!p) return '';
    // 這裡我們標註 "N/A" 作為時速，保持與 RankingView 表格格式的一致性，或者在 Prompt 中說明
    return `[#${p.rank}] | ${p.score.toLocaleString()} | N/A | N/A`;
}

export async function getEventBorder() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒強制超時

    try {
        console.log('[Tool:Border] Fetching Border data...');

        const res = await fetch('https://api.hisekai.org/tw/event/live/border', {
            next: { revalidate: 60 },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const data = await res.json();

        const borderList = data.border_player_rankings;

        if (!borderList || borderList.length === 0) {
            return '目前沒有榜線數據。';
        }

        const rankingsStr = borderList.map(formatBorderPlayer).join('\n');

        return `
[系統數據更新時間]: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
[活動名稱]: ${data.name}

[特定名次榜線列表 (格式: [排名] | 分數 | 時速 | 24h均速)]:
${rankingsStr}

[⚠️ 資料解讀規則 (Data Context)]:
1. **離散數據**：此列表僅包含特定整數名次 (如 200...)，並非連續排名。
2. **禁止腦補**：絕對禁止自行創造列表中不存在的鄰近名次 (例如列表只有 200名，不可自行生成 199 或 201 名)。
3. **無時速**：此來源不含時速資訊，不含均速資訊，表格中時速欄位請維持 "N/A"。
4. **精確查詢**：若使用者查詢特定名次且存在於列表中，請直接列出該行，不要嘗試提供上下文。
5. **接近查詢**：如果查詢的名次不在數據中，請明確告知並提供現有的最接近參考值。
    `.trim();
    } catch (error) {
        console.error('[Tool:Border Error]', error);
        return `無法取得榜線資料: ${error.message}`;
    } finally {
        clearTimeout(timeoutId);
    }
}
