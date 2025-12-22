import React, { useState } from 'react';
import { Message, useChatStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { User, Bot, Loader2, FileText, Copy, Check, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';
    const { openPDF, isStreaming, isDarkMode, messages } = useChatStore();
    const [copied, setCopied] = useState(false);
    const isLastMessage = message.id === messages[messages.length - 1]?.id;

    const handleCitationClick = (citation: any) => {
        const filename = citation.link || citation.text || "source_document.pdf";
        const pdfUrl = `http://localhost:8000/api/pdf/files/${filename}`;
        openPDF(pdfUrl, 1);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex w-full mb-8 gap-3 md:gap-4 group",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div className={cn(
                "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                isUser
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    : "bg-indigo-600 text-white"
            )}>
                {isUser ? <User size={18} /> : <Bot size={20} />}
            </div>

            <div className={cn(
                "flex flex-col max-w-[85%] md:max-w-[80%]",
                isUser ? "items-end" : "items-start"
            )}>
                <div className={cn(
                    "relative p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed",
                    isUser
                        ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                        : isDarkMode
                            ? "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-sm"
                            : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-sm"
                )}>
                    {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const codeString = String(children).replace(/\n$/, '');

                                        return !inline && match ? (
                                            <div className="relative my-4 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                                <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                                                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                                                        <Terminal size={14} />
                                                        {match[1]}
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(codeString)}
                                                        className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors text-zinc-500"
                                                        title="Copy code"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{
                                                        margin: 0,
                                                        padding: '1rem',
                                                        fontSize: '0.875rem',
                                                        backgroundColor: 'transparent',
                                                    }}
                                                    {...props}
                                                >
                                                    {codeString}
                                                </SyntaxHighlighter>
                                            </div>
                                        ) : (
                                            <code className={cn("bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md font-mono text-indigo-600 dark:text-indigo-400", className)} {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}

                    {!isUser && !message.content && (
                        <div className="flex gap-1 py-1">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                        </div>
                    )}

                    {/* Message Copy Button */}
                    {!isUser && message.content && (
                        <button
                            onClick={() => copyToClipboard(message.content)}
                            className="absolute -right-10 top-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-indigo-600"
                            title="Copy message"
                        >
                            {copied ? <Check size={16} className="text-zinc-500" /> : <Copy size={16} />}
                        </button>
                    )}
                </div>

                {!isUser && isStreaming && isLastMessage && message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
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
                                <span className="max-w-37.5 truncate">{citation.text || `Source ${citation.id}`}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
