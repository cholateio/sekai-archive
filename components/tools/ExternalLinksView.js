'use client';

import { ExternalLink, Globe, Database, Music, User, Calculator, ChevronRight } from 'lucide-react';

const EXTERNAL_LINKS = [
    {
        id: 'official',
        title: 'Project Sekai Office Web',
        description: '遊戲官方資訊、公告與活動預告',
        url: 'https://pjsekai.sega.jp/',
        icon: <Globe className="w-5 h-5 text-blue-400" />,
        tag: 'OFFICIAL',
        tagColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    },
    {
        id: 'sekai-viewer',
        title: 'Sekai Viewer',
        description: '最強大的遊戲資料庫，包含全伺服器詳細資訊',
        url: 'https://sekai.best/',
        icon: <Database className="w-5 h-5 text-green-400" />,
        tag: 'DATABASE',
        tagColor: 'text-green-400 bg-green-400/10 border-green-400/20',
    },
    {
        id: 'hisekaitw',
        title: 'Hi Sekai TW',
        description: '提供 Project Sekai 台服最完整的排名數據查詢、歷代活動存檔以及多維度的數據分析工具',
        url: 'https://project-sekai-ranking.vercel.app/',
        icon: <User className="w-5 h-5 text-pink-400" />,
        tag: 'TOOL',
        tagColor: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
    },
    {
        id: 'hisekai',
        title: 'Hisekai API',
        description: '本站榜線分數資料來源，提供即時榜線 API',
        url: 'https://api.hisekai.org/',
        icon: <Calculator className="w-5 h-5 text-yellow-400" />,
        tag: 'DEV',
        tagColor: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    },
    {
        id: 'wiki',
        title: 'Project Sekai Wiki (JP)',
        description: '本站知識庫來源(預計)，提供詳盡的遊戲攻略',
        url: 'https://pjsekai.com/',
        icon: <Music className="w-5 h-5 text-purple-400" />,
        tag: 'WIKI',
        tagColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    },
];

export default function ExternalLinksView() {
    return (
        <div className="h-full w-full overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                {/* Title Section */}
                <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
                            <ExternalLink className="w-6 h-6 text-cyan-400" />
                            Resources
                        </h2>
                        <p className="text-gray-500 text-xs mt-1 font-mono tracking-wide">EXTERNAL TOOLS & LINKS COLLECTION</p>
                    </div>
                </div>

                {/* List Content */}
                <div className="flex flex-col gap-3">
                    {EXTERNAL_LINKS.map((link) => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                                group relative flex items-center gap-4 p-4 rounded-xl bg-[#2a2a2a] 
                                border border-white/5 transition-all duration-200
                                hover:bg-[#333] hover:translate-x-1 hover:shadow-lg
                            `}
                        >
                            {/* Icon Box */}
                            <div className="shrink-0 p-3 rounded-lg bg-[#212121] ring-1 ring-white/5 group-hover:scale-105 transition-transform">
                                {link.icon}
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-base font-bold text-gray-200 group-hover:text-white truncate">
                                        {link.title}
                                    </h3>
                                    <span
                                        className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded border ${link.tagColor}`}
                                    >
                                        {link.tag}
                                    </span>
                                </div>
                                <p className="hidden md:block text-sm text-gray-500 truncate group-hover:text-gray-400">
                                    {link.description}
                                </p>
                            </div>

                            {/* Arrow Action */}
                            <div className="shrink-0 text-gray-600 group-hover:text-cyan-400 transition-colors">
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
