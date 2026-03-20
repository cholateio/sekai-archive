export const getEventProgress = (startAt, closedAt) => {
    const startTime = new Date(startAt).getTime();
    const endTime = new Date(closedAt).getTime();
    const now = Date.now();

    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;

    let percent = 0;

    if (totalDuration > 0) {
        percent = Math.floor((elapsed / totalDuration) * 100);
    }

    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    // 格式化日期：將 ISO 轉為 "11/30" 格式
    // helper: 傳入 ISO 字串，回傳 "M/D"
    const formatDate = (isoStr) => {
        // 技巧：直接用 Date 物件抓 Month 和 Date，會自動轉為使用者的當地時區
        const d = new Date(isoStr);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    return { percent: percent, duration: `${formatDate(startAt)} - ${formatDate(closedAt)}` };
};
