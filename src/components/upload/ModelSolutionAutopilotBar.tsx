import React from 'react';
import { Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { cn } from '@/lib/utils';
import { Task } from '../../types';

export type BatchStatus = Record<number, 'waiting' | 'generating' | 'success' | 'error'>;

/**
 * Sammelerzeugung der Bewertungsgraphen ("Autopilot").
 *
 * Drei zusammengehoerige Zustaende in einem Streifen: das Angebot, alle
 * erkannten Rechenaufgaben auf einmal zu erfassen; der Fortschritt waehrend des
 * Laufs; und die Bestaetigung, wenn alle vorgeschlagenen Graphen stehen.
 *
 * Lag im Rumpf der ModelSolutionCard zwischen Aufgabenliste und Gruppenreitern.
 */
interface ModelSolutionAutopilotBarProps {
    /** Aufgaben, fuer die ein Graph vorgeschlagen, aber noch keiner erzeugt ist. */
    eligibleTaskIndices: number[];
    isBatchGenerating: boolean;
    batchStatus: BatchStatus;
    allSuggestedGraphsVerified: boolean;
    isLocked: boolean;
    /** Bestimmt, ob ein Credit-Hinweis am Knopf steht. */
    appMode?: 'PURE' | 'STANDARD' | 'TRIAL';
    tasksLayout: Task[];
    onStartAutoPilot: (configs: Record<number, { discipline: 'standard' | 'vlsm'; disablePoints: boolean }>) => void;
}

export const ModelSolutionAutopilotBar: React.FC<ModelSolutionAutopilotBarProps> = ({
    eligibleTaskIndices,
    isBatchGenerating,
    batchStatus,
    allSuggestedGraphsVerified,
    isLocked,
    appMode,
    tasksLayout,
    onStartAutoPilot
}) => (
    <>
                            {(eligibleTaskIndices.length > 0 || isBatchGenerating) && (
                                <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Sparkles size={13} className="text-primary shrink-0 animate-pulse" />
                                        <p className="text-xxs text-foreground truncate">
                                            {isBatchGenerating ? (
                                                <>
                                                    <strong className="text-primary">Berechnungsgraphen werden generiert</strong>
                                                    {` – ${Object.values(batchStatus).filter(s => s === 'success' || s === 'error').length} von ${Object.keys(batchStatus).length} abgeschlossen`}
                                                </>
                                            ) : (
                                                <>
                                                    <strong className="text-primary">{eligibleTaskIndices.length} {eligibleTaskIndices.length === 1 ? 'Aufgabe' : 'Aufgaben'} mit Rechenweg erkannt</strong>
                                                    {' – Berechnungsgraph erstellen für bessere Ergebnisse?'}
                                                </>
                                            )}
                                        </p>
                                        <KorekiTooltip
                                            title="KI-Berechnungsgraph"
                                            iconSize={13}
                                            position="bottom"
                                            widthClass="w-80"
                                            buttonClassName="h-5 w-5 text-primary/60"
                                            content={
                                                <>
                                                    Koreki erstellt im Hintergrund einen <strong>KI-generierten Berechnungsgraphen</strong> für jede erkannte Rechenaufgabe.
                                                    <br /><br />
                                                    Dieser Graph wertet Schülerantworten <strong>deterministisch</strong> aus — also mathematisch exakt, mit automatischer Folgefehler-Kompensation. Beim Korrigieren nutzt Koreki den Graph, um präzisere und fairere Ergebnisse zu liefern.
                                                </>
                                            }
                                        />
                                    </div>
                                    <Button
                                        disabled={isLocked || isBatchGenerating}
                                        onClick={() => {
                                            const autoConfigs: Record<number, { discipline: 'standard' | 'vlsm'; disablePoints: boolean }> = {};
                                            eligibleTaskIndices.forEach(idx => {
                                                const t = tasksLayout[idx];
                                                const isVlsm = t.predictedPluginDomain?.toLowerCase().includes('netzwerk') || t.predictedPluginDomain?.toLowerCase().includes('vlsm');
                                                autoConfigs[idx] = {
                                                    discipline: isVlsm ? 'vlsm' : 'standard',
                                                    disablePoints: true
                                                };
                                            });
                                            onStartAutoPilot(autoConfigs);
                                        }}
                                        size="sm"
                                        className={cn(
                                            "rounded-lg px-3 py-1 h-7 text-xxs font-bold tracking-wide text-primary-foreground uppercase flex items-center gap-1.5 shrink-0 transition-all duration-200",
                                            isBatchGenerating 
                                                ? "bg-muted-foreground/40 cursor-not-allowed" 
                                                : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm shadow-primary/20"
                                        )}
                                    >
                                        {isBatchGenerating ? (
                                            <>
                                                <Loader2 size={11} className="animate-spin" />
                                                <span>Läuft…</span>
                                            </>
                                        ) : appMode === 'STANDARD' || appMode === 'TRIAL' ? (
                                            <>
                                                <Sparkles size={11} />
                                                <span>GO</span>
                                                <span className="bg-white/20 rounded px-1 text-xxs font-black leading-none py-0.5">{eligibleTaskIndices.length} C</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={11} />
                                                <span>Starten</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                            {isBatchGenerating && Object.keys(batchStatus).length > 0 && (
                                <div className="w-full bg-muted rounded-full h-1 overflow-hidden -mt-2">
                                    <div 
                                        className="bg-primary h-full rounded-full transition-all duration-500" 
                                        style={{ 
                                            width: `${(Object.values(batchStatus).filter(s => s === 'success' || s === 'error').length / Object.keys(batchStatus).length) * 100}%` 
                                        }}
                                    />
                                </div>
                            )}

                            {allSuggestedGraphsVerified && (
                                <div className="relative overflow-hidden rounded-2xl bg-success/5 border border-success/20 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-success text-success-foreground p-2.5 rounded-xl shadow-sm">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-0.5 font-outfit">KI-Berechnungsstrukturen erfolgreich erstellt</h4>
                                            <p className="text-xs text-muted-foreground leading-normal font-medium">
                                                Alle Rechengraphen / Rechenketten für eine deterministische Korrektur von Aufgaben wurden erfolgreich generiert und getestet.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
    </>
);
