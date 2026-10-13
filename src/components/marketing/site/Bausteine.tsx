import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Gemeinsame Bausteine der Marketing-Seiten (Stand 12.10.2026).
 *
 * Jede Seite setzt sich aus denselben Teilen zusammen — Abschnittskopf,
 * Produktbild, Kachel —, damit Startseite, Funktionen, Desktop und
 * Self-Hosting nicht wieder auseinanderlaufen.
 */

/*
 * Das Raster (12.10.2026). Gemessen war vorher: Abschnittsabstaende von 112
 * bis 257 px, Bildkanten bei x=162, 176 und 202 px, Kachel-Innenabstaende von
 * 24 bis 32 px. Jetzt gilt EINE Regel je Groesse:
 *
 *   Abschnitt   48 px oben und unten (Desktop), 40 px (mobil) — zwei
 *               Abschnitte stehen also immer 96 bzw. 80 px auseinander.
 *   Kopf → Inhalt  32 px          Kicker → Titel 12 px, Titel → Text 16 px
 *   Raster      24 px Luecke      Kachel 32 px Innenabstand
 *   Breite      eine Inhaltsbreite fuer Text, Bilder und Raster
 */

/** Seitenbreite und Seitenrand: eine Stelle statt vieler. */
export const Breite: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("max-w-6xl mx-auto px-6 md:px-page-inline", className)}>{children}</div>
);

interface AbschnittProps {
    children: React.ReactNode;
    id?: string;
    /** Getoentes Band ueber die volle Breite — gleicher Abstand wie jeder andere Abschnitt. */
    band?: boolean;
    /** Kopfband in zartem Indigo (nur erster Abschnitt einer Seite). */
    kopfband?: boolean;
    className?: string;
}

/** Jeder Abschnitt jeder Marketing-Seite. Abstaende entstehen nur hier. */
export const Abschnitt: React.FC<AbschnittProps> = ({ children, id, band, kopfband, className }) => (
    <section
        id={id}
        className={cn(
            "relative isolate py-10 md:py-12 scroll-mt-16",
            band && "bg-primary/[0.04] border-y border-primary/10",
            kopfband && "kopfband",
            className
        )}
    >
        <Breite>{children}</Breite>
    </section>
);

/** Abstand zwischen Abschnittskopf und Inhalt. */
export const NACH_KOPF = "mt-8";
/** Luecke in Kachel-Rastern. */
export const RASTER = "grid gap-6";

interface AbschnittsKopfProps {
    kicker?: string;
    titel: React.ReactNode;
    text?: React.ReactNode;
    zentriert?: boolean;
    className?: string;
}

export const AbschnittsKopf: React.FC<AbschnittsKopfProps> = ({ kicker, titel, text, zentriert, className }) => (
    <div className={cn(zentriert && "text-center", className)}>
        {kicker && <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">{kicker}</p>}
        <h2 className={cn(
            "text-3xl md:text-5xl font-extrabold tracking-[-0.045em] leading-[1.05] text-foreground max-w-3xl",
            zentriert && "mx-auto"
        )}>
            {titel}
        </h2>
        {text && (
            <p className={cn("mt-4 text-lg text-muted-foreground max-w-2xl", zentriert && "mx-auto")}>{text}</p>
        )}
    </div>
);

interface ProduktbildProps {
    src: string;
    alt: string;
    className?: string;
    /** Kleinere Kacheln brauchen weniger Rahmen und Schatten. */
    klein?: boolean;
}

/** Ein echter Screenshot aus der App, in einem ruhigen Rahmen. */
export const Produktbild: React.FC<ProduktbildProps> = ({ src, alt, className, klein }) => (
    <figure className={cn(
        "bg-card",
        klein ? "rounded-xl p-1.5 shadow-card" : "rounded-2xl p-2 shadow-lift",
        className
    )}>
        {/* eslint-disable-next-line @next/next/no-img-element -- statischer Export (Desktop) kennt keine Bildoptimierung */}
        <img
            src={src}
            alt={alt}
            loading="lazy"
            className={cn("block w-full h-auto border border-border/60", klein ? "rounded-lg" : "rounded-xl")}
        />
    </figure>
);

/** Weisse Kachel mit Kartenschatten. */
export const Kachel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("bg-card rounded-2xl shadow-card p-6 md:p-8", className)}>{children}</div>
);

/** Symbol in einer getoenten Flaeche, fuer Kacheln und Listen. */
export const Symbol: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0", className)}>
        {children}
    </div>
);

/** Hervorgehobene Woerter im Markenverlauf — wie auf den Social-Media-Grafiken. */
export const Markenverlauf: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="markenverlauf whitespace-nowrap pr-1">{children}</span>
);
