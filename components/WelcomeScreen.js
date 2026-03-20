'use client';

import { Bot } from 'lucide-react';
import { siteConfig } from '../lib/config';

export default function WelcomeScreen() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#2F2F2F] shadow-2xl shadow-black/20 ring-1 ring-white/5">
                <Bot className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl tracking-tight">{siteConfig.welcome.title}</h2>
            <p className="max-w-md text-lg text-gray-400 leading-relaxed md:text-xl">
                {siteConfig.welcome.subtitle}
                <br />
                {siteConfig.welcome.description}
            </p>
        </div>
    );
}
