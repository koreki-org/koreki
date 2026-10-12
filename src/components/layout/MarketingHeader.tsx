import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, Download } from 'lucide-react';
import Logo from '../Logo';
import { Button, buttonVariants } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';
import { getKorekiMode } from '@/lib/env-context';

/**
 * Kopfleiste der Marketing-Seiten: schmal, ueber die volle Breite, leicht
 * durchscheinend (schwebende Ebene, koreki-design-system §5).
 *
 * Desktop und Self-Hosting erscheinen nur auf der oeffentlichen Seite; eine
 * lokale Installation verweist nicht auf sich selbst.
 */
const MarketingHeader: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const router = useRouter();
    const { userData, authLoading } = useAuth();
    const [mode, setMode] = useState<'saas' | 'community' | 'desktop'>('saas');

    useEffect(() => {
        setMode(getKorekiMode());
    }, []);

    const eintraege = [
        { name: 'Funktionen', href: '/features' },
        { name: 'Datenschutz', href: '/security' },
        ...(mode === 'saas' ? [
            { name: 'Desktop', href: '/desktop' },
            { name: 'Für Schulen', href: '/self-hosting' }
        ] : [])
    ];

    const eingeloggt = !authLoading && !!userData;
    const hauptaktion = mode === 'saas'
        ? { href: '/desktop', text: 'Herunterladen', icon: <Download size={15} /> }
        : { href: eingeloggt ? '/app' : '/login', text: 'Zur App', icon: null };

    return (
        <>
            <header className="w-full bg-card/80 backdrop-blur-md border-b border-border/70">
                <div className="max-w-6xl mx-auto px-6 md:px-page-inline h-16 flex items-center gap-8">
                    <Link href="/" aria-label="Koreki – Startseite">
                        <Logo showText size={32} className="cursor-pointer" />
                    </Link>

                    <nav className="hidden md:flex items-center gap-1 flex-1">
                        {eintraege.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm transition-colors",
                                    router.pathname === item.href
                                        ? "text-foreground font-medium"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto md:ml-0 flex items-center gap-2">
                        {mode === 'saas' && (
                            <Link
                                href={eingeloggt ? '/app' : '/login'}
                                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "hidden sm:inline-flex")}
                            >
                                {eingeloggt ? 'Zur App' : 'Anmelden'}
                            </Link>
                        )}
                        <Link href={hauptaktion.href} className={buttonVariants({ variant: 'default', size: 'sm' })}>
                            {hauptaktion.icon}{hauptaktion.text}
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-9 w-9 text-muted-foreground"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
                        >
                            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Mobiles Menue */}
            {isMenuOpen && (
                <div className="md:hidden bg-card border-b border-border px-6 py-4 flex flex-col gap-1 animate-fade-in">
                    {eintraege.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className={cn(
                                "px-3 py-3 rounded-lg text-base",
                                router.pathname === item.href ? "text-foreground font-medium bg-foreground/5" : "text-muted-foreground"
                            )}
                        >
                            {item.name}
                        </Link>
                    ))}
                    {mode === 'saas' && (
                        <Link
                            href={eingeloggt ? '/app' : '/login'}
                            onClick={() => setIsMenuOpen(false)}
                            className="px-3 py-3 rounded-lg text-base text-muted-foreground"
                        >
                            {eingeloggt ? 'Zur App' : 'Anmelden'}
                        </Link>
                    )}
                </div>
            )}
        </>
    );
};

export default MarketingHeader;
