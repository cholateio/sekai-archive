'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MobileHeader from '../components/MobileHeader';
import ChatWindow from '../components/ChatWindow';
import ToolsView from '../components/ToolsView';
import SettingsModal from '../components/SettingsModal';

export default function Home() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('chat');
    const [activeToolId, setActiveToolId] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleNavigate = (view, toolId = null) => {
        setActiveView(view);
        if (view === 'tools' && toolId) {
            setActiveToolId(toolId);
        }
        setIsSidebarOpen(false);
    };

    // Render the content based on the active view
    const renderContent = () => {
        switch (activeView) {
            case 'chat':
                return <ChatWindow />;
            case 'tools':
                return <ToolsView activeToolId={activeToolId} />;
            default:
                return <ChatWindow />;
        }
    };

    return (
        <main className="flex h-dvh w-full overflow-hidden bg-[#212121]">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                currentView={activeView}
                activeToolId={activeToolId}
                onNavigate={handleNavigate}
                onOpenSettings={() => setIsSettingsOpen(true)}
            />

            <div className="flex-1 flex flex-col h-full w-full relative">
                <MobileHeader onOpen={() => setIsSidebarOpen(true)} />

                {renderContent()}

                {/* Setting button at the end */}
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>
        </main>
    );
}
