export const getEventTop100Def = {
    type: 'function',
    function: {
        name: 'get_event_top100', // 對應 implementation 的 key
        description:
            '查詢 Project Sekai 當前活動的「前 100 名」玩家完整榜線與時速。' +
            '支援指定排名範圍查詢以節省資源。' +
            '✅ 適用範圍：任何涉及 1~100 名的查詢（例如：第一名、第 100 名、Top 10、90到100名、百位線）。' +
            '當查詢目標在 100 名以內(含 100 名)時，請優先且唯一使用此工具。',
        parameters: {
            type: 'object',
            properties: {
                startRank: {
                    type: 'integer',
                    description: '查詢範圍的起始名次 (1-100)。例如查詢第 100 名，此值填 100。預設為 1。',
                },
                endRank: {
                    type: 'integer',
                    description: '查詢範圍的結束名次 (1-100)。例如查詢前 10 名，此值填 10。若只查單一名次，此值等於 startRank。',
                },
            },
            required: [],
        },
    },
};
