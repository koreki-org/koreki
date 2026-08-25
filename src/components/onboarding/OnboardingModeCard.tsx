import React from 'react';
import { CheckCircle, ChevronRight, Info, type LucideIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

/**
 * Bausteine der Modus-Auswahl im Onboarding.
 *
 * Sie stehen hier und nicht in `OnboardingModal.tsx`, weil "Standard" und "Pure"
 * bis auf Text und Symbol identisch waren — zwei wortgleiche Bloecke, die beim
 * naechsten Textwechsel auseinanderlaufen. Der Trial-Block im Modal nutzt
 * dieselbe Merkmalsliste weiter.
 */

/** Tonalitaet einer Merkmalszeile. */
export type OnboardingHighlightTone = 'default' | 'accent' | 'info';

export interface OnboardingHighlight {
    label: string;
    /**
     * `info` kennzeichnet eine PFLICHT (z. B. AVV-Abschluss), keinen Fehler.
     * Deshalb `warning` und nicht `destructive`: rot signalisiert dem Nutzer,
     * etwas sei kaputt — hier ist nur etwas zu erledigen.
     */
    tone?: OnboardingHighlightTone;
}

const HIGHLIGHT_TONE: Record<OnboardingHighlightTone, string> = {
    default: 'text-foreground',
    accent: 'text-primary font-semibold',
    info: 'text-warning font-semibold'
};

interface OnboardingHighlightsProps {
    items: OnboardingHighlight[];
    className?: string;
}

export const OnboardingHighlights: React.FC<OnboardingHighlightsProps> = ({ items, className }) => (
    <ul className={cn('space-y-2', className)}>
        {items.map((item) => {
            const tone = item.tone ?? 'default';
            const Icon = tone === 'info' ? Info : CheckCircle;
            return (
                <li key={item.label} className={cn('flex items-start gap-2 text-sm leading-snug', HIGHLIGHT_TONE[tone])}>
                    <Icon className={cn('h-5 w-5 shrink-0', tone === 'default' && 'text-primary')} aria-hidden="true" />
                    <span>{item.label}</span>
                </li>
            );
        })}
    </ul>
);

export interface OnboardingModeCardProps {
    icon: LucideIcon;
    title: string;
    tagline: string;
    description: string;
    highlights: OnboardingHighlight[];
    ctaLabel: string;
    /** Modus ist in dieser Installation noch nicht freigeschaltet. */
    unavailable?: boolean;
    onSelect: () => void;
}

export const OnboardingModeCard: React.FC<OnboardingModeCardProps> = ({
    icon: Icon,
    title,
    tagline,
    description,
    highlights,
    ctaLabel,
    unavailable = false,
    onSelect
}) => (
    <section
        className={cn(
            'relative flex flex-col rounded-xl border border-border bg-background p-4 text-left shadow-md transition-all duration-300 md:p-card-padding-sm',
            !unavailable && 'hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 focus-within:border-primary/40'
        )}
    >
        {unavailable && (
            <Badge variant="subtle" className="absolute right-4 top-4">Demnächst</Badge>
        )}

        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 text-primary">
            <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2 className="font-outfit text-lg font-bold tracking-tight text-foreground">{title}</h2>
        <Badge variant="light" className="mt-2 w-fit">{tagline}</Badge>
        <p className="mt-3 text-sm leading-snug text-muted-foreground">{description}</p>

        <OnboardingHighlights items={highlights} className="mb-6 mt-4 flex-grow" />

        <Button size="lg" className="w-full" disabled={unavailable} onClick={onSelect}>
            {unavailable ? 'In Kürze verfügbar' : ctaLabel}
            <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" />
        </Button>
    </section>
);
