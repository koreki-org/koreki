import React from 'react';
import { X, CheckCircle, Zap, Shield, CreditCard } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { Badge } from './ui/Badge';
import { Checkbox } from './ui/Checkbox';

interface CreditsModalProps {
    onClose: () => void;
    onSelect: (bundleType: 'small' | 'medium' | 'large') => void;
    upgrading: boolean;
    appMode?: 'STANDARD' | 'PURE' | 'TRIAL' | 'UNSET';
}

const CreditsModal: React.FC<CreditsModalProps> = ({ onClose, onSelect, upgrading, appMode = 'STANDARD' }) => {
    const [acceptedTerms, setAcceptedTerms] = React.useState(false);
    const isTrial = appMode === 'TRIAL';

    const pricingPlans = [
        {
            id: 'small' as const,
            name: 'Koreki Small',
            price: '10,00 €',
            credits: '100 Credits',
            features: [
                '1 Credit: 1 Seite Text',
                '3 Credits: 1 Seite Handschrift',
                'Excel & Einzelfeedback'
            ],
            badge: null
        },
        {
            id: 'medium' as const,
            name: 'Koreki Medium',
            price: '25,00 €',
            credits: '300 Credits',
            features: [
                'Alle Small-Funktionen',
                '50 Credits geschenkt',
                '100 % DSGVO konform'
            ],
            badge: 'Top-Preis - 50 Credits geschenkt',
            isMain: true
        },
        {
            id: 'large' as const,
            name: 'Koreki Large',
            price: '50,00 €',
            credits: '700 Credits',
            features: [
                'Alle Medium-Funktionen',
                'Bestes Preis-Leistungs-Verhältnis',
                'Volle Flexibilität'
            ],
            badge: 'Bestes Angebot - 200 Credits geschenkt'
        }
    ];

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[1000px] max-h-[95vh] bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-white flex flex-col items-center animate-in zoom-in-95 duration-500 overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-200"
                    onClick={onClose}
                >
                    <X size={24} />
                </Button>

                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100">
                    <CreditCard size={32} />
                </div>

                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Guthaben aufladen</h2>
                <p className="text-slate-500 font-medium mb-10">Wähle ein Paket, um sofort weiterzuarbeiten.</p>

                <div className={cn(
                    "w-full max-w-2xl flex items-start gap-4 p-5 rounded-2xl mb-8 border transition-all duration-300",
                    isTrial ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50/50 border-blue-100 text-blue-900'
                )}>
                    <Shield size={24} className={cn("shrink-0 mt-0.5", isTrial ? 'text-amber-500' : 'text-blue-500')} />
                    <div className="text-sm leading-relaxed">
                        {isTrial
                            ? <strong className="font-bold">Im Trial-Modus können keine Credits gekauft werden. Die kostenpflichtigen Modi (Standard & Pure) sind aktuell noch in Vorbereitung und in Kürze verfügbar.</strong>
                            : "Für die Nutzung mit echten Schülerdaten ist ein AVV Ihrer Schule erforderlich."}
                    </div>
                </div>

                {!isTrial && (
                    <div className="mb-10 group cursor-pointer">
                        <label className="flex items-center justify-center gap-3 cursor-pointer select-none">
                            <div className="relative flex items-center">
                                <Checkbox
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 hover:border-blue-400"
                                />
                                {acceptedTerms && (
                                    <CheckCircle size={12} className="absolute inset-0 m-auto text-white pointer-events-none" />
                                )}
                            </div>
                            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                Ich akzeptiere die <a href="/app/compliance/agb" target="_blank" className="text-blue-600 font-bold hover:underline">AGB</a> und den <a href="/app/compliance/avv" target="_blank" className="text-blue-600 font-bold hover:underline">AVV Ihrer Schule</a>.
                            </span>
                        </label>
                    </div>
                )}

                <div className={cn(
                    "grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8",
                    isTrial && "opacity-50 grayscale pointer-events-none"
                )}>
                    {pricingPlans.map((plan) => (
                        <div
                            key={plan.id}
                            onClick={() => !isTrial && acceptedTerms && onSelect(plan.id)}
                            className={cn(
                                "relative group p-8 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer flex flex-col items-center text-center",
                                plan.isMain
                                    ? "bg-white border-blue-600 shadow-xl shadow-blue-500/10 scale-105 z-10"
                                    : "bg-slate-50/50 border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-lg"
                            )}
                        >
                            {plan.badge && (
                                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white border-none rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-lg">
                                    {plan.badge}
                                </Badge>
                            )}

                            <h3 className="text-lg font-bold text-slate-900 mb-2">{plan.name}</h3>
                            <div className="text-3xl font-black text-slate-900 mb-1">{plan.price}</div>
                            <div className="text-sm font-bold text-blue-600 mb-6">{plan.credits}</div>

                            <ul className="space-y-3 mb-8 w-full">
                                {plan.features.map((feature, fidx) => (
                                    <li key={fidx} className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-600">
                                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                disabled={!acceptedTerms || isTrial}
                                className={cn(
                                    "w-full h-11 rounded-1.5xl font-bold transition-all duration-300",
                                    plan.isMain
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600"
                                )}
                            >
                                {isTrial ? 'Gesperrt' : (plan.isMain ? 'Jetzt kaufen' : 'Auswählen')}
                                {plan.isMain && !isTrial && <Zap size={14} className="ml-2 fill-current" />}
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex items-center flex-col gap-2">
                    <p className="text-[10px] text-slate-400 italic">
                        (Aktuell nur für Kunden mit Wohnsitz in Deutschland verfügbar)
                    </p>
                    <div className="flex items-center gap-4 text-slate-300 opacity-50 grayscale contrast-125">
                        {/* Mock payment icons if needed, but keeping it clean for now */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditsModal;
