import { DebugLogger } from '@/lib/debug-utils';

/**
 * 格式化時間顯示 (小數點轉時分)
 */
function formatHours(hours) {
    if (!isFinite(hours)) return '永遠不會';
    if (hours < 0) return '已超越/已落後';
    if (hours > 240) return '> 10 天';

    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0 && m === 0) return '即將';
    return `${h}小時 ${m}分`;
}

export async function calculateEventStrategy({ mode, currentRank, targetRank, currentScoreOverride }) {
    const logger = new DebugLogger('TOOL/Strategy');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒強制超時

    try {
        logger.log(`Mode: ${mode} | Rank: ${currentRank} -> ${targetRank}`, 'info');

        // 獲取即時榜單數據
        const res = await fetch('https://api.hisekai.org/tw/event/live/top100', {
            next: { revalidate: 60 },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error('無法取得即時榜單數據');

        const data = await res.json();
        const rankings = data.top_100_player_rankings;

        // 🟢 FIX: 獲取活動結束時間並計算剩餘時間
        // 根據指示使用 aggregate_at 作為活動時間，若 API 欄位不同請在此調整 (如 data.end_at)
        const eventEndTime = new Date(data.aggregate_at);
        const now = new Date();
        const msRemaining = eventEndTime - now;
        const hoursRemaining = msRemaining > 0 ? msRemaining / 1000 / 60 / 60 : 0;
        const timeRemainingStr = msRemaining > 0 ? formatHours(hoursRemaining) : '已結束';

        // 獲取使用者數據
        const myData = rankings.find((p) => p.rank === currentRank);
        const myScore = currentScoreOverride || myData?.score;
        const mySpeed = Math.floor(myData?.last_1h_stats?.speed || 0);

        if (!myScore) return `無法計算：找不到您的名次 #${currentRank} 且未提供目前分數。`;

        let output = '';
        const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

        output += `### 📊 戰略分析報告 (The Strategist)\n`;
        output += `**狀態**: #${currentRank} | 時速 ${mySpeed.toLocaleString()} | ${timestamp.split(' ')[1]}更新\n`;
        output += `**活動剩餘**: ${timeRemainingStr} ⏳\n\n`; // 顯示剩餘時間

        if (msRemaining <= 0) {
            return output + `⚠️ **活動已結束**，無法進行策略分析。`;
        }

        // 定義分析區間
        let opponents = [];

        if (mode === 'attack') {
            const startRank = Math.max(1, targetRank - 2);
            const endRank = Math.min(100, targetRank + 2);
            output += `⚔️ **進攻區間 (#${startRank} - #${endRank})**\n\n`;
            opponents = rankings.filter((p) => p.rank >= startRank && p.rank <= endRank && p.rank !== currentRank);
            opponents.sort((a, b) => a.rank - b.rank);
        } else {
            const startRank = Math.max(1, targetRank - 5);
            const endRank = Math.min(100, targetRank);
            output += `🛡️ **防守區間 (#${startRank} - #${endRank})**\n\n`;
            opponents = rankings.filter((p) => p.rank >= startRank && p.rank <= endRank && p.rank !== currentRank);
            opponents.sort((a, b) => a.rank - b.rank);
        }

        // 4. 生成矩陣表格 (含截止時間判斷)
        if (mode === 'attack') {
            // Attack Mode
            output += `| 名次 | 對方時速 | 與你差距 | 預計追上時間 |\n`;
            output += `| :--- | :--- | :--- | :--- |\n`;

            for (const op of opponents) {
                const opSpeed = Math.floor(op.last_1h_stats?.speed || 0);
                const gap = op.score - myScore;
                const relativeSpeed = mySpeed - opSpeed;

                let timeToCatchStr = '';

                if (gap <= 0) {
                    timeToCatchStr = '已超越 🟢';
                } else if (relativeSpeed <= 0) {
                    timeToCatchStr = '無法追上 🔴';
                } else {
                    const hoursNeeded = gap / relativeSpeed;

                    // 🟢 截止時間判斷 (Attack)
                    if (hoursNeeded > hoursRemaining) {
                        timeToCatchStr = `來不及 🔴 (${formatHours(hoursNeeded)})`;
                    } else {
                        timeToCatchStr = `**${formatHours(hoursNeeded)}** ⚡`;
                    }
                }

                output += `| #${op.rank} | ${opSpeed.toLocaleString()} | ${gap.toLocaleString()} | ${timeToCatchStr} |\n`;
            }
        } else {
            // Defense Mode
            output += `| 名次 | 對方時速 | 領先差距 | 停手被追上 | 維持時速被追上 |\n`;
            output += `| :--- | :--- | :--- | :--- | :--- |\n`;

            for (const op of opponents) {
                const opSpeed = Math.floor(op.last_1h_stats?.speed || 0);
                const buffer = myScore - op.score;

                // 情境 A: 停手 (AFK)
                let timeToDieStop = '不會';
                if (buffer < 0) {
                    timeToDieStop = '已輸 🔴';
                } else if (opSpeed > 0) {
                    const hours = buffer / opSpeed;
                    // 🟢 截止時間判斷 (Defense)
                    // 如果被追上的時間 > 剩餘時間，代表活動結束前他追不上 -> 安全
                    if (hours > hoursRemaining) {
                        timeToDieStop = '安全 🟢';
                    } else {
                        timeToDieStop = formatHours(hours);
                    }
                }

                // 情境 B: 維持目前時速 (Active)
                let timeToDieActive = '不會';
                const chaserRelativeSpeed = opSpeed - mySpeed;

                if (buffer < 0) {
                    timeToDieActive = '已輸 🔴';
                } else if (chaserRelativeSpeed > 0) {
                    const hours = buffer / chaserRelativeSpeed;
                    // 🟢 截止時間判斷
                    if (hours > hoursRemaining) {
                        timeToDieActive = '安全 🟢';
                    } else {
                        timeToDieActive = `**${formatHours(hours)}** ⚠️`;
                    }
                } else {
                    timeToDieActive = '安全 🟢';
                }

                output += `| #${
                    op.rank
                } | ${opSpeed.toLocaleString()} | ${buffer.toLocaleString()} | ${timeToDieStop} | ${timeToDieActive} |\n`;
            }
        }

        if (mode === 'defense') {
            output += `\n*註: 「安全」表示依目前速率，活動結束前不會被該玩家追上。*\n`;
        }

        return output;
    } catch (error) {
        logger.error(`Error: ${error.message}`, 'error');
        return `策略計算發生錯誤: ${error.message}`;
    } finally {
        clearTimeout(timeoutId);
    }
}
