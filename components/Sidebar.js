'use client';

import { useState, useCallback } from 'react';
import { X, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navSections, siteConfig } from '@/lib/config';
import { locales } from '@/lib/locales';
import { useChat } from '@/context/ChatContext';
import SessionList from './SessionList';
import NavButton from './NavButton';
import StaticBanner from './StaticBanner';

export default function Sidebar({ isOpen, onClose, currentView, activeToolId, onNavigate, onOpenSettings }) {
    const { sessions, activeId, switchSession, prepareNewChat, deleteSession } = useChat();

    const [expandedSections, setExpandedSections] = useState({
        [locales.nav.categories.home]: true,
        [locales.nav.categories.data]: true,
        [locales.nav.categories.chats]: true,
    });

    const toggleSection = (category) => {
        setExpandedSections((prev) => ({ ...prev, [category]: !prev[category] }));
    };

    const handleItemClick = useCallback(
        (item) => {
            if (item.id === 'home') {
                if (onNavigate) onNavigate('chat', null);
                prepareNewChat();
            } else {
                if (onNavigate) onNavigate(item.view, item.id);
            }

            if (window.innerWidth < 768) onClose();
        },
        [onNavigate, prepareNewChat, onClose]
    );

    const handleSessionClick = useCallback(
        (sessionId) => {
            switchSession(sessionId);
            if (onNavigate) onNavigate('chat');
            if (window.innerWidth < 768) onClose();
        },
        [switchSession, onNavigate, onClose]
    );

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#171717] font-sans transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:flex',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex items-center justify-between px-5 pt-8 pb-6">
                    <h1 className="text-xl font-bold text-white tracking-wide">{siteConfig.name}</h1>
                    <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {/* Static Banner */}
                    <div className="mb-6 mx-2">
                        <StaticBanner />
                    </div>

                    {navSections.map((section) => {
                        const isExpanded = expandedSections[section.category];

                        if (section.category === locales.nav.categories.chats) {
                            return (
                                <div key={section.category}>
                                    <button
                                        onClick={() => toggleSection(section.category)}
                                        className="flex w-full items-center gap-1.5 px-2 mb-3 text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        <span>{section.category}</span>
                                    </button>

                                    <div className={cn('space-y-1.5', !isExpanded && 'hidden')}>
                                        <SessionList
                                            sessions={sessions}
                                            activeId={activeId}
                                            currentView={currentView}
                                            onSelectSession={handleSessionClick}
                                            onDeleteSession={deleteSession}
                                        />
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={section.category}>
                                {section.category !== locales.nav.categories.home && (
                                    <button
                                        onClick={() => toggleSection(section.category)}
                                        className="flex w-full items-center gap-1.5 px-2 mb-3 text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        <span>{section.category}</span>
                                    </button>
                                )}

                                <div
                                    className={cn(
                                        'space-y-1.5',
                                        section.category !== locales.nav.categories.home && !isExpanded && 'hidden'
                                    )}
                                >
                                    {section.items.map((item) => {
                                        const isActive =
                                            (item.id === 'home' && activeId === 'new' && currentView === 'chat') ||
                                            (currentView === 'tools' && activeToolId === item.id);
                                        return (
                                            <NavButton
                                                key={item.id}
                                                item={item}
                                                isActive={isActive}
                                                onClick={() => handleItemClick(item)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="border-t border-[#2F2F2F] p-4 bg-[#171717]">
                    <button
                        onClick={() => {
                            if (onOpenSettings) onOpenSettings();
                            if (window.innerWidth < 768) onClose();
                        }}
                        className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-medium text-gray-400 hover:bg-[#2F2F2F] hover:text-white transition-all duration-200"
                    >
                        <Settings className="h-[22px] w-[22px] text-gray-500 group-hover:text-white" />
                        <span className="truncate">{locales.nav.settings}</span>
                    </button>
                    <div className="mt-2 px-4 text-xs font-medium text-gray-600">
                        {locales.nav.version} {siteConfig.version}
                    </div>
                </div>
            </aside>
        </>
    );
}
