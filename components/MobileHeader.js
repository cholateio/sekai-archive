'use client';

import { Menu } from 'lucide-react';
import { siteConfig } from '../lib/config';

export default function MobileHeader({ onOpen }) {
    return (
        <div className="flex items-center justify-between bg-[#171717] p-4 md:hidden text-white">
            <div className="font-semibold tracking-wide">{siteConfig.name}</div>
            <button onClick={onOpen} className="p-1 hover:bg-[#2F2F2F] rounded-md transition-colors">
                <Menu className="h-6 w-6 text-gray-300" />
            </button>
        </div>
    );
}
