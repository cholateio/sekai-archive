import { getEventTop100Def } from './definitions/ranking';
import { getEventTop100 } from './implementations/ranking';
import { getEventBorderDef } from './definitions/border';
import { getEventBorder } from './implementations/border';
import { calculateStrategyDef } from './definitions/strategy';
import { calculateEventStrategy } from './implementations/strategy';

// --- 工具註冊表 ---
const registry = [
    {
        definition: getEventTop100Def,
        implementation: getEventTop100,
    },
    {
        definition: getEventBorderDef,
        implementation: getEventBorder,
    },
    {
        definition: calculateStrategyDef,
        implementation: calculateEventStrategy,
    },
    // 未來新增工具只需在這裡加入：
    // { definition: calculatorDef, implementation: calculateResource }
];

// --- 自動生成導出物件 ---

// 給 OpenAI 的 tools 陣列 (只包含 Schema)
export const allToolDefinitions = registry.map((tool) => tool.definition);

// 給後端執行的 Map (name -> function)
export const toolImplementations = registry.reduce((acc, tool) => {
    const functionName = tool.definition.function.name;
    acc[functionName] = tool.implementation;
    return acc;
}, {});
