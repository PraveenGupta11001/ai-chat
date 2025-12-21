"use client";

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

export const PDFViewer: React.FC = () => {
    const { pdfViewer, closePDF } = useChatStore();
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(pdfViewer.pageNumber || 1);
    const [scale, setScale] = useState<number>(1.0);
    const [isClient, setIsClient] = useState(false);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [isPDF, setIsPDF] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
        if (pdfViewer.fileUrl) {
            console.log("DEBUG: PDFViewer loading URL:", pdfViewer.fileUrl);
            const isPdfFile = pdfViewer.fileUrl.toLowerCase().endsWith('.pdf');
            setIsPDF(isPdfFile);
            setError(null);

            if (isPdfFile) {
                pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
            } else {
                // Fetch text content for non-PDF files
                fetch(pdfViewer.fileUrl)
                    .then(res => {
                        if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
                        return res.text();
                    })
                    .then(text => {
                        console.log("DEBUG: Fetched text content length:", text.length);
                        setTextContent(text);
                    })
                    .catch(err => {
                        console.error("DEBUG: Failed to fetch document text:", err);
                        setError(err.message);
                    });
            }
        }
    }, [pdfViewer.fileUrl]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    if (!isClient || !pdfViewer.isOpen || !pdfViewer.fileUrl) return null;

    return (
        <div className="flex flex-col h-full bg-zinc-100 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm z-10">
                <h2 className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-50">
                    Document Viewer
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <ZoomOut size={18} />
                    </button>
                    <span className="text-xs text-zinc-500 w-10 text-center font-medium">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <ZoomIn size={18} />
                    </button>
                    <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-2" />
                    <button onClick={closePDF} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-zinc-200/50 dark:bg-zinc-950/50">
                {error ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 max-w-md text-center">
                        <X size={48} className="mb-4 opacity-50" />
                        <h3 className="font-bold mb-2">Failed to load document</h3>
                        <p className="text-sm">{error}</p>
                    </div>
                ) : isPDF ? (
                    <Document
                        file={pdfViewer.fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="shadow-2xl rounded-sm overflow-hidden"
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="max-w-full"
                        />
                    </Document>
                ) : (
                    <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 p-8 shadow-xl rounded-lg overflow-auto">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-200">
                            {textContent || "Loading content..."}
                        </pre>
                    </div>
                )}
            </div>

            {numPages > 0 && (
                <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-6">
                    <button
                        disabled={pageNumber <= 1}
                        onClick={() => setPageNumber(p => p - 1)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 tabular-nums">
                        Page {pageNumber} <span className="opacity-40 mx-1">/</span> {numPages}
                    </span>
                    <button
                        disabled={pageNumber >= numPages}
                        onClick={() => setPageNumber(p => p + 1)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};
