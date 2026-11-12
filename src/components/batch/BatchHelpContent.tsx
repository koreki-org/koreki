import React from 'react';
import { Sparkles } from 'lucide-react';
import { KorekiTooltip } from '../ui/KorekiTooltip';

export const BatchHelpContent: React.FC = () => {
    return (
        <KorekiTooltip 
            title="Anleitung & Workflow"
            handbuch="korrigieren"
            content={(
                <div className="space-y-2.5">
                    <div className="flex gap-3">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xxs italic">1</div>
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground font-bold">PDF trennen (optional):</strong> Liegt die ganze Klasse in einem PDF, teilst du es mit der Schere in einzelne Arbeiten auf.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xxs italic">2</div>
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground font-bold">Namen schwärzen:</strong> bei Bedarf, und zwar vor der Bilderkennung.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xxs italic">3</div>
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground font-bold">Bilderkennung:</strong> Koreki liest alle Scans und macht daraus Text.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xxs italic">4</div>
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground font-bold">Korrigieren:</strong> Koreki macht für jede Arbeit einen Vorschlag.</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border/60">
                        <div className="bg-primary/5 p-2.5 rounded-xl flex gap-2.5 items-start">
                            <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
                            <p className="text-xxs text-primary/80 leading-normal italic font-medium">
                                Tipp: Den erkannten Text kannst du jederzeit von Hand verbessern.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            position="bottom"
            widthClass="w-[22rem]"
            iconSize={18}
            align="left"
            className="inline-flex ml-2"
        />
    );
};
