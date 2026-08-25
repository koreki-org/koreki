import React from 'react';
import { createPortal } from 'react-dom';
import { Shield, Zap, ChevronRight } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import { OnboardingHighlights, OnboardingModeCard, type OnboardingHighlight } from './onboarding/OnboardingModeCard';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { isPaidModesEnabled } from '@/lib/env-context';

/**
 * Erste Entscheidung nach dem Login: in welchem Modus korrigiert wird.
 *
 * Der Dialog ist BLOCKIEREND — es gibt keinen Schliessen-Weg, weil ohne Modus
 * kein Korrekturlauf moeglich ist. Deshalb bewusst kein Escape-Handler und kein
 * Klick-auf-Backdrop: beides waere ein Ausgang, den es fachlich nicht gibt.
 */

interface OnboardingModalProps {
    onSelectMode: (mode: 'STANDARD' | 'PURE' | 'TRIAL', agreement?: boolean) => void;
}

const TITLE_ID = 'onboarding-modal-title';
const DESCRIPTION_ID = 'onboarding-modal-description';
const CONSENT_ID = 'onboarding-trial-consent';
const CONSENT_HINT_ID = 'onboarding-trial-consent-hint';

const TRIAL_HIGHLIGHTS: OnboardingHighlight[] = [
    { label: 'Alle Funktionen von Standard' },
    { label: 'Kein AVV nötig (nur Demo-Daten)', tone: 'accent' }
];

const STANDARD_HIGHLIGHTS: OnboardingHighlight[] = [
    { label: 'Kein technisches Setup' },
    { label: 'AVV-Abschluss nötig', tone: 'info' }
];

const PURE_HIGHLIGHTS: OnboardingHighlight[] = [
    { label: 'Eigener Mistral-Schlüssel' },
    { label: 'Kein AVV mit uns nötig', tone: 'accent' }
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onSelectMode }) => {
    const [trialAgreement, setTrialAgreement] = React.useState(false);
    const { mounted, dialogRef } = useDialogA11y<HTMLDivElement>();
    const paidModesEnabled = isPaidModesEnabled();

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-background/80 backdrop-blur-glass p-4 md:p-8 animate-fade-in">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={TITLE_ID}
                aria-describedby={DESCRIPTION_ID}
                tabIndex={-1}
                className="my-auto max-h-[95vh] w-full max-w-[800px] overflow-y-auto rounded-hero border border-border bg-white p-6 text-center shadow-glass outline-none md:p-card-padding"
            >
                <header className="mb-6">
                    <Badge variant="subtle" className="mb-3">
                        Willkommen bei Koreki<span className="text-primary">.</span>
                    </Badge>
                    <h1 id={TITLE_ID} className="mb-2 font-outfit text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                        Korrektur-Modus wählen
                    </h1>
                    <p id={DESCRIPTION_ID} className="mx-auto max-w-[500px] text-sm leading-relaxed text-muted-foreground md:text-base">
                        Wie möchten Sie Ihre Korrekturen durchführen?
                    </p>
                </header>

                <section className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 focus-within:border-primary/40 md:p-card-padding-sm">
                    <div className="mb-1 flex flex-wrap items-center gap-3">
                        <h2 className="font-outfit text-lg font-bold tracking-tight text-foreground">Koreki Trial</h2>
                        <Badge variant="light">Kostenlos testen</Badge>
                    </div>
                    <p className="mb-3 text-sm leading-snug text-muted-foreground">
                        Alle Standard-Funktionen gratis testen mit Ihren 20 Start-Credits. Perfekt für den ersten Eindruck.
                    </p>

                    <OnboardingHighlights items={TRIAL_HIGHLIGHTS} className="mb-4" />

                    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                        <label
                            htmlFor={CONSENT_ID}
                            className="flex flex-1 cursor-pointer select-none items-center gap-3 rounded-xl border border-primary/20 bg-white p-3 text-sm font-medium leading-tight text-primary transition-colors duration-300 hover:border-primary/40"
                        >
                            <Checkbox
                                id={CONSENT_ID}
                                checked={trialAgreement}
                                aria-describedby={CONSENT_HINT_ID}
                                onChange={(event) => setTrialAgreement(event.target.checked)}
                            />
                            <span>Ich bestätige, dass ich <strong>keine echten Schülerdaten</strong> verwende.</span>
                        </label>

                        <Button
                            size="lg"
                            className="w-full sm:w-auto"
                            disabled={!trialAgreement}
                            aria-describedby={CONSENT_HINT_ID}
                            onClick={() => onSelectMode('TRIAL', true)}
                        >
                            Trial starten
                            <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" />
                        </Button>
                    </div>
                    <p id={CONSENT_HINT_ID} className="mt-2 text-sm text-muted-foreground">
                        Ohne diese Bestätigung lässt sich der Trial nicht starten.
                    </p>
                </section>

                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <OnboardingModeCard
                        icon={Shield}
                        title="Koreki Standard"
                        tagline="Rundum betreut"
                        description="Das Rundum-sorglos-Paket. Wir kümmern uns um die KI-Leistung."
                        highlights={STANDARD_HIGHLIGHTS}
                        ctaLabel="Standard wählen"
                        unavailable={!paidModesEnabled}
                        onSelect={() => onSelectMode('STANDARD')}
                    />
                    <OnboardingModeCard
                        icon={Zap}
                        title="Koreki Pure"
                        tagline="Datenschutz zuerst"
                        description="Maximale Privatsphäre mit eigenem Schlüssel. Die Daten bleiben lokal."
                        highlights={PURE_HIGHLIGHTS}
                        ctaLabel="Pure wählen"
                        unavailable={!paidModesEnabled}
                        onSelect={() => onSelectMode('PURE')}
                    />
                </div>

                <p className="text-sm font-medium text-muted-foreground">
                    Sie können den Modus später jederzeit in den Einstellungen ändern.
                </p>
            </div>
        </div>,
        document.body
    );
};

export default OnboardingModal;
