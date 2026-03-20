const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const initialState = {
    sessions: {},
    activeId: null, // 'new' or uuid
    isLoaded: false,
};

/* Example
{
  "sessions": {
    "1709251200000": {
      "id": "1709251200000",
      "title": "React 教學", 
      "updatedAt": 1709251500000, // 時間變新了
      "messages": [
        { "role": "user", "content": "請教我怎麼用 React Hooks", ... },
        { "role": "assistant", "content": "沒問題！我們從 useState 開始...", ... },
        { 
          "role": "user", 
          "content": "我也想學 Vue", // 新增進來了！
          "time": "上午 10:05:00"
        }
      ]
    },
    // ... 其他房間沒變
  },
  "activeId": "1709251200000",
  "isLoaded": true
}
*/

// Reducer is just like the rules book
export function chatReducer(state, action) {
    switch (action.type) {
        case 'INIT':
            return {
                ...state,
                sessions: action.payload.sessions,
                activeId: action.payload.activeId,
                isLoaded: true,
            };

        case 'SET_ACTIVE':
            return { ...state, activeId: action.payload };

        case 'PREPARE_NEW':
            return { ...state, activeId: 'new' };

        case 'SEND_MESSAGE': {
            const { message } = action.payload;
            let targetSessionId = state.activeId;
            let targetSession = state.sessions[targetSessionId];
            let newState = { ...state };

            // If it is new chat, build the session
            if (state.activeId === 'new') {
                const newId = Date.now().toString();
                targetSessionId = newId;
                targetSession = {
                    id: newId,
                    title: 'New Chat',
                    messages: [], // Default empty for showing the welcome messages

                    updatedAt: Date.now(),
                };
                newState.activeId = newId;
            }

            if (!targetSession) return state;

            // Replace the chatroom title by user's first chat
            let newTitle = targetSession.title;
            if (message.role === 'user' && newTitle === 'New Chat') {
                newTitle = message.content.slice(0, 15) + (message.content.length > 15 ? '...' : '');
            }

            const updatedSession = {
                ...targetSession,
                title: newTitle,
                messages: [...targetSession.messages, { ...message, id: generateId() }],
                updatedAt: Date.now(),
            };

            newState.sessions = {
                ...state.sessions,
                [targetSessionId]: updatedSession,
            };

            return newState;
        }

        case 'STREAM_UPDATE': {
            const { content } = action.payload;
            const targetSessionId = state.activeId;
            const session = state.sessions[targetSessionId];

            if (!session || session.messages.length === 0) return state;

            const newMessages = [...session.messages];
            const lastIndex = newMessages.length - 1;

            // Copy and update last message
            newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: newMessages[lastIndex].content + content,
            };

            return {
                ...state,
                sessions: {
                    ...state.sessions,
                    [targetSessionId]: {
                        ...session,
                        messages: newMessages,
                    },
                },
            };
        }

        case 'DELETE_MESSAGE': {
            const { index } = action.payload;
            const targetSessionId = state.activeId;
            const session = state.sessions[targetSessionId];

            if (!session || session.messages.length === 0) return state;

            const newMessages = [...session.messages];
            newMessages.splice(index, 1);

            return {
                ...state,
                sessions: {
                    ...state.sessions,
                    [targetSessionId]: {
                        ...session,
                        messages: newMessages,
                        updatedAt: Date.now(),
                    },
                },
            };
        }

        case 'DELETE_LAST_MESSAGE': {
            const targetSessionId = state.activeId;
            const session = state.sessions[targetSessionId];

            if (!session || session.messages.length === 0) return state;

            const newMessages = [...session.messages];
            newMessages.pop();

            return {
                ...state,
                sessions: {
                    ...state.sessions,
                    [targetSessionId]: {
                        ...session,
                        messages: newMessages,
                        updatedAt: Date.now(),
                    },
                },
            };
        }

        case 'DELETE_SESSION':
            const newSessions = { ...state.sessions };
            delete newSessions[action.payload];
            return {
                ...state,
                sessions: newSessions,
                activeId: action.payload === state.activeId ? 'new' : state.activeId,
            };

        case 'CLEAR_CURRENT':
            if (!state.sessions[state.activeId]) return state;
            return {
                ...state,
                sessions: {
                    ...state.sessions,
                    [state.activeId]: {
                        ...state.sessions[state.activeId],
                        messages: [], // Default empty for showing the welcome messages
                        updatedAt: Date.now(),
                    },
                },
            };

        case 'CLEAR_ALL_SESSIONS':
            return {
                ...state,
                sessions: {},
                activeId: 'new',
            };

        default:
            return state;
    }
}
