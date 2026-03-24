'use client';

import { memo } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { locales } from '../lib/locales';

const SessionList = memo(function SessionList({ sessions, activeId, currentView, onSelectSession, onDeleteSession }) {
    const sessionKeys = Object.keys(sessions);

    if (sessionKeys.length === 0) {
        return <div className="px-4 py-2 text-sm text-gray-600 italic">{locales.nav.emptyHistory}</div>;
    }

    // 將 sessions 物件轉為陣列並根據 updatedAt 排序 (雖然 Context 可能已經排序，但在 UI 層確保順序是好的習慣)
    // 這裡假設 sessions 已經是正確順序，或是我們直接遍歷
    // 根據原程式碼：Object.values(sessions).map...

    return (
        <>
            {Object.values(sessions).map((session) => (
                <div key={session.id} className="group relative">
                    <button
                        onClick={() => onSelectSession(session.id)}
                        className={cn(
                            'flex w-full items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 pr-10',
                            activeId === session.id && currentView === 'chat'
                                ? 'bg-[#2f2f2f] text-white'
                                : 'text-gray-400 hover:bg-[#2F2F2F] hover:text-white',
                        )}
                    >
                        <MessageSquare
                            className={cn(
                                'h-[22px] w-[22px]',
                                activeId === session.id && currentView === 'chat' ? 'text-white' : 'text-gray-500',
                            )}
                        />
                        <span className="truncate text-left flex-1">{session.title}</span>
                    </button>

                    {/* Delete Button (Hover show) */}
                    <button
                        onClick={(e) => onDeleteSession(e, session.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-red-400 transition-all"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </>
    );
});

export default SessionList;
