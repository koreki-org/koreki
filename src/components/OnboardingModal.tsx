import React from 'react';
import { Shield, Zap, CheckCircle, ChevronRight, Info } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { Badge } from './ui/Badge';
import { isPaidModesEnabled } from '@/lib/env-context';

interface OnboardingModalProps {
    onSelectMode: (mode: 'STANDARD' | 'PURE' | 'TRIAL', agreement?: boolean) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onSelectMode }) => {
    const [trialAgreement, setTrialAgreement] = React.useState(false);
    return (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-xl flex items-center justify-center p-2 md:p-8 overflow-y-auto">
            <div className="bg-white max-w-[800px] w-full p-5 md:p-8 rounded-[32px] shadow-glass border border-border text-center animate-in zoom-in-95 duration-500 my-auto max-h-[95vh] overflow-y-auto scrollbar-thin">
                <div className="mb-6">
                    <Badge variant="outline" className="mb-3 px-3 py-0.5 bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-wider text-[0.6rem]">
                        Welcome to Koreki
                    </Badge>
                    <h1 className="text-2xl md:text-3xl font-black text-foreground mb-2 tracking-tight">Korrektur-Modus wählen</h1>
                    <p className="text-sm md:text-base text-muted-foreground max-w-[500px] mx-auto leading-relaxed">
                        Wie möchten Sie Ihre Korrekturen durchführen?
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-4">
                    <div
                        className="group relative bg-amber-50/30 border-2 border-amber-200 rounded-[24px] p-5 text-left cursor-pointer transition-all hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100/50"
                        onClick={() => {
                            if (trialAgreement) onSelectMode('TRIAL', trialAgreement);
                            else alert("Bitte bestätigen Sie die Nutzung ohne echte Schülerdaten.");
                        }}
                    >
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                                <Zap size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-lg font-bold text-foreground">Koreki Trial</h2>
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-none font-bold text-[9px]">Kostenlos testen</Badge>
                                </div>
                                <p className="text-[12px] text-muted-foreground mb-3 leading-snug">Alle Standard-Funktionen gratis testen mit Ihren 20 Start-Credits. Perfekt für den ersten Eindruck!</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-foreground">
                                        <CheckCircle size={14} className="text-amber-500" />
                                        <span>Alle Funktionen von Standard</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                                        <CheckCircle size={14} />
                                        <span>Kein AVV nötig (nur Demo-Daten)</span>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div
                                        className="w-full sm:flex-1 bg-white border border-amber-200 p-3 rounded-xl flex items-center gap-3 cursor-pointer select-none"
                                        onClick={(e) => { e.stopPropagation(); setTrialAgreement(!trialAgreement); }}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 border-2 rounded shrink-0 transition-all",
                                            trialAgreement ? "bg-amber-500 border-amber-500" : "bg-white border-amber-200"
                                        )}>
                                            {trialAgreement && <CheckCircle size={10} className="text-white" />}
                                        </div>
                                        <span className="text-[10px] text-amber-900 font-medium leading-tight">
                                            Ich bestätige, dass ich <b>keine echten Schülerdaten</b> verwende.
                                        </span>
                                    </div>

                                    <Button
                                        className={cn(
                                            "w-full sm:w-auto px-6 py-5 rounded-xl font-bold text-sm border-none shadow-lg transition-all",
                                            trialAgreement ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200" : "bg-muted text-muted-foreground shadow-none grayscale opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        Trial starten <ChevronRight size={18} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div
                        className={cn(
                            "group bg-white border-2 border-border rounded-[24px] p-5 text-left cursor-pointer transition-all flex flex-col relative overflow-hidden",
                            !isPaidModesEnabled() ? "opacity-60 grayscale pointer-events-none" : "hover:-translate-y-1 hover:border-primary hover:shadow-2xl hover:shadow-primary/10"
                        )}
                        onClick={() => onSelectMode('STANDARD')}
                    >
                        {!isPaidModesEnabled() && (
                            <div className="absolute top-4 right-4 z-10">
                                <Badge variant="secondary" className="bg-slate-200 text-slate-600 border-none font-bold text-[8px] uppercase">Demnächst</Badge>
                            </div>
                        )}
                        <div className="w-12 h-12 bg-primary/5 text-primary rounded-xl flex items-center justify-center mb-3">
                            <Shield size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-foreground mb-0.5">Koreki Standard</h2>
                        <Badge variant="secondary" className="w-fit mb-2 bg-primary/10 text-primary border-none font-bold text-[9px]">Managed & Bequem</Badge>
                        <p className="text-[12px] text-muted-foreground mb-4 flex-grow leading-snug">Das Rundum-Sorglos-Paket. Wir kümmern uns um die KI-Power.</p>

                        <div className="space-y-1.5 mb-6">
                            <div className="flex items-center gap-2 text-[11px] text-foreground">
                                <CheckCircle size={12} className="text-primary" />
                                <span>Kein technisches Setup</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-destructive font-semibold">
                                <Info size={12} />
                                <span>AVV-Abschluss nötig</span>
                            </div>
                        </div>

                        <Button className="w-full py-4 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-white border-none shadow-xl shadow-primary/20 group-hover:scale-[1.01] transition-transform">
                            {isPaidModesEnabled() ? 'Standard wählen' : 'In Kürze verfügbar'} <ChevronRight size={16} className="ml-2" />
                        </Button>
                    </div>

                    <div
                        className={cn(
                            "group bg-white border-2 border-border rounded-[24px] p-5 text-left cursor-pointer transition-all flex flex-col relative overflow-hidden",
                            !isPaidModesEnabled() ? "opacity-60 grayscale pointer-events-none" : "hover:-translate-y-1 hover:border-emerald-600 hover:shadow-2xl hover:shadow-emerald-100"
                        )}
                        onClick={() => onSelectMode('PURE')}
                    >
                        {!isPaidModesEnabled() && (
                            <div className="absolute top-4 right-4 z-10">
                                <Badge variant="secondary" className="bg-slate-200 text-slate-600 border-none font-bold text-[8px] uppercase">Demnächst</Badge>
                            </div>
                        )}
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                            <Zap size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-foreground mb-0.5">Koreki Pure</h2>
                        <Badge variant="secondary" className="w-fit mb-2 bg-emerald-100 text-emerald-800 border-none font-bold text-[9px]">Privacy-First (BYOK)</Badge>
                        <p className="text-[12px] text-muted-foreground mb-4 flex-grow leading-snug">Maximale Privatsphäre. Daten bleiben lokal.</p>

                        <div className="space-y-1.5 mb-6">
                            <div className="flex items-center gap-2 text-[11px] text-foreground">
                                <CheckCircle size={12} className="text-emerald-600" />
                                <span>Eigener Mistral Key</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-semibold">
                                <CheckCircle size={12} />
                                <span>Kein AVV mit uns nötig</span>
                            </div>
                        </div>

                        <Button className="w-full py-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xl shadow-emerald-200 group-hover:scale-[1.01] transition-transform">
                            {isPaidModesEnabled() ? 'Pure wählen' : 'In Kürze verfügbar'} <ChevronRight size={16} className="ml-2" />
                        </Button>
                    </div>
                </div>

                <p className="text-muted-foreground/60 text-sm font-medium">
                    Sie können den Modus später jederzeit in den Einstellungen ändern.
                </p>
            </div>
        </div>
    );
};

export default OnboardingModal;
