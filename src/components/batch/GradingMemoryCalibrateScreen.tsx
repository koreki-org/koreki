import React from 'react';
import { BookOpen, ArrowRight, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Task } from '../../types';
import { UseGradingMemoryModalStateProps, useGradingMemoryModalState } from '../../hooks/useGradingMemoryModalState';

interface GradingMemoryCalibrateScreenProps {
    state: ReturnType<typeof useGradingMemoryModalState>;
    tasksLayout?: Task[];
}

export const GradingMemoryCalibrateScreen: React.FC<GradingMemoryCalibrateScreenProps> = ({ state, tasksLayout }) => {
    const {
        syntheticAnswers, setSyntheticAnswers,
        activeCaseIndex, setActiveCaseIndex,
        calibrations, setStep,
        isSaving,
        handleUpdateCalibration, handleSkip, handleSave,
        getCharacterBadgeStyle, getCharacterTitle
    } = state;

                        const activeCase = syntheticAnswers[activeCaseIndex];
                        const activeKey = activeCase ? activeCase.uid : '';
                        const cal = calibrations[activeKey];
                        if (!activeCase || !cal) return null;

                        return (
                            <div className="flex-1 flex flex-col gap-5 min-h-0">
                                
                                {/* Wizard Progress Indicator */}
                                <div className="bg-muted border border-border rounded-xl p-4 shrink-0 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black text-xs">
                                            {activeCaseIndex + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-foreground font-outfit">
                                                Kalibrierung: Fall {activeCaseIndex + 1} von {syntheticAnswers.length}
                                            </h4>
                                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
                                                Zugeordnete Aufgabe: <span className="text-primary font-extrabold">{activeCase.taskName || 'Allgemein'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {syntheticAnswers.map((_, idx) => {
                                            const isCompleted = idx < activeCaseIndex;
                                            const isActive = idx === activeCaseIndex;
                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`h-2.5 rounded-full transition-all duration-300 ${isActive ? 'w-10 bg-primary' : isCompleted ? 'w-4 bg-success' : 'w-4 bg-secondary'}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fullscreen 2-Spalten-Layout */}
                                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
                                    
                                    {/* Left Column: Spacious Student Answer Text */}
                                    <div className="w-full lg:w-1/2 flex flex-col bg-muted/50 border border-border rounded-xl p-5 md:p-6 min-h-[220px] lg:h-full overflow-hidden">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border shrink-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${getCharacterBadgeStyle(activeCase.character)}`}>
                                                    {getCharacterTitle(activeCase.character)}
                                                </span>
                                                <h4 className="text-sm font-extrabold text-foreground font-outfit">
                                                    Simulierter Text
                                                </h4>
                                            </div>
                                            <span className="text-xs text-muted-foreground font-bold uppercase">Abgabe editieren</span>
                                        </div>

                                        <Textarea 
                                            value={activeCase.text || ''}
                                            onChange={(e) => {
                                                const newText = e.target.value;
                                                setSyntheticAnswers(prev => prev.map((ans, idx) => idx === activeCaseIndex ? { ...ans, text: newText } : ans));
                                            }}
                                            placeholder="Simulierter Schülertext..."
                                            className="flex-1 bg-background border border-border rounded-xl p-4 md:p-5 font-mono text-xs md:text-sm text-foreground leading-relaxed overflow-y-auto custom-scrollbar resize-none focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 shadow-sm transition-all"
                                        />
                                    </div>

                                    {/* Right Column: Calibration Form Cockpit */}
                                    <div className="w-full lg:w-1/2 flex flex-col bg-background border border-border rounded-xl p-5 md:p-6 lg:h-full overflow-y-auto custom-scrollbar gap-5">
                                        <div className="border-b border-border pb-3 shrink-0 flex items-center justify-between">
                                            <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2 font-outfit">
                                                <BookOpen size={16} className="text-primary" />
                                                Bewertungs-Cockpit
                                            </h4>
                                            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/10">
                                                KI-Vorschlag geladen
                                            </span>
                                        </div>

                                        {/* 1. Task Association Dropdown */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                Zugeordnete Aufgabe aus der Musterlösung:
                                            </label>
                                            {tasksLayout && tasksLayout.length > 0 ? (
                                                <select 
                                                    value={cal.taskName}
                                                    onChange={(e) => {
                                                        const selectedName = e.target.value;
                                                        const matched = tasksLayout.find(t => t.name === selectedName);
                                                        if (matched) {
                                                            const maxP = Number(matched.maxPoints || 5);
                                                            handleUpdateCalibration(activeKey, {
                                                                taskName: selectedName,
                                                                maxPoints: maxP,
                                                                pointsObtained: Math.min(cal.pointsObtained, maxP)
                                                            });
                                                        }
                                                    }}
                                                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all font-bold shadow-sm"
                                                >
                                                    {tasksLayout.map(t => (
                                                        <option key={t.name} value={t.name}>
                                                            {t.name} (max. {t.maxPoints} Punkte)
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Input 
                                                        type="text" 
                                                        value={cal.taskName} 
                                                        onChange={e => handleUpdateCalibration(activeKey, { taskName: e.target.value })}
                                                        placeholder="z.B. Aufgabe 1a"
                                                        className="flex-1 bg-muted border border-border rounded-xl px-3.5 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all font-bold shadow-sm"
                                                    />
                                                    <Input 
                                                        type="number" 
                                                        min="1"
                                                        value={cal.maxPoints} 
                                                        onChange={e => {
                                                            const maxP = Math.max(1, parseInt(e.target.value) || 5);
                                                            handleUpdateCalibration(activeKey, { 
                                                                maxPoints: maxP,
                                                                pointsObtained: Math.min(cal.pointsObtained, maxP)
                                                            });
                                                        }}
                                                        placeholder="Max"
                                                        className="w-20 bg-muted border border-border rounded-xl px-3 py-3 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all font-bold shadow-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. Interactive Points Slider */}
                                        <div className="space-y-3 pt-3 border-t border-border">
                                            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                <span>Menschliche Wertung (Slider):</span>
                                                <span className="text-primary font-extrabold text-sm md:text-base bg-primary/10 px-3 py-1 rounded-lg border border-primary/10 shadow-sm font-mono">
                                                    {cal.pointsObtained} von {cal.maxPoints} Punkten
                                                </span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max={cal.maxPoints} 
                                                step="0.5"
                                                value={cal.pointsObtained}
                                                onChange={e => handleUpdateCalibration(activeKey, { pointsObtained: parseFloat(e.target.value) })}
                                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground font-bold px-1">
                                                <span>0 Punkte (Deduction)</span>
                                                <span>{Math.round(cal.maxPoints / 2)} P (Hälfte)</span>
                                                <span>{cal.maxPoints} P (Full Score)</span>
                                            </div>
                                        </div>

                                        {/* 3. Pedagogical Correction Notes */}
                                        <div className="space-y-2 pt-3 border-t border-border flex-1 flex flex-col min-h-[140px]">
                                            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                Korrekturbegründung (correctionNotes):
                                            </label>
                                            <Textarea 
                                                rows={4}
                                                value={cal.correctionNotes}
                                                onChange={e => handleUpdateCalibration(activeKey, { correctionNotes: e.target.value })}
                                                placeholder="Ausformulierte Begründung für den Punktabzug..."
                                                className="w-full flex-1 bg-muted border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 resize-none font-medium leading-relaxed shadow-sm"
                                            />
                                        </div>

                                        {/* 4. Student Feedback Input */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                Feedback an Schüler (Optional):
                                            </label>
                                            <Input 
                                                type="text"
                                                value={cal.feedback}
                                                onChange={e => handleUpdateCalibration(activeKey, { feedback: e.target.value })}
                                                placeholder="Pädagogischer Ratschlag zur Fehlervermeidung..."
                                                className="w-full bg-muted border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 font-medium shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Calibration Controls Footer */}
                                <div className="flex items-center justify-between pt-4 mt-2 border-t border-border shrink-0">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => {
                                            if (activeCaseIndex > 0) {
                                                setActiveCaseIndex(prev => prev - 1);
                                            } else {
                                                setStep('start');
                                            }
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground font-bold flex items-center gap-1.5"
                                    >
                                        Zurück
                                    </Button>
                                    
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <Button 
                                            variant="ghost" 
                                            onClick={handleSkip}
                                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 font-bold px-4 h-11 rounded-xl transition-all"
                                        >
                                            Fall überspringen
                                        </Button>
                                        
                                        {activeCaseIndex < syntheticAnswers.length - 1 ? (
                                            <Button 
                                                onClick={() => setActiveCaseIndex(prev => prev + 1)}
                                                className="px-6 py-3 h-11 bg-primary hover:opacity-90 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-md/50 text-xs md:text-sm border-0 transition-all"
                                            >
                                                Nächster Fall
                                                <ArrowRight size={14} />
                                            </Button>
                                        ) : (
                                            <Button 
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-6 py-3 h-11 bg-primary hover:opacity-90 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-md/50 text-xs md:text-sm border-0 transition-all"
                                            >
                                                {isSaving ? (
                                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                                                ) : (
                                                    <Save size={16} />
                                                )}
                                                Erfahrungsschatz sichern
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );

};
