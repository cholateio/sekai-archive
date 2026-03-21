export const searchKnowledgeBaseDef = {
    type: 'function',
    function: {
        name: 'search_knowledge_base',
        description:
            '當使用者詢問遊戲知識、虛擬偶像領域內容、或你原本不知道的細節時，必須呼叫此工具。傳入精確的關鍵字進行語意搜尋。' +
            '⚠️ 注意：當你可以使用此工具時則強制必須使用此工具。',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description:
                        '你必須根據上下文，推斷出「完整實體名稱」與「目標屬性」，並僅輸出核心關鍵字，以空格分隔。' +
                        '範例：使用者問「她生日什麼時候？」(前文在聊星乃一歌)，請輸出「星乃一歌 生日」。'
                },
            },
            required: ['query'],
        },
    },
};
