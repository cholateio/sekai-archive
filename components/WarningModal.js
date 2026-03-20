'use client';

import { AlertTriangle, X } from 'lucide-react';

export default function WarningModal({ isOpen, onClose, message }) {
    if (!isOpen) return null;

    return (
        <div className="fixed p-4 inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#1f1f1f] border border-red-500/30 shadow-2xl shadow-red-500/10 scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between bg-red-500/10 px-5 py-4 border-b border-red-500/10">
                    <div className="flex items-center gap-3 text-red-400">
                        <AlertTriangle className="h-6 w-6" />
                        <span className="font-bold text-lg tracking-wide">System Alert</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-200 leading-relaxed text-[15px]">
                        此區域僅供查詢 <span className="text-cyan-400 font-bold">活動數據與榜線</span>。
                        <br />
                        <br />
                        您的提問似乎與主題無關。如需詢問一般遊戲問題，請使用的{' '}
                        <span className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">開始聊天</span> 功能。
                    </p>
                    {message && (
                        <div className="mt-4 p-3 rounded bg-red-950/30 border border-red-500/20 text-xs text-red-300 font-mono">
                            Reason: {message}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[#181818] border-t border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors shadow-lg shadow-red-900/20"
                    >
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    );
}
