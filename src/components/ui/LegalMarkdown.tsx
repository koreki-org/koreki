/**
 * Rechtsdokumente lesbar darstellen — Betriebsanleitung, AVV, TOM, AGB.
 *
 * ANLASS (05.09.2026). Die Betriebsanleitung war in der Anwendung kaum lesbar:
 * Überschriften standen wie Fließtext da, Absätze klebten aneinander, und eine
 * Tabelle erschien als Zeile roher Striche — `| Ihre Nutzung | Anbieter | …`.
 *
 * Zwei Ursachen, die zusammen wirkten:
 *
 * 1. Alle vier Seiten trugen `prose prose-slate …`. Das Tailwind-Typografie-Plugin
 *    ist in diesem Projekt aber gar nicht eingebunden (`tailwind.config.js`,
 *    `plugins: []`) — jede dieser Klassen war wirkungslos. Ohne sie erbt Markdown
 *    nichts: Ein `h2` ist dann so groß wie ein Absatz.
 * 2. `react-markdown` beherrscht ohne `remark-gfm` keine Tabellen. Das Paket liegt
 *    seit jeher im Projekt und wird in `MathMarkdown` auch benutzt — auf den
 *    Rechtsseiten war es nur nie eingehängt.
 *
 * Statt das Plugin nachzurüsten, werden die Elemente hier ausdrücklich gestaltet.
 * Grund: `prose-slate` bringt Tailwinds eigene Graupalette mit, das Design-System
 * verlangt die HSL-Tokens (`text-foreground`, `border-border`, …). Ein Plugin, das
 * daneben eine zweite Farbwelt aufmacht, wäre die teurere Lösung.
 *
 * EINE Komponente für alle vier Seiten, weil die Klassenkette dort wortgleich stand.
 * Vier Kopien wären vier Gelegenheiten auseinanderzulaufen — genau die wiederkehrende
 * Fehlerklasse dieses Projekts.
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LegalMarkdownProps {
    content: string;
}

export const LegalMarkdown: React.FC<LegalMarkdownProps> = ({ content }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            // Der Titel steht bereits als Überschrift der Seite. Ein zweites Mal
            // wiederholt er nur die Zeile darüber.
            h1: ({ node, ...props }) => <h1 className="hidden" {...props} />,
            h2: ({ node, ...props }) => (
                <h2 className="font-outfit font-extrabold tracking-tight text-2xl text-foreground mt-12 mb-5 first:mt-0" {...props} />
            ),
            h3: ({ node, ...props }) => (
                <h3 className="font-outfit font-bold tracking-tight text-lg text-foreground mt-8 mb-3" {...props} />
            ),
            h4: ({ node, ...props }) => (
                <h4 className="font-outfit font-bold text-base text-foreground mt-6 mb-2" {...props} />
            ),
            p: ({ node, ...props }) => (
                <p className="text-muted-foreground leading-relaxed mb-4" {...props} />
            ),
            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-5 space-y-2" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-5 space-y-2" {...props} />,
            li: ({ node, ...props }) => <li className="text-muted-foreground leading-relaxed" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
            a: ({ node, ...props }) => (
                <a className="text-primary font-medium underline underline-offset-2 hover:no-underline transition-all duration-300" {...props} />
            ),
            // Die Anleitung hebt damit ihre Kernaussagen hervor — sie sollen sich vom
            // Fließtext abheben, ohne wie eine Warnung auszusehen.
            blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-primary/40 bg-primary/5 rounded-lg px-6 py-4 my-6 [&>p]:mb-0 [&>p:not(:last-child)]:mb-3" {...props} />
            ),
            code: ({ node, ...props }) => (
                <code className="font-mono text-xs bg-muted rounded px-1.5 py-0.5 text-foreground" {...props} />
            ),
            hr: ({ node, ...props }) => <hr className="my-12 border-border" {...props} />,
            // Waagerecht scrollbar statt überlaufend: Die Rollenübersicht hat drei
            // Spalten und steht auf schmalen Fenstern sonst über dem Rand.
            table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-6 rounded-lg border border-border">
                    <table className="min-w-full divide-y divide-border" {...props} />
                </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-muted/50" {...props} />,
            th: ({ node, ...props }) => (
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground" {...props} />
            ),
            td: ({ node, ...props }) => (
                <td className="px-4 py-3 border-t border-border text-sm text-muted-foreground align-top" {...props} />
            )
        }}
    >
        {content}
    </ReactMarkdown>
);
