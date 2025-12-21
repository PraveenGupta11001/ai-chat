"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, Message } from '@/lib/store';
import { MessageBubble } from './MessageBubble';
import { Send, Paperclip, Moon, Sun, Plus, X, FileText, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('./PDFViewer').then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading PDF Viewer...</div>
});

export const ChatInterface: React.FC = () => {
    const { messages, addMessage, updateLastMessage, setStreaming, isStreaming, addToolCall, addCitation, setUIComponent, pdfViewer, clearMessages } = useChatStore();
    const [input, setInput] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        setPendingFiles(prev => [...prev, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (files: File[]) => {
        const uploadedCitations: any[] = [];

        for (const file of files) {
            setIsUploading(true);
            setUploadProgress(`Uploading ${file.name}...`);

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

                // Add a citation for this file
                const citation = {
                    id: Date.now() + Math.random(),
                    text: file.name,
                    link: file.name
                };
                addCitation(citation);
                uploadedCitations.push(citation);

            } catch (err: any) {
                console.error('Upload error:', err);
                setUploadProgress(`Error: ${err.message}`);
                throw err;
            } finally {
                setIsUploading(false);
                setUploadProgress(null);
            }
        }
        return uploadedCitations;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentInput = input;
        const currentFiles = [...pendingFiles];

        setInput('');
        setPendingFiles([]);
        setStreaming(true);

        const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: currentInput,
        };

        addMessage(userMessage);

        const assistantMessageId = uuidv4();
        addMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: '',
        });

        try {
            // 1. Upload pending files first if any
            if (currentFiles.length > 0) {
                await uploadFiles(currentFiles);
            }

            // 2. Send chat request
            const res = await fetch('http://localhost:8000/api/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMessage.content, thread_id: sessionId }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to start chat');
            }

            const { job_id } = await res.json();
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
                eventSource.close();
                setStreaming(false);
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
            {/* Custom Scrollbar Styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDarkMode ? '#27272a' : '#e4e4e7'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${isDarkMode ? '#3f3f46' : '#d4d4d8'};
                }
            `}</style>

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
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">A</div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">AI Search Chat</h1>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Online</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                if (window.confirm('Are you sure you want to clear all messages and reset the document database?')) {
                                    try {
                                        await fetch('http://localhost:8000/api/pdf/reset', { method: 'POST' });
                                        clearMessages();
                                        window.location.reload();
                                    } catch (err) {
                                        console.error('Failed to reset:', err);
                                        clearMessages();
                                        window.location.reload();
                                    }
                                }
                            }}
                            className="p-2.5 rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all active:scale-95 border border-transparent hover:border-red-500/20"
                            title="Clear Chat & Reset Database"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-95 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                        >
                            {isDarkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-indigo-600" />}
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar scroll-smooth">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
                            <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mb-2">
                                <Plus size={40} className="text-indigo-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">How can I help you today?</h2>
                                <p className="text-zinc-500 dark:text-zinc-400">Upload documents or images to start a conversation. I can read PDFs, images, Word docs, and more.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                {['Summarize a PDF', 'Analyze an image', 'Explain code', 'Extract text'].map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => setInput(item)}
                                        className="p-3 text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors text-left text-zinc-900 dark:text-zinc-100"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 max-w-4xl mx-auto w-full pb-10">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                {uploadProgress && (
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm shadow-xl shadow-indigo-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-20">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="font-medium">{uploadProgress}</span>
                    </div>
                )}

                <footer className="p-4 md:p-6 bg-transparent shrink-0">
                    <div className="max-w-3xl mx-auto relative">
                        {/* Pending Files List */}
                        <AnimatePresence>
                            {pendingFiles.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex flex-wrap gap-2 mb-3"
                                >
                                    {pendingFiles.map((file, idx) => (
                                        <div
                                            key={`${file.name}-${idx}`}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium group"
                                        >
                                            {file.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                                            <span className="max-w-35.5 truncate">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removePendingFile(idx)}
                                                className="p-0.5 hover:bg-indigo-600/20 rounded transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="relative group">
                            <div className={cn(
                                "flex items-center gap-2 p-2 rounded-2xl border transition-all duration-300 shadow-sm focus-within:shadow-xl focus-within:ring-4 focus-within:ring-indigo-500/10",
                                isDarkMode
                                    ? "bg-zinc-900 border-zinc-800 focus-within:border-indigo-500/50"
                                    : "bg-white border-zinc-200 focus-within:border-indigo-500/50"
                            )}>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-all active:scale-95"
                                    disabled={isUploading || isStreaming}
                                >
                                    <Paperclip size={22} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    multiple
                                    accept=".pdf,.txt,.md,.py,.js,.ts,.tsx,.html,.css,.json,.docx,image/*"
                                />
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything about your documents..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 py-4 text-base placeholder-zinc-500"
                                    disabled={isStreaming}
                                />
                                <button
                                    type="submit"
                                    disabled={(!input.trim() && pendingFiles.length === 0) || isStreaming}
                                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95"
                                >
                                    {isStreaming || isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </form>
                        <p className="text-[10px] text-center mt-3 text-zinc-500 uppercase tracking-widest font-bold opacity-60">
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
                        className="w-1/2 h-full bg-zinc-100 dark:bg-zinc-900 shadow-2xl z-20 border-l border-zinc-200 dark:border-zinc-800"
                    >
                        <div className="h-full flex flex-col">
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
                                <h3 className="font-bold flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-600" />
                                    Document Viewer
                                </h3>
                                <button
                                    onClick={() => useChatStore.getState().closePDF()}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <PDFViewer />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
