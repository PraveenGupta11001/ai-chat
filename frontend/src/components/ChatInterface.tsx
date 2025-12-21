"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, Message } from '@/lib/store';
import { MessageBubble } from './MessageBubble';
import { Send, Paperclip, Moon, Sun, Plus, X, FileText, Image as ImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('./PDFViewer').then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading PDF Viewer...</div>
});

export const ChatInterface: React.FC = () => {
    const { messages, addMessage, updateLastMessage, setStreaming, isStreaming, addToolCall, addCitation, setUIComponent, pdfViewer } = useChatStore();
    const [input, setInput] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [sessionId] = useState(() => uuidv4());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Initialize theme
        const isDark = document.documentElement.classList.contains('dark');
        setIsDarkMode(isDark);
    }, []);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // Check file size (e.g., > 5MB)
        const isLarge = file.size > 5 * 1024 * 1024;
        if (isLarge) {
            setUploadProgress(`Large file detected (${(file.size / (1024 * 1024)).toFixed(1)}MB). Only the first part will be processed.`);
        } else {
            setUploadProgress(`Uploading ${file.name}...`);
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/api/pdf/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Upload failed');
            }

            const data = await res.json();
            setUploadProgress(`Successfully uploaded ${file.name}`);

            // Add a system message about the upload
            addMessage({
                id: uuidv4(),
                role: 'assistant',
                content: `I've received and processed **${file.name}**. You can now ask questions about its content!`,
            });

            // Add a citation to this message so user can click to view
            addCitation({
                id: 1,
                text: file.name,
                link: file.name
            });

            setTimeout(() => setUploadProgress(null), 3000);
        } catch (err: any) {
            console.error('Upload error:', err);
            setUploadProgress(`Error: ${err.message}`);
            setTimeout(() => setUploadProgress(null), 5000);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        // ... (handleSubmit logic stays same, just ensure it uses the correct backend URL)
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: input,
        };

        addMessage(userMessage);
        setInput('');
        setStreaming(true);

        const assistantMessageId = uuidv4();
        addMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: '',
        });

        try {
            const res = await fetch('http://localhost:8000/api/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMessage.content }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to start chat');
            }

            const { job_id } = await res.json();
            // Use a persistent sessionId for the conversation flow
            const eventSource = new EventSource(`http://localhost:8000/api/chat/stream/${job_id}?thread_id=${sessionId}`);

            eventSource.onmessage = (event) => {
                const rawData = event.data.trim();
                if (rawData === '[DONE]') {
                    eventSource.close();
                    setStreaming(false);
                    return;
                }

                try {
                    const data = JSON.parse(rawData);
                    if (data.type === 'status' && data.content === 'connected') return;
                    if (data.type === 'text') {
                        updateLastMessage(data.content);
                    } else if (data.type === 'tool_call') {
                        // Only add if it's different from the last one to avoid repetition
                        addToolCall({ id: uuidv4(), name: data.content, status: 'running' });
                    } else if (data.type === 'citation') {
                        addCitation({ id: data.id, text: data.text, link: data.link });
                    } else if (data.type === 'error') {
                        updateLastMessage(`\n\nError: ${data.content}`);
                    }
                } catch (err) {
                    console.error('Error parsing SSE data:', err);
                }
            };

            eventSource.onerror = (err) => {
                if (eventSource.readyState === EventSource.CLOSED) {
                    setStreaming(false);
                } else {
                    eventSource.close();
                    setStreaming(false);
                }
            };

        } catch (error: any) {
            updateLastMessage(`Error: ${error.message}`);
            setStreaming(false);
        }
    };

    return (
        <div className={cn(
            "flex h-screen overflow-hidden transition-colors duration-300",
            isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
        )}>
            {/* Chat Area */}
            <motion.div
                layout
                className={cn(
                    "flex flex-col h-full transition-all duration-300 ease-in-out relative",
                    pdfViewer.isOpen ? "w-1/2 border-r border-zinc-200 dark:border-zinc-800" : "w-full max-w-5xl mx-auto"
                )}
            >
                <header className={cn(
                    "p-4 border-b flex items-center justify-between z-10 shrink-0",
                    isDarkMode ? "bg-zinc-950/80 border-zinc-800 backdrop-blur-md" : "bg-white/80 border-zinc-200 backdrop-blur-md"
                )}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
                        <h1 className="text-xl font-bold tracking-tight">AI Search Chat</h1>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-40">
                            <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-4">
                                <Plus size={32} className="text-indigo-600" />
                            </div>
                            <p className="text-xl font-medium">Start a new conversation</p>
                            <p className="text-sm">Upload a document or just start typing</p>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-4xl mx-auto w-full">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                {uploadProgress && (
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600 text-white rounded-full text-sm shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {uploadProgress}
                    </div>
                )}

                <footer className="p-4 bg-transparent shrink-0">
                    <div className="max-w-3xl mx-auto relative">
                        <form onSubmit={handleSubmit} className="relative group">
                            <div className={cn(
                                "flex items-center gap-2 p-2 rounded-2xl border transition-all duration-200 shadow-sm focus-within:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20",
                                isDarkMode
                                    ? "bg-zinc-900 border-zinc-800 focus-within:border-indigo-500"
                                    : "bg-white border-zinc-200 focus-within:border-indigo-500"
                            )}>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                                    disabled={isUploading || isStreaming}
                                >
                                    <Plus size={22} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept=".pdf,.txt,.md,.py,.js,.ts,.tsx,.html,.css,.json,image/*"
                                />
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 py-3 text-base placeholder-zinc-500"
                                    disabled={isStreaming}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isStreaming}
                                    className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                        <p className="text-[10px] text-center mt-2 text-zinc-500 uppercase tracking-widest font-semibold">
                            AI can make mistakes. Check important info.
                        </p>
                    </div>
                </footer>
            </motion.div>

            {/* PDF Viewer Area */}
            <AnimatePresence>
                {pdfViewer.isOpen && (
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-1/2 h-full bg-zinc-100 dark:bg-zinc-900 shadow-2xl z-20"
                    >
                        <PDFViewer />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

