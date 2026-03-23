'use client';

import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';

export default function IntroModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    // 用於確認元件是否已在客戶端掛載，避免 Next.js Hydration Mismatch
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        try {
            const cookies = document.cookie.split('; ');
            const hasHiddenIntro = cookies.some((row) => row.startsWith('hide_intro=true'));

            if (!hasHiddenIntro) setIsOpen(true);
        } catch (error) {
            console.error('Failed to read cookie for IntroModal:', error);
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        try {
            if (dontShowAgain) {
                // 加上 SameSite=Strict 與 Secure 提升安全性與效能
                const oneYearInSeconds = 60 * 60 * 24 * 365; // (1 year = 60秒 * 60分 * 24小時 * 365天)
                document.cookie = `hide_intro=true; max-age=${oneYearInSeconds}; path=/; SameSite=Strict; Secure`;
            }
        } catch (error) {
            console.error('Failed to set cookie for IntroModal:', error);
        } finally {
            setIsOpen(false);
        }
    };

    // Performance Optimization: 在客戶端確認掛載前，或 Modal 設定為關閉時，不渲染任何 DOM
    if (!isMounted || !isOpen) return null;

    return (
        <div className="fixed p-4 inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#1f1f1f] border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between bg-cyan-500/10 px-5 py-4 border-b border-cyan-500/10">
                    <div className="flex items-center gap-3 text-cyan-400">
                        <Info className="h-6 w-6" />
                        <span className="font-bold text-lg tracking-wide">系統提示</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-200 leading-relaxed text-[15px]">
                        歡迎來到策略分析！
                        <br />
                        <br />
                        這裡可以查詢<span className="text-cyan-400 font-bold">最新的活動數據與榜線</span>
                        。包含萬名內分數和時速皆會即時更新。
                        <br />
                        <br />
                        您可以像這樣詢問:
                        <br />
                        A. 請問 87 名到 92 分數和時數多少?
                        <br />
                        B. 請問 450 名分數多少?
                        <br />
                        C. 我現在 90 名會不會掉出 100 名?
                        <br />
                        <br />
                        <span className="text-cyan-400 font-bold">回答框中的按鈕可以重新生成答案。</span>
                    </p>

                    {/* Checkbox for "Don't show again" */}
                    <div className="mt-6 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="dontShowAgain"
                            className="w-4 h-4 rounded border-gray-600 bg-[#181818] text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0 cursor-pointer"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        <label
                            htmlFor="dontShowAgain"
                            className="text-sm text-gray-400 cursor-pointer select-none hover:text-gray-300 transition-colors"
                        >
                            今後不再顯示此提示
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[#181818] border-t border-white/5 flex justify-end">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors shadow-lg shadow-cyan-900/20"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
