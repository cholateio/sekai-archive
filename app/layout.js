import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { SettingsProvider } from '@/context/SettingsContext';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata = {
    title: 'Sekai Archive',
    description: 'Project Sekai AI Assistant',
};

export default async function RootLayout({ children }) {
    // Get the cookie and store in settings context
    const cookieStore = await cookies();
    const langCookie = cookieStore.get('sekaiArc_lang');
    const charCookie = cookieStore.get('sekaiArc_char');

    const initialSettings = {
        language: langCookie?.value ? decodeURIComponent(langCookie.value) : undefined,
        character: charCookie?.value ? decodeURIComponent(charCookie.value) : undefined,
    };

    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <SettingsProvider initialSettings={initialSettings}>
                    {children}
                    <Analytics />
                </SettingsProvider>
            </body>
        </html>
    );
}
