export const calculateStrategyDef = {
    type: 'function',
    function: {
        name: 'calculate_event_strategy',
        description:
            '計算 Project Sekai 活動的「追分策略」與「守榜策略」。當使用者想知道「還要多久追上」、「會不會被超車」、「安全距離」時使用。僅支援 Top 100。若使用此工具則必須回覆分數矩陣',
        parameters: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    enum: ['attack', 'defense'],
                    description:
                        '策略模式。attack: 低名次追高名次 (e.g. 100名追90名); defense: 高名次防守 (e.g. 90名怕掉出100名)。',
                },
                currentRank: {
                    type: 'integer',
                    description: '使用者目前的名次 (必須在 1~100 之間)。',
                },
                targetRank: {
                    type: 'integer',
                    description: '目標名次 (Attack 模式為想追的名次，Defense 模式通常為該檔線的尾巴，如 100)。',
                },
                currentScoreOverride: {
                    type: 'integer',
                    description: '可選。若使用者提供了具體分數，則優先使用此分數而非榜單數據。',
                },
            },
            required: ['mode', 'currentRank', 'targetRank'],
        },
    },
};
