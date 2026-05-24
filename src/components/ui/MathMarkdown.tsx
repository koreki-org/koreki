import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

/**
 * Detects and formats markdown tables that have been squashed into a single line
 * (commonly caused by OCR or text extractions where newlines are stripped/lost).
 */
export function formatSquashedTables(text: string): string {
    if (!text) return text;

    // 1. Auto-Reconstruct Squashed Tables lacking alignment rows (|---|---|...)
    // If a line has pipes but no alignment row, we chunk it into columns and build a valid Markdown table.
    let processed = text;
    if (processed.includes('|') && !/\|\s*[-:]+\s*\|/.test(processed)) {
        const lines = processed.split('\n');
        const processedLines = lines.map(line => {
            const pipeCount = (line.match(/\|/g) || []).length;
            if (pipeCount >= 4) {
                const cells = line.split('|').map(c => c.trim());
                if (cells[0] === "") cells.shift();
                if (cells[cells.length - 1] === "") cells.pop();

                // Determine column count by scanning for the first data cell (numerical or generic names)
                let colCount = 7; // Standard fallback
                const headerKeywords = ['subnetz', 'subnet', 'bereich', 'anzahl', 'hosts', 'netzadresse', 'netid', 'netzmaske', 'maske', 'host', 'gateway', 'broadcast', 'spalte', 'column', 'titel', 'title', 'wert', 'value', 'beschreibung', 'description', 'datum', 'date', 'name', 'id', 'typ', 'type', 'klasse', 'class'];
                
                for (let i = 0; i < cells.length; i++) {
                    const cellLower = cells[i].toLowerCase();
                    const isHeader = headerKeywords.some(kw => cellLower.includes(kw));
                    if (!isHeader && i > 0 && (/\d/.test(cells[i]) || cells[i].length > 0)) {
                        colCount = i;
                        break;
                    }
                }

                if (colCount >= 3 && colCount <= 10) {
                    const rows: string[][] = [];
                    for (let i = 0; i < cells.length; i += colCount) {
                        const row = cells.slice(i, i + colCount);
                        if (row.length > 0) {
                            while (row.length < colCount) {
                                row.push("");
                            }
                            rows.push(row);
                        }
                    }

                    if (rows.length >= 2) {
                        const headerRow = `| ${rows[0].join(' | ')} |`;
                        const alignRow = `| ${Array(colCount).fill('---').join(' | ')} |`;
                        const dataRows = rows.slice(1).map(r => `| ${r.join(' | ')} |`).join('\n');
                        return `${headerRow}\n${alignRow}\n${dataRows}`;
                    }
                }
            }
            return line;
        });
        processed = processedLines.join('\n');
    }

    // 2. Fallback to existing squashed table recovery for standard GFM squashed tables
    if (!processed || !processed.includes('|') || !/\|\s*[-:]+\s*\|/.test(processed)) {
        return processed;
    }

    const lines = processed.split('\n');
    const processedLines = lines.map(line => {
        if (!line.includes('|') || !/\|\s*[-:]+\s*\|/.test(line)) {
            return line;
        }

        // If the line consists only of pipes, hyphens, colons, and spaces, it is a normal separator row of an already formatted table.
        if (/^[|\s-:]+$/.test(line)) {
            return line;
        }

        const parts = line.split('|');
        
        // Find consecutive alignment segments (only hyphens, colons, spaces)
        let bestSeqStart = -1;
        let bestSeqLen = 0;
        let currentSeqStart = -1;
        let currentSeqLen = 0;

        for (let i = 0; i < parts.length; i++) {
            if (/^\s*[-:]+\s*$/.test(parts[i])) {
                if (currentSeqLen === 0) {
                    currentSeqStart = i;
                }
                currentSeqLen++;
            } else {
                if (currentSeqLen > bestSeqLen) {
                    bestSeqLen = currentSeqLen;
                    bestSeqStart = currentSeqStart;
                }
                currentSeqLen = 0;
            }
        }
        if (currentSeqLen > bestSeqLen) {
            bestSeqLen = currentSeqLen;
            bestSeqStart = currentSeqStart;
        }

        // If we didn't find a valid alignment row
        if (bestSeqLen < 2) {
            return line;
        }

        const numCols = bestSeqLen;
        
        // Reconstruct the cells and skip the empty row separators.
        // A row boundary/separator is a purely whitespace segment at bestSeqStart - 2 index (modulo numCols + 1).
        const separatorOffset = bestSeqStart - 2;
        const period = numCols + 1;
        
        const cleanCells: string[] = [];
        for (let i = 0; i < parts.length - 2; i++) {
            const cellIdx = i;
            const isSeparator = (cellIdx - separatorOffset) % period === 0;
            if (isSeparator) {
                continue;
            }
            cleanCells.push(parts[i + 1]);
        }
        
        // Group clean cells into rows of size numCols
        const tableRows: string[][] = [];
        for (let i = 0; i < cleanCells.length; i += numCols) {
            const rowCells = cleanCells.slice(i, i + numCols);
            if (rowCells.length > 0) {
                while (rowCells.length < numCols) {
                    rowCells.push("");
                }
                tableRows.push(rowCells);
            }
        }
        
        // Render markdown table
        return tableRows.map(row => `| ${row.map(c => c.trim()).join(' | ')} |`).join('\n');
    });

    return processedLines.join('\n');
}

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
    // Industrial OCR Warning & Didactical Badge Detection
    const processContent = (text: string) => {
        if (!text) return text;
        // 1. OCR Warnings (?)
        const pattern = /(\S+\s*\(?\?\))/g;
        const parts = text.split(pattern);
        let joined = parts.map((part, i) => {
            if (part.match(/\(\?\)/)) {
                return `<span class="bg-orange-100 border-b border-orange-300 text-orange-900 px-1 rounded-sm font-bold animate-pulse inline-block">${part}</span>`;
            }
            return part;
        }).join('');

        // Helper to resolve styled color palettes based on correction symbol
        // Authentic school correction pen red (Rotstift) is used for all marks!
        const getBadgeStyles = () => {
            return {
                bg: 'bg-rose-50 dark:bg-rose-950/30',
                text: 'text-rose-600 dark:text-rose-400',
                border: 'border-rose-200/60 dark:border-rose-900/30'
            };
        };

        // 2. Generic Didactical Badges: [Mark] -> Styled Rotstift-Badge
        // Handled via raw HTML classes supported perfectly by rehypeRaw
        joined = joined.replace(/\[([A-Za-z?]{1,5})\]/g, (match, mark) => {
            const styles = getBadgeStyles();
            return `<span class="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-black ${styles.bg} ${styles.text} border ${styles.border} tracking-wider ml-1.5">${mark}</span>`;
        });

        return joined;
    };

    return (
        <div className={cn(
            "prose-koreki prose-math max-w-none break-words leading-relaxed font-normal",
            "text-sm text-foreground/90",
            className
        )}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
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
                    th: ({ node, ...props }) => <th className="px-4 py-2 text-left text-xs font-black uppercase tracking-widest text-muted-foreground" {...props} />,
                    td: ({ node, ...props }) => <td className="px-4 py-2 border-t border-border text-xs" {...props} />,
                }}
            >
                {processContent(formatSquashedTables(content))}
            </ReactMarkdown>
        </div>
    );
};
