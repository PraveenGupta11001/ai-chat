import { create } from 'zustand';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: ToolCall[];
    citations?: Citation[];
    uiComponent?: UIComponent;
}

export interface ToolCall {
    id: string;
    name: string;
    status: 'running' | 'completed';
}

export interface Citation {
    id: number;
    text: string;
    link?: string;
}

export interface UIComponent {
    type: 'chart' | 'table' | 'card';
    data: any;
}

interface ChatState {
    messages: Message[];
    isStreaming: boolean;
    pdfViewer: {
        isOpen: boolean;
        fileUrl: string | null;
        pageNumber?: number;
    };
    isDarkMode: boolean;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
    addMessage: (message: Message) => void;
    updateLastMessage: (content: string) => void;
    setStreaming: (isStreaming: boolean) => void;
    addToolCall: (toolCall: ToolCall) => void;
    addCitation: (citation: Citation) => void;
    setUIComponent: (component: UIComponent) => void;
    clearMessages: () => void;
    openPDF: (url: string, page?: number) => void;
    closePDF: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    isStreaming: false,
    pdfViewer: { isOpen: false, fileUrl: null },
    isDarkMode: false,
    toggleTheme: () => set((state) => {
        const newMode = !state.isDarkMode;
        if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', newMode);
        }
        return { isDarkMode: newMode };
    }),
    setTheme: (isDark) => {
        if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', isDark);
        }
        set({ isDarkMode: isDark });
    },
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    updateLastMessage: (content) => set((state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            return {
                messages: [
                    ...state.messages.slice(0, -1),
                    { ...lastMessage, content: lastMessage.content + content }
                ]
            };
        }
        return state;
    }),
    setStreaming: (isStreaming) => set({ isStreaming }),
    addToolCall: (toolCall) => set((state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            const toolCalls = lastMessage.toolCalls || [];
            // Prevent duplicate tool calls with same name
            if (toolCalls.length > 0 && toolCalls[toolCalls.length - 1].name === toolCall.name) {
                return state;
            }
            return {
                messages: [
                    ...state.messages.slice(0, -1),
                    { ...lastMessage, toolCalls: [...toolCalls, toolCall] }
                ]
            };
        }
        return state;
    }),
    addCitation: (citation) => set((state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            const citations = lastMessage.citations || [];
            // Prevent duplicate citations with same link
            if (citations.some(c => c.link === citation.link)) {
                return state;
            }
            return {
                messages: [
                    ...state.messages.slice(0, -1),
                    { ...lastMessage, citations: [...citations, citation] }
                ]
            };
        }
        return state;
    }),
    setUIComponent: (component) => set((state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
            return {
                messages: [
                    ...state.messages.slice(0, -1),
                    { ...lastMessage, uiComponent: component }
                ]
            };
        }
        return state;
    }),
    openPDF: (url, page) => set({ pdfViewer: { isOpen: true, fileUrl: url, pageNumber: page } }),
    closePDF: () => set({ pdfViewer: { isOpen: false, fileUrl: null } }),
    clearMessages: () => set({ messages: [], isStreaming: false, pdfViewer: { isOpen: false, fileUrl: null } }),
}));
