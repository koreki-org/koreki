import React from 'react';
import { X, FileText, FolderOpen, Zap, ChevronRight, Highlighter, Sparkles, ShieldCheck, Languages, Wrench } from 'lucide-react';
import Logo from './Logo';
import { Button } from './ui/Button';

interface QuickStartModalProps {
    onClose: () => void;
}

const QuickStartModal: React.FC<QuickStartModalProps> = ({ onClose }) => {
    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-glass animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[550px] bg-white rounded-hero p-6 shadow-glass border border-border animate-in zoom-in-95 duration-500 my-auto max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="overflow-y-auto scrollbar-thin p-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute h-auto top-6 right-6 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all duration-200"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </Button>

                    <div className="flex flex-col items-center mb-4 text-center">
                        <Logo
                            size={36}
                            showText
                            textLarge
                            className="mb-2"
                            subtitle="KI-Assistent"
                        />
                        <div className="space-y-0.5">
                            <p className="text-lg font-black text-foreground tracking-tight">Willkommen bei Koreki!</p>
                            <p className="text-xs text-muted-foreground font-medium">In nur <strong className="font-extrabold text-foreground">sechs</strong> einfachen Schritten zum Ziel.</p>
                        </div>
                    </div>

                    <div className="space-y-2 mb-8">
                        <div className="group flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-xl hover:bg-background hover:border-primary/40 transition-all duration-300">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={18} />
                            </div>
                            <div className="space-y-0">
                                <h3 className="font-bold text-foreground text-xs">1. Vorbereitung</h3>
                                <p className="text-xxs text-muted-foreground leading-snug">
                                    Musterlösung laden (KI erkennt Aufgaben/Punkte automatisch). Für Rechenaufgaben können optional Rechengraphen zur präzisen Erkennung von Folgefehler-Pfaden erstellt werden.
                                </p>
                            </div>
                        </div>

                        <div className="group flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-xl hover:bg-background hover:border-primary/40 transition-all duration-300">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                                <Wrench size={18} />
                            </div>
                            <div className="space-y-0">
                                <h3 className="font-bold text-foreground text-xs">2. Didaktik & KI-Kalibrierung</h3>
                                <p className="text-xxs text-muted-foreground leading-snug">
                                    Konfiguriere im Header deine <strong className="font-extrabold text-foreground">Expertise</strong> (Fach-Prompts), aktiviere modulare <strong className="font-extrabold text-foreground">Skills</strong> (z. B. mathematische Äquivalenz), trainiere den <strong className="font-extrabold text-foreground">Erfahrungsschatz</strong> (Präzedenzfälle) oder wähle die passende <strong className="font-extrabold text-foreground">Intelligenz</strong> (Denktiefe der KI).
                                </p>
                            </div>
                        </div>

                        <div className="group flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-xl hover:bg-background hover:border-primary/40 transition-all duration-300">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                                <FolderOpen size={18} />
                            </div>
                            <div className="space-y-0">
                                <h3 className="font-bold text-foreground text-xs">3. Import & Moodle</h3>
                                <p className="text-xxs text-muted-foreground leading-snug">
                                    Schülerarbeiten als PDF oder Scans hochladen. Moodle XLSX-Exporte werden voll unterstützt.
                                </p>
                            </div>
                        </div>

                        <div className="group flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-xl hover:bg-background hover:border-primary/40 transition-all duration-300">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                                <ShieldCheck size={18} />
                            </div>
                            <div className="space-y-0">
                                <h3 className="font-bold text-foreground text-xs">4. Anonymisierung</h3>
                                <p className="text-xxs text-muted-foreground leading-snug">
                                    Namen schützen. Handschriften, Namen und personenbezogene Daten bei Bedarf direkt im Scan schwärzen.
                                </p>
                            </div>
                        </div>

                        <div className="group flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-xl hover:bg-background hover:border-primary/40 transition-all duration-300">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                                <Languages size={18} />
                            </div>
                            <div className="space-y-0">
                                <h3 className="font-bold text-foreground text-xs">5. Texterkennung (OCR)</h3>
                                <p className="text-xxs text-muted-foreground leading-snug">
                                    Handschriften digitalisieren. Die KI liest gedruckte und geschriebene Schülertexte zuverlässig aus.
                                </p>
                            </div>
                        </div>

                        <div className="group flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-xl hover:bg-background hover:border-primary/40 transition-all duration-300">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                                <Sparkles size={18} />
                            </div>
                            <div className="space-y-0">
                                <h3 className="font-bold text-foreground text-xs">6. Auswertung & Export</h3>
                                <p className="text-xxs text-muted-foreground leading-snug">
                                    Korrekturen und automatische Korrekturzeichen prüfen, Schüler-Feedback ansehen und Statistiken exportieren.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-6">
                        <Button
                            size="sm"
                            onClick={onClose}
                            className="w-full sm:w-auto px-10 py-5 rounded-xl font-bold text-base bg-primary hover:bg-primary/90 text-white border-none shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all"
                        >
                            Alles klar, los geht&apos;s! <ChevronRight size={18} className="ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default QuickStartModal;
