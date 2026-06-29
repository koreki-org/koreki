import React from 'react';
import Head from 'next/head';
import { FileText, ArrowLeft, Zap, Printer, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
import { getLegalDocument } from '@/lib/legal';
import { logtoClient } from '@/lib/logto';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { GetServerSideProps } from 'next';

interface AGBPageProps {
    content: string;
    version: string;
}

export default function AGBPage({ content, version }: AGBPageProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 selection:text-primary font-sans leading-relaxed">
            <Head>
                <title>Allgemeine Geschäftsbedingungen – Koreki</title>
                <meta name="robots" content="noindex, nofollow" />
                <style>{`
                    @media print {
                        @page {
                            margin: 2cm;
                        }
                        body {
                            background-color: white !important;
                            color: black !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .print-container {
                            box-shadow: none !important;
                            border: none !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            width: 100% !important;
                            max-width: none !important;
                        }
                        h1 {
                            font-size: 24pt !important;
                            margin-bottom: 20pt !important;
                            color: black !important;
                        }
                        h2 {
                            font-size: 18pt !important;
                            margin-top: 25pt !important;
                            margin-bottom: 12pt !important;
                        }
                        p, li {
                            font-size: 11pt !important;
                            line-height: 1.5 !important;
                        }
                    }
                `}</style>
            </Head>

            {/* Header / Nav */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border no-print">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                            <Zap size={20} />
                        </div>
                        <span className="text-xl font-outfit font-extrabold tracking-tighter text-foreground">
                            Koreki<span className="text-primary">.</span> Terms
                        </span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.back()}
                        className="group text-muted-foreground hover:text-foreground transition-all font-bold"
                    >
                        <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                        Zurück
                    </Button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-16 md:py-24 print-container">
                <div className="relative">
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-[120px] opacity-50 -z-10 no-print" />
                    
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs mb-4 no-print">
                        <FileText size={12} />
                        Allgemeine Geschäftsbedingungen (AGB)
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-outfit font-extrabold text-foreground mb-8 tracking-tight leading-[1.1]">
                        Nutzungsbedingungen <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">für die Zukunft der Korrektur.</span>
                    </h1>

                    <div className="bg-card rounded-3xl p-10 md:p-16 shadow-xl shadow-border/50 border border-border prose prose-slate max-w-none prose-headings:font-outfit prose-headings:font-extrabold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-muted-foreground prose-li:text-muted-foreground print-container">
                        <div className="mb-10 p-6 bg-muted rounded-2xl border border-border text-xs flex items-center gap-3 no-print">
                            <Lock size={20} className="text-muted-foreground" />
                            <p className="m-0 leading-relaxed font-medium">
                                Dieses Dokument ist schreibgeschützt und steht zur Einsicht und zum Druck bereit.
                            </p>
                        </div>

                        <ReactMarkdown 
                            components={{
                                h1: ({node, ...props}) => <h1 className="hidden" {...props} />, // Hide MD title
                                hr: ({node, ...props}) => <hr className="my-12 border-border" {...props} />,
                            }}
                        >
                            {content}
                        </ReactMarkdown>

                        <div className="mt-20 pt-10 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-8 no-print">
                            <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                Version: {version} <br />
                                Koreki Terms of Service
                            </div>
                            <Button 
                                variant="outline" 
                                onClick={() => window.print()}
                                className="rounded-2xl border-border text-muted-foreground hover:bg-white active:scale-95 transition-all"
                            >
                                <Printer size={18} className="mr-2" />
                                Als PDF drucken
                            </Button>
                        </div>

                        {/* Hidden print footer */}
                        <div className="hidden print:block mt-20 pt-10 border-t border-border text-[9pt] text-muted-foreground">
                            Gedruckt am {new Date().toLocaleDateString('de-DE')} | Koreki AGB Dokument | Version {version}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-foreground text-white py-12 md:py-20 mt-20 text-center no-print">
                <div className="max-w-4xl mx-auto px-6">
                    <p className="text-muted-foreground text-sm mb-4">Professionelle Nutzungsbedingungen für Koreki.</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                        &copy; {new Date().getFullYear()} Max Mustermann UG (haftungsbeschränkt) - Koreki<span className="text-primary">.</span> Alle Rechte vorbehalten.
                    </p>
                </div>
            </footer>
        </div>
    );
}

import { getLatestLegalDocument } from '@/lib/legal';
import type { GetStaticProps } from 'next';

export const getStaticProps: GetStaticProps = async () => {
    const type = 'agb'; // Set corresponding type for each file
    const doc = getLatestLegalDocument(type);
    
    return { 
        props: { 
            content: doc?.content || 'Dokument nicht gefunden.', 
            version: doc?.version || '0.0' 
        } 
    };
};
