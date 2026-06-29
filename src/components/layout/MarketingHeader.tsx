import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X } from 'lucide-react';
import Logo from '../Logo';
import { Button, buttonVariants } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';
import { getKorekiMode } from '@/lib/env-context';

const MarketingHeader: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const router = useRouter();
    const { userData, authLoading } = useAuth();
    const [mode, setMode] = useState<'saas' | 'community' | 'desktop'>('saas');

    useEffect(() => {
        setMode(getKorekiMode());
    }, []);

    return (
        <>
            <header className="relative my-4 left-0 right-0 mx-auto w-[90%] max-w-7xl flex justify-between items-center px-8 py-4 z-50 bg-background/85 backdrop-blur-xl border border-white/40 rounded-full shadow-lg transition-all duration-300 animate-fade-down">
                <Link href="/">
                    <Logo showText size={40} className="relative z-10 cursor-pointer" />
                </Link>
                
                <div className="flex items-center gap-3">
                    <nav className="hidden md:flex items-center gap-1">
                        {[
                            { name: 'Features', href: '/features' },
                            { name: 'Sicherheit', href: '/security' },
                            ...(mode === 'saas' ? [
                                { name: 'Desktop', href: '/desktop' },
                                { name: 'Self-Hosting', href: '/self-hosting' }
                            ] : [])
                        ].map((item) => {
                            const isActive = router.pathname === item.href;
                            return (
                                <Link 
                                    key={item.href}
                                    href={item.href} 
                                    className={cn(
                                        buttonVariants({ variant: 'ghost', size: 'sm' }), 
                                        "px-4 rounded-full transition-all duration-300 font-semibold tracking-tight text-[15px]",
                                        isActive 
                                            ? "text-primary bg-primary/5 hover:bg-primary/10 shadow-sm" 
                                            : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                                    )}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {!authLoading && userData ? (
                        <Link href="/app" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), "bg-primary rounded-full px-5 font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-95")}>
                            Dashboard
                        </Link>
                    ) : (
                        <Link 
                            href="/login" 
                            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), "text-primary bg-primary/5 border-primary/10 rounded-full px-5 font-bold shadow-sm hover:shadow-md transition-all")}
                        >
                            Einloggen
                        </Link>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden flex items-center justify-center p-2 text-muted-foreground hover:text-primary"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Menü öffnen"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </Button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <div className={`fixed inset-0 bg-background/95 backdrop-blur-3xl z-[999] flex items-center justify-center transition-all duration-500 ease-out ${isMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-5 pointer-events-none'}`}>
                <div className="flex flex-col items-center gap-8">
                    {[
                        { name: 'Features', href: '/features' },
                        { name: 'Sicherheit', href: '/security' },
                        ...(mode === 'saas' ? [
                            { name: 'Desktop', href: '/desktop' },
                            { name: 'Self-Hosting', href: '/self-hosting' }
                        ] : [])
                    ].map((item) => {
                        const isActive = router.pathname === item.href;
                        return (
                            <Link 
                                key={item.href}
                                href={item.href} 
                                className={cn(
                                    "text-2xl font-black tracking-tighter transition-all duration-300 font-outfit",
                                    isActive ? "text-primary scale-110" : "text-foreground hover:text-primary"
                                )}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                    {!authLoading && userData ? (
                        <Link 
                            href="/app" 
                            className="text-xs font-black uppercase tracking-[0.2em] text-primary-foreground bg-primary px-10 py-4 rounded-full shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95" 
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <Link 
                            href="/login" 
                            onClick={() => setIsMenuOpen(false)}
                            className="text-xs font-black uppercase tracking-[0.2em] text-primary-foreground bg-primary px-10 py-4 rounded-full shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95"
                        >
                            Einloggen
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
};

export default MarketingHeader;
