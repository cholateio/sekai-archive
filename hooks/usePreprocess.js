import { useState, useCallback } from 'react';

const VALIDATION_RULES = {
    MAX_LENGTH: 1000,
    MIN_LENGTH: 2,
    MAX_REPEATED_CHARS: 15,
    SYMBOL_RATIO_THRESHOLD: 0.6, // 若特殊符號佔總字數超過 60%，則視為惡意或無意義
};

export function usePreprocess() {
    const [inputError, setInputError] = useState(null);

    const validateInput = useCallback((text) => {
        setInputError(null);

        // 最基礎的防呆：空值與長度檢查 (Performance: 運算成本最低，最先檢查)
        const trimmedText = text.trim();
        if (!trimmedText || trimmedText.length < VALIDATION_RULES.MIN_LENGTH) {
            setInputError('請輸入有意義的問句。');
            return false;
        }
        if (trimmedText.length > VALIDATION_RULES.MAX_LENGTH) {
            setInputError(`問句過長，請將內容限制在 ${VALIDATION_RULES.MAX_LENGTH} 字元以內。`);
            return false;
        }

        // 檢查連續重複的無意義字串 (例如：aaaaaaaaaa 或 。。。。。。。)
        // 利用 Regex \1 捕捉群組來判斷同一字元是否連續出現超過設定閾值
        const repeatedCharRegex = new RegExp(`(.)\\1{${VALIDATION_RULES.MAX_REPEATED_CHARS},}`);
        if (repeatedCharRegex.test(trimmedText)) {
            setInputError('請避免輸入過多連續且重複的無意義字元。');
            return false;
        }

        // 檢查基礎惡意 JavaScript Code (XSS / Injection)
        // 阻擋典型的攻擊 Payload，例如 <script>, javascript:, onload=
        const maliciousRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|on\w+\s*=|data:text\/html/gi;
        if (maliciousRegex.test(trimmedText)) {
            setInputError('輸入內容包含不安全的腳本標籤或惡意語法，已被系統攔截。');
            return false;
        }

        // 檢查符號比例是否過高 (例如：!@#$%^&*()_+ 佔滿整句)
        // 這裡的 Regex 涵蓋了英文、數字、中文 (\u4e00-\u9fa5) 以及日文平假名/片假名 (\u3040-\u30ff) 和空白
        const validCharsRegex = /[a-zA-Z0-9\u4e00-\u9fa5\u3040-\u30ff\s]/g;
        const validCharsCount = (trimmedText.match(validCharsRegex) || []).length;
        // 計算非英數中日文字元的佔比 (即特殊符號佔比)
        const symbolRatio = 1 - validCharsCount / trimmedText.length;
        if (symbolRatio > VALIDATION_RULES.SYMBOL_RATIO_THRESHOLD) {
            setInputError('輸入內容包含過多特殊符號，無法辨識語意。');
            return false;
        }

        // 所有檢查皆通過
        return true;
    }, []);

    const clearError = useCallback(() => setInputError(null), []);

    return { inputError, validateInput, clearError };
}
