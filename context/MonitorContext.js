'use client';

import { createContext, useContext, useReducer, useCallback } from 'react';

const MonitorContext = createContext();

// --- Action Types ---
const ACTIONS = {
    ADD_CARD: 'ADD_CARD',
    UPDATE_CARD: 'UPDATE_CARD',
    REMOVE_CARD: 'REMOVE_CARD',
    CLEAR_CARDS: 'CLEAR_CARDS',
};

const initialState = {
    cards: [],
};

function monitorReducer(state, action) {
    switch (action.type) {
        case ACTIONS.ADD_CARD:
            if (state.cards.some((c) => c.id === action.payload.id)) {
                return state;
            }
            const newCards = [...state.cards, action.payload];
            return {
                ...state,
                cards: newCards.length > 10 ? newCards.slice(-10) : newCards,
            };
        case ACTIONS.UPDATE_CARD:
            return {
                ...state,
                cards: state.cards.map((card) => (card.id === action.payload.id ? { ...card, ...action.payload.updates } : card)),
            };
        case ACTIONS.REMOVE_CARD:
            return {
                ...state,
                cards: state.cards.filter((card) => card.id !== action.payload),
            };
        case ACTIONS.CLEAR_CARDS:
            return {
                ...state,
                cards: [],
            };
        default:
            return state;
    }
}

export function MonitorProvider({ children }) {
    const [state, dispatch] = useReducer(monitorReducer, initialState);
    const { cards } = state;

    const addCard = useCallback((card) => {
        dispatch({ type: ACTIONS.ADD_CARD, payload: card });
    }, []);

    const updateCard = useCallback((id, updates) => {
        dispatch({ type: ACTIONS.UPDATE_CARD, payload: { id, updates } });
    }, []);

    const removeCard = useCallback((id) => {
        dispatch({ type: ACTIONS.REMOVE_CARD, payload: id });
    }, []);

    const clearCards = useCallback(() => {
        dispatch({ type: ACTIONS.CLEAR_CARDS });
    }, []);

    return (
        <MonitorContext.Provider value={{ cards, addCard, updateCard, removeCard, clearCards }}>
            {children}
        </MonitorContext.Provider>
    );
}

export function useMonitor() {
    return useContext(MonitorContext);
}
