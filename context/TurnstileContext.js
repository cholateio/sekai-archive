'use client';

import { createContext, useContext, useRef, useCallback } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

const TurnstileContext = createContext(null);

export function TurnstileProvider({ children }) {
    const turnstileRef = useRef(null);
    const resolveRef = useRef(null); // 用來暫存 Promise 的 resolve 函式

    const getFreshToken = useCallback(() => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            if (turnstileRef.current) {
                // reset() 會觸發 Turnstile 在背景重新運算，並呼叫 onSuccess
                turnstileRef.current.reset();
            } else {
                resolve('turnstile-not-loaded');
            }
        });
    }, []);

    const handleSuccess = (token) => {
        if (resolveRef.current) {
            resolveRef.current(token);
            resolveRef.current = null;
        }
    };

    return (
        <TurnstileContext.Provider value={{ getFreshToken }}>
            {/* 隱藏的 Turnstile 元件，負責在背景執行算力驗證 */}
            <div style={{ display: 'none' }}>
                <Turnstile
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                    options={{ size: 'invisible' }}
                    onSuccess={handleSuccess}
                />
            </div>
            {children}
        </TurnstileContext.Provider>
    );
}

export const useTurnstile = () => useContext(TurnstileContext);
