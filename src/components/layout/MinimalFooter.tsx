import React from 'react';
import Link from 'next/link';
import { Github, Heart } from 'lucide-react';
import { isLocalInstance } from '@/lib/env-context';

const MinimalFooter: React.FC = () => {
    return (
        <footer className="mt-auto py-6 px-8 border-t border-border/50 bg-background/40 backdrop-blur-md">
            <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xxs font-bold text-muted-foreground uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <span>&copy; {new Date().getFullYear()} Koreki. Open Source. Developed with</span>
                    <Heart size={10} className="text-primary fill-primary" />
                    <span>in Germany.</span>
                </div>
                <div className="flex items-center gap-8">
                    {!isLocalInstance() && (
                        <>
                            <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
                            <Link href="/privacy" className="hover:text-foreground transition-colors">Datenschutz</Link>
                        </>
                    )}
                    <a 
                        href="https://github.com/koreki-org/koreki" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                        <Github size={12} />
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default MinimalFooter;
