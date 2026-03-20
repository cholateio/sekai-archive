// ANSI Color Codes for Terminal
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    bgBlue: '\x1b[44m',
};

// GPT-4o-mini Pricing (USD per 1M tokens)
const PRICING = {
    input: 0.15,
    output: 0.6,
};

export class DebugLogger {
    constructor(scope = 'System') {
        this.scope = scope;
        this.timers = {};
        this.startTime = Date.now();
    }

    // 🕒 效能計時器
    time(label) {
        this.timers[label] = performance.now();
    }
    timeEnd(label) {
        if (!this.timers[label]) return 0;
        const duration = (performance.now() - this.timers[label]).toFixed(2);
        delete this.timers[label];
        return duration; // ms
    }

    // 💰 成本計算機
    calculateCost(usage) {
        if (!usage) return { inputCost: 0, outputCost: 0, totalCost: 0 };

        const inputCost = (usage.prompt_tokens / 1_000_000) * PRICING.input;
        const outputCost = (usage.completion_tokens / 1_000_000) * PRICING.output;

        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
        };
    }

    // 🎨 格式化輸出
    logSummary({ usage, duration }) {
        const { totalCost } = this.calculateCost(usage);

        const timeStr = `${COLORS.bright}${duration}ms${COLORS.reset}`;
        let usageStr = `${COLORS.dim}No Usage Data${COLORS.reset}`;
        let costStr = '';

        if (usage) {
            usageStr = `${COLORS.yellow}∑${usage.total_tokens} (In:${usage.prompt_tokens}/Out:${usage.completion_tokens})${COLORS.reset}`;
            costStr = ` | ${COLORS.green}💰$${totalCost.toFixed(6)}${COLORS.reset}`;
        }

        // 單行輸出：[Summary] 120ms | ∑500 (In:400/Out:100) | 💰$0.000150
        console.log(`${COLORS.bgBlue} [LOG] ${timeStr} | ${usageStr}${costStr} ${COLORS.reset}`);
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}] [${this.scope}]`;

        switch (type) {
            case 'error':
                console.error(`${COLORS.red}${prefix} ❌ ${message}${COLORS.reset}`);
                break;
            case 'warn':
                console.warn(`${COLORS.yellow}${prefix} ⚠️ ${message}${COLORS.reset}`);
                break;
            case 'success':
                console.log(`${COLORS.green}${prefix} ✅ ${message}${COLORS.reset}`);
                break;
            default:
                console.log(`${COLORS.dim}${prefix}${COLORS.reset} ${message}`);
        }
    }
}
