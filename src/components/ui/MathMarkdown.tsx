import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

interface MathMarkdownProps {
    content: string;
    className?: string;
}

/**
 * MathMarkdown
 * 🧠 Specialized rendering component for mathematical formulas and markdown.
 * Uses KaTeX for high-performance, client-side LaTeX rendering.
 */
export const MathMarkdown: React.FC<MathMarkdownProps> = ({ content, className }) => {
    // Industrial OCR Warning Detection: Highlight (?) markers even in rendered view
    const processContent = (text: string) => {
        if (!text) return text;
        // Robust pattern: Matches any word-like sequence ending with (?)
        const pattern = /(\S+\s*\(?\?\))/g;
        const parts = text.split(pattern);
        return parts.map((part, i) => {
            if (part.match(/\(\?\)/)) {
                return `<span class="bg-orange-100 border-b border-orange-300 text-orange-900 px-1 rounded-sm font-bold animate-pulse inline-block">${part}</span>`;
            }
            return part;
        }).join('');
    };

    return (
        <div className={cn(
            "prose-koreki prose-math max-w-none break-words leading-relaxed font-normal",
            "text-sm text-foreground/90",
            className
        )}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex, [rehypeRaw]]} // Enable raw HTML for OCR warnings
                components={{
                    // Style overrides for markdown elements to match Koreki aesthetics
                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                    table: ({ node, ...props }) => (
                        <div className="overflow-x-auto mb-4 rounded-lg border border-border shadow-sm">
                            <table className="min-w-full divide-y divide-border" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-muted/50" {...props} />,
                    th: ({ node, ...props }) => <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground" {...props} />,
                    td: ({ node, ...props }) => <td className="px-4 py-2 border-t border-border text-xs" {...props} />,
                }}
            >
                {processContent(content)}
            </ReactMarkdown>
        </div>
    );
};
