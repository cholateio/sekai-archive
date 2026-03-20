'use client';

import { cn } from '../lib/utils';

export default function NavButton({ item, isActive, onClick }) {
    const Icon = item.icon;
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200',
                isActive ? 'bg-[#2f2f2f] text-white' : 'text-gray-400 hover:bg-[#2F2F2F] hover:text-white'
            )}
        >
            <Icon className={cn('h-[22px] w-[22px]', isActive ? 'text-white' : 'text-gray-500 group-hover:text-white')} />
            <span className="truncate">{item.label}</span>
        </button>
    );
}
