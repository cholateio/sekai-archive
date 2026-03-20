'use client';

import { createContext, useContext, useEffect, useCallback, useMemo, useReducer } from 'react';
import { locales } from '../lib/locales';
import { chatReducer, initialState } from './chatReducer';

const ChatContext = createContext(); // just like building up the radio channel

const STORAGE_KEY = 'sekaiArc_chat_history';
const MAX_CHATS = 3;

export function ChatProvider({ children }) {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const { sessions, activeId, isLoaded } = state;

    // Auto-save logic
    useEffect(() => {
        // 當網頁剛打開的 第一瞬間，React 會先使用預設值（空物件 {}）來初始化。這時候還沒來得及從硬碟 (LocalStorage) 讀取舊紀錄。
        // 如果你沒有這個 if (isLoaded)，程式會誤以為「現在的紀錄是空的」，然後把空資料寫入硬碟，導致原本的舊紀錄被清空覆蓋掉。
        if (!isLoaded) return;
        // LocalStorage 只能存文字 (String)，不能存 JavaScript 的物件 (Object)。
        // 所以我們必須用 JSON.stringify 把整包 sessions 物件「打包」成一長串文字，才能塞進去。
        const handler = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        }, 1000); // 延遲 1 秒寫入
        return () => clearTimeout(handler);
    }, [sessions, isLoaded]);

    // Init logic
    useEffect(() => {
        // 「我現在是在使用者的瀏覽器上嗎？」如果是，才去讀檔
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            let initialSessions = {};
            let initialActiveId = 'new';

            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    initialSessions = parsed;
                    // 如果有舊紀錄，程式就先幫使用者打開第一筆紀錄 (keys[0])
                    const keys = Object.keys(parsed);
                    if (keys.length > 0) {
                        initialActiveId = keys[0];
                    }
                } catch (e) {
                    console.error('LocalStorage parse error', e);
                }
            }
            // 此時資料還在 useEffect 手上，需要發送 INIT 來更新 State (setState)
            dispatch({
                type: 'INIT',
                payload: { sessions: initialSessions, activeId: initialActiveId },
            });
        }
    }, []); // <- Only execute one time

    // Activate chatroom logic
    const prepareNewChat = useCallback(() => {
        dispatch({ type: 'PREPARE_NEW' });
    }, []);
    const switchSession = useCallback(
        (id) => {
            if (sessions[id]) {
                dispatch({ type: 'SET_ACTIVE', payload: id });
            }
        },
        [sessions],
    );

    const addMessage = useCallback(
        (message) => {
            if (activeId === 'new') {
                if (Object.keys(sessions).length >= MAX_CHATS) {
                    alert(`已達到聊天室上限 (${MAX_CHATS} 個)。請先刪除舊的聊天室。`);
                    return;
                }
            }
            dispatch({ type: 'SEND_MESSAGE', payload: { message } });
        },
        [activeId, sessions],
    );

    const deleteMessage = useCallback((index) => {
        dispatch({ type: 'DELETE_MESSAGE', payload: { index } });
    }, []);

    const deleteLastMessage = useCallback(() => {
        dispatch({ type: 'DELETE_LAST_MESSAGE' });
    }, []);

    const clearCurrentMessages = useCallback(() => {
        if (activeId === 'new') return;
        if (confirm(locales.chat.confirmClear)) {
            dispatch({ type: 'CLEAR_CURRENT' });
        }
    }, [activeId]);

    // Delete chatroom logic
    const deleteSession = useCallback((e, id) => {
        e.stopPropagation();
        if (confirm(locales.nav.confirmDeleteSession)) {
            dispatch({ type: 'DELETE_SESSION', payload: id });
        }
    }, []);
    const clearAllSessions = useCallback(() => {
        if (confirm(locales.settings.actions.clearAllConfirm)) {
            dispatch({ type: 'CLEAR_ALL_SESSIONS' });
        }
    }, []);

    const updateStreamMessage = useCallback((content) => {
        dispatch({ type: 'STREAM_UPDATE', payload: { content } });
    }, []);

    const currentMessages = useMemo(() => {
        return activeId === 'new' || !sessions[activeId] ? [] : sessions[activeId].messages;
    }, [activeId, sessions]);

    const contextValue = useMemo(
        () => ({
            sessions,
            activeId,
            currentMessages,
            prepareNewChat,
            switchSession,
            addMessage,
            deleteMessage,
            deleteLastMessage,
            clearCurrentMessages,
            deleteSession,
            clearAllSessions,
            updateStreamMessage,
            isLoaded,
        }),
        [
            sessions,
            activeId,
            currentMessages,
            isLoaded,
            prepareNewChat,
            switchSession,
            addMessage,
            deleteMessage,
            deleteLastMessage,
            clearCurrentMessages,
            deleteSession,
            clearAllSessions,
            updateStreamMessage,
        ],
    );

    return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

export function useChat() {
    return useContext(ChatContext);
}
