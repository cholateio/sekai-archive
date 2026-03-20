export const getEventBorderDef = {
    type: 'function',
    function: {
        name: 'get_event_border',
        description:
            '查詢 Project Sekai 當前活動的「特定整數名次」榜線分數（如：200, 1000, 2000, 5000, 10000 位）。' +
            '⚠️ 注意：此工具不包含 1~100 名的資料。' +
            '若使用者查詢範圍包含「100名以內」（例如：90-100名、前100名、百位線），請務必改用 get_event_top100 工具，嚴禁使用此工具。',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
};
