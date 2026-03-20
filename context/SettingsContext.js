'use client';

import { createContext, useContext, useState } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children, initialSettings }) {
    // 使用 Server 傳來的設定作為初始值 -> 解決 Hydration Mismatch
    const [language, setLanguage] = useState(initialSettings.language || '繁體中文 (台灣)');
    const [character, setCharacter] = useState(initialSettings.character || '初音未來');

    // Update setting and write into Cookie
    const updateSetting = (key, value) => {
        if (key === 'language') setLanguage(value);
        if (key === 'character') setCharacter(value);

        // Client-side Cookie setting (max-age = 1 year)
        const cookieKey = key === 'language' ? 'sekaiArc_lang' : 'sekaiArc_char';
        document.cookie = `${cookieKey}=${encodeURIComponent(value)}; path=/; max-age=31536000`;

        // 為了相容性，也可以同步寫入 localStorage
        localStorage.setItem(cookieKey, value);
    };

    return <SettingsContext.Provider value={{ language, character, updateSetting }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    return useContext(SettingsContext);
}
