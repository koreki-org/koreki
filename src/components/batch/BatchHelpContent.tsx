import React from 'react';
import { Sparkles } from 'lucide-react';
import { KorekiTooltip } from '../ui/KorekiTooltip';

export const BatchHelpContent: React.FC = () => {
    return (
        <KorekiTooltip 
            title="Anleitung & Workflow"
            content={(
                <div className="space-y-2.5">
                    <div className="flex gap-3">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xxs italic">1</div>
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground font-bold">PDF trennen (optional):</strong> Nutzen Sie die Schere, um Sammel-PDFs in Einzelschüler aufzuteilen.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xxs italic">2</div>
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground font-bold">Anonymisierung:</strong> Namen im Scan bei Bedarf schwärzen.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xxs italic">3</div>
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground font-bold">Bilderkennung:</strong> Starten Sie die OCR für alle Scans.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xxs italic">4</div>
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground font-bold">KI-Korrektur:</strong> Alle Dokumente im Stapel verarbeiten.</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border/60">
                        <div className="bg-primary/5 p-2.5 rounded-xl flex gap-2.5 items-start">
                            <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
                            <p className="text-xxs text-primary/80 leading-normal italic font-medium">
                                Tipp: Sie können den erkannten Text jederzeit manuell im Editor nachbessern.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            position="bottom"
            widthClass="w-[22rem]"
            iconSize={18}
            className="inline-flex ml-2"
        />
    );
};
