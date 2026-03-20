'use client';

import RankingView from '@/components/tools/RankingView';
import RankingBoard from '@/components/tools/RankingBoard';
import RankingDaily from '@/components/tools/RankingDaily';
import ExternalLinksView from '@/components/tools/ExternalLinksView';

const TOOLS_UI_REGISTRY = {
    'events-current': <RankingBoard />,
    'events-daily': <RankingDaily />,
    'analysis-ranking': <RankingView />,
    'external-links': <ExternalLinksView />,
};

export default function ToolsView({ activeToolId }) {
    const toolEntry = TOOLS_UI_REGISTRY[activeToolId];

    return (
        <div className="flex flex-col h-full w-full bg-[#212121] text-white overflow-hidden">
            <div className="flex-1 min-h-0 relative">
                {toolEntry ? (
                    toolEntry
                ) : (
                    <div className="h-full overflow-y-auto p-8 flex flex-col items-center justify-center">
                        <div className="w-full max-w-2xl rounded-2xl border border-dashed border-gray-700 bg-[#2a2a2a]/30 p-12 text-center">
                            <h2 className="text-2xl font-bold tracking-wide text-gray-200 mb-3">Tool Title</h2>

                            {activeToolId && (
                                <div className="mt-8 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
                                    <span>DEV_ID:</span>
                                    <span className="font-bold">{activeToolId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
