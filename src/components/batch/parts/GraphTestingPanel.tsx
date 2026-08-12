import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { GradingGraph } from '@/lib/grading/types';
import type { ExpectedValues } from '@/lib/grading/graph-preview';

/**
 * Probelauf-Reiter des Bewertungsgraphen.
 *
 * Links werden Schuelerwerte simuliert, rechts steht das Urteil der Engine.
 * Die Rechenregeln dahinter liegen in lib/grading/graph-preview.ts und
 * GraphRunner — dieser Reiter zeigt sie nur an.
 */
interface GraphTestingPanelProps {
    graph: GradingGraph;
    playgroundInputs: Record<string, string>;
    setPlaygroundInputs: (inputs: Record<string, string>) => void;
    playgroundResult: any;
    /** Erwartungshorizont, dient als Platzhalter in den Eingabefeldern. */
    evaluatedContext: ExpectedValues;
    /** Vergibt die Engine Punkte, oder entscheidet das Modell? */
    isPointsDisabled: boolean;
    onFillPerfect: () => void;
    onRun: () => void;
}

export const GraphTestingPanel: React.FC<GraphTestingPanelProps> = ({
    graph,
    playgroundInputs,
    setPlaygroundInputs,
    playgroundResult,
    evaluatedContext,
    isPointsDisabled,
    onFillPerfect,
    onRun
}) => (
                        <div className="flex-grow flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0 bg-muted p-4 lg:p-8 gap-4 lg:gap-8">
                            {/* Left Panel: Inputs (45% width) */}
                            <div className="w-full lg:w-[45%] flex flex-col shrink-0 bg-white border border-border shadow-glass rounded-hero h-auto lg:h-full overflow-visible lg:overflow-hidden">
                                {/* Sticky Header with Actions */}
                                <div className="px-6 py-4 border-b border-border bg-muted flex justify-between items-center shrink-0">
                                    <div>
                                        <h4 className="text-xs font-black uppercase text-foreground font-outfit">Schüler-Eingaben</h4>
                                        <p className="text-xs text-muted-foreground font-medium font-inter">Simulationswerte zum Testen</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={onFillPerfect}
                                            className="h-8 text-xs font-bold border-primary/20 text-primary bg-primary/5 hover:bg-primary/5 rounded-lg px-2.5"
                                        >
                                            Musterlösung
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            onClick={onRun}
                                            className="h-8 text-xs font-black bg-primary hover:bg-primary text-white rounded-lg px-3.5 shadow-md shadow-primary/10"
                                        >
                                            Berechnen
                                        </Button>
                                    </div>
                                </div>

                                {/* Scrollable Inputs Grid */}
                                <div className="flex-grow lg:flex-1 lg:overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    {graph.variables.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-4 font-medium text-center">Keine Variablen deklariert. Erstelle zuerst einen Graphen.</p>
                                    ) : (
                                        <div className="space-y-3.5">
                                            {(graph?.variables || []).map(v => (
                                                <div key={v.id} className="flex flex-col gap-1">
                                                    <label className="text-xs font-bold text-muted-foreground font-mono truncate">{v.id}</label>
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            value={playgroundInputs[v.id] || ''}
                                                            onChange={(e) => setPlaygroundInputs({ ...playgroundInputs, [v.id]: e.target.value })}
                                                            placeholder={`Erwartet: ${evaluatedContext.context[v.id]}`}
                                                            className="w-full text-xs font-semibold font-mono border border-border rounded-xl px-3 py-2 bg-muted focus:bg-white focus:border-primary focus:ring-0 focus:outline-hidden transition-all text-foreground"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Simulation Results (55% width) */}
                            <div className="w-full lg:w-[55%] flex flex-col min-h-0 bg-white border border-border shadow-glass rounded-hero h-auto lg:h-full overflow-visible lg:overflow-hidden shrink-0">
                                {playgroundResult ? (
                                    <div className="flex flex-col h-full overflow-hidden">
                                        {/* Sticky Score Header */}
                                        <div className="px-6 py-4 border-b border-border bg-muted flex justify-between items-center shrink-0">
                                            <div className="text-left">
                                                <h4 className="text-xs font-black uppercase text-foreground font-outfit">Simulations-Ergebnis</h4>
                                                <p className="text-xs text-muted-foreground font-medium font-inter">Bewertung des Schülerversuchs</p>
                                            </div>
                                            {isPointsDisabled ? (
                                                <Badge className="bg-primary/5 border-primary/20 text-primary font-black px-3 py-1 text-xs rounded-full">
                                                    Variablen: {playgroundResult.stepResults.filter((s: any) => s.status === 'correct' || s.status === 'consecutive_correct').length} / {playgroundResult.stepResults.length} korrekt
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-primary/5 border-primary/20 text-primary font-black px-3 py-1 text-xs rounded-full">
                                                    Gesamtpunkte: {playgroundResult.totalPoints} / {playgroundResult.maxPoints} P
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Scrollable Individual Step Results */}
                                        <div className="flex-grow lg:flex-1 lg:overflow-y-auto p-6 space-y-2.5 custom-scrollbar">
                                            {playgroundResult.stepResults.map((step: any) => (
                                                <div 
                                                    key={step.variableId} 
                                                    className={cn(
                                                        "p-3 rounded-2xl border flex items-center justify-between text-xs transition-all gap-4",
                                                        step.status === 'correct' ? "bg-success/10 border-success/20 text-success" :
                                                        step.status === 'consecutive_correct' ? "bg-primary/5 border-primary/20 text-primary" :
                                                        "bg-destructive/10 border-destructive/20 text-destructive"
                                                    )}
                                                >
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold truncate">{step.variableId}</span>
                                                            <Badge className={cn(
                                                                "text-xxs py-0 px-1.5 rounded font-black uppercase border shrink-0",
                                                                step.status === 'correct' ? "bg-success/10 border-success/20 text-success" :
                                                                step.status === 'consecutive_correct' ? "bg-primary/5 border-primary/20 text-primary" :
                                                                "bg-destructive/10 border-destructive/20 text-destructive"
                                                            )}>
                                                                {step.status === 'correct' ? 'KORREKT' :
                                                                 step.status === 'consecutive_correct' ? 'FOLGEFEHLER OK' :
                                                                 'PRIMÄRFEHLER'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs opacity-80 leading-relaxed font-medium">
                                                            {step.note}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right font-medium">
                                                            <p className="text-xs opacity-60">Schüler-Wert</p>
                                                            <p className="font-mono font-bold">{step.studentValue !== undefined ? String(step.studentValue) : 'Fehlt'}</p>
                                                        </div>
                                                        {!isPointsDisabled && (
                                                            <Badge variant="outline" className="border-transparent font-black px-2.5 py-1 rounded-full text-xs">
                                                                +{step.points} P
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-grow lg:flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-4 select-none min-h-[250px] lg:min-h-0">
                                        <div className="w-16 h-16 bg-primary/5 border border-primary/20 rounded-3xl flex items-center justify-center text-primary mb-2">
                                            <Eye size={28} className="animate-pulse" />
                                        </div>
                                        <div className="max-w-xs space-y-1.5">
                                            <h4 className="font-extrabold text-foreground text-sm font-outfit leading-none mb-1">Bereit zum Testen 🧪</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed font-medium font-inter">
                                                Fülle die Musterlösung aus, verändere Werte absichtlich, um Fehler zu simulieren, und klicke auf <strong>Berechnen</strong>, um die Folgefehler-Diagnose live zu prüfen.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
);
