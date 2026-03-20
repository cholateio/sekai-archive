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
                    description: '用來搜尋的關鍵字或短句。請將使用者的問題濃縮成最核心的名詞或動詞組合。',
                },
            },
            required: ['query'],
        },
    },
};
