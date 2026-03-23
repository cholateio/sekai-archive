export const searchKnowledgeBaseDef = {
    type: 'function',
    function: {
        name: 'search_knowledge_base',
        description:
            '檢索世界計畫(pjsk)與虛擬偶像的知識庫。遇到任何你不確定的遊戲設定、角色資訊、活動數據，強制使用此工具。\n\n' +
            '【🔥 核心檢索策略 (非常重要)】\n' +
            '1. 多目標平行搜尋 (Parallel Search)：若問題涉及多個實體（例如「25時所有成員的生日」），你必須「同時多次呼叫」本工具，分別查詢「宵崎奏 生日」、「朝比奈真冬 生日」等。\n' +
            '2. 多步推論 (Multi-hop Reasoning)：若你不知道團體有哪些成員，請先呼叫一次查詢「25點 成員」，收到結果後，在下一個思考步驟再呼叫工具查詢個別成員的生日。\n' +
            '3. 永不輕易放棄 (Self-Correction)：如果工具回傳「找不到資料」，絕對不要立刻回答使用者「找不到」。你必須轉換同義詞、換個關鍵字，再次呼叫工具搜尋！\n\n' +
            '【📖 遊戲行話與同義詞字典】\n' +
            '- 25時 / 25 / 宵崎家 = 25點，Nightcord見。\n' +
            '- WxS / 奇幻樂園 = Wonderlands×Showtime\n' +
            '- VBS / 街團 = Vivid BAD SQUAD\n' +
            '- MMJ = MORE MORE JUMP!\n' +
            '- LN / 星乃家 = Leo/need\n' +
            '- pjsk = 世界計畫 繽紛舞台',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description:
                        '精確的核心關鍵字，以空格分隔。絕對不要輸入完整的自然語言問句。\n' +
                        '✅ 正確範例：「星乃一歌 生日」、「25點，Nightcord見。 成員」、「Vivid BAD SQUAD 劇情」\n' +
                        '❌ 錯誤範例：「25時的成員生日是什麼時候？」',
                },
            },
            required: ['query'],
        },
    },
};
