import React from 'react';
import { Message, useChatStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { User, Bot, Loader2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';
    const { openPDF, isStreaming } = useChatStore();

    const handleCitationClick = (citation: any) => {
        const filename = citation.link || citation.text || "source_document.pdf";
        const pdfUrl = `http://localhost:8000/api/pdf/files/${filename}`;
        openPDF(pdfUrl, 1);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex w-full mb-8 gap-3 md:gap-4",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div className={cn(
                "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                isUser
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    : "bg-indigo-600 text-white"
            )}>
                {isUser ? <User size={18} /> : <Bot size={20} />}
            </div>

            <div className={cn(
                "flex flex-col max-w-[85%] md:max-w-[75%]",
                isUser ? "items-end" : "items-start"
            )}>
                <div className={cn(
                    "p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed",
                    isUser
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none"
                )}>
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {!isUser && !message.content && (
                        <div className="flex gap-1 py-1">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                        </div>
                    )}
                </div>

                {!isUser && isStreaming && message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                        {/* Only show the latest tool call to reduce noise */}
                        {[message.toolCalls[message.toolCalls.length - 1]].map((tool) => (
                            <div key={tool.id} className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 px-2 py-1 rounded-md border border-indigo-100/50 dark:border-indigo-900/20 w-fit animate-pulse">
                                <Loader2 size={10} className="animate-spin" />
                                <span className="uppercase tracking-widest">{tool.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {!isUser && message.citations && message.citations.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {message.citations.map((citation) => (
                            <button
                                key={`${message.id}-cit-${citation.id}`}
                                onClick={() => handleCitationClick(citation)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-all border border-indigo-100 dark:border-indigo-900/30 shadow-sm"
                            >
                                <FileText size={14} />
                                <span className="max-w-[150px] truncate">{citation.text || `Source ${citation.id}`}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
