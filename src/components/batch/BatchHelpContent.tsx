import React from 'react';
import { Sparkles } from 'lucide-react';
import { KorekiTooltip } from '../ui/KorekiTooltip';

export const BatchHelpContent: React.FC = () => {
    return (
        <KorekiTooltip 
            title="Anleitung & Workflow"
            content={(
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xs italic">1</div>
                        <p className="text-sm text-slate-600 leading-relaxed"><strong className="text-slate-900">PDF trennen (optional):</strong> Nutzen Sie die Schere, um Sammel-PDFs in Einzelschüler aufzuteilen.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xs italic">2</div>
                        <p className="text-sm text-slate-600 leading-relaxed"><strong className="text-slate-900">Anonymisierung:</strong> Namen im Scan bei Bedarf schwärzen.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xs italic">3</div>
                        <p className="text-sm text-slate-600 leading-relaxed"><strong className="text-slate-900">Bilderkennung:</strong> Starten Sie die OCR für alle Scans.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 font-bold text-xs italic">4</div>
                        <p className="text-sm text-slate-600 leading-relaxed"><strong className="text-slate-900">KI-Korrektur:</strong> Alle Dokumente im Stapel verarbeiten.</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100/60">
                        <div className="bg-primary/5 p-3 rounded-xl flex gap-3 items-start">
                            <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                            <p className="text-[0.7rem] text-primary/80 leading-normal italic font-medium">
                                Tipp: Sie können den erkannten Text jederzeit manuell im Editor nachbessern.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            position="bottom"
            iconSize={18}
            className="inline-flex ml-2"
        />
    );
};
