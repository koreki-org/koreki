import React from 'react';
import { Sparkles, GraduationCap, Check, Loader2, AlertCircle } from 'lucide-react';
import { PointInput } from '../../ui/PointInput';
import { Button } from '@/components/ui/Button';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import Dropdown from '@/components/ui/Dropdown';
import { BatchFile, Task } from '../../../types';
import { VertrauensChip } from './VertrauensChip';
import { useTaskReviewActions } from '@/hooks/useTaskReviewActions';
import { useSecondOpinion } from '@/hooks/useSecondOpinion';
import { schuelerAntwort } from '@/lib/schueler-antwort';

/**
 * Die Einschaetzung ZU EINER Aufgabe.
 * 🧠
 *
 * Am 08.09.2026 aus `BatchTaskAnalysisCard` herausgeloest, damit linke und
 * rechte Spalte der Korrekturansicht sich je Aufgabe ausrichten koennen: Dafuer
 * muss ein gemeinsames Raster ueber die Aufgaben laufen und pro Aufgabe zwei
 * Zellen erzeugen, statt zweier Listen nebeneinander.
 *
 * Die Zelle haelt bewusst KEINEN eigenen Zustand. Er kommt gebuendelt aus den
 * beiden Hooks, die genau einmal oberhalb der Aufgabenliste aufgerufen werden —
 * `useGradingMemories` darin ruft eine API ohne Cache auf, eine Instanz pro
 * Aufgabe waere ein Abruf pro Aufgabe.
 */

interface BatchTaskAnalysisCellProps {
    item: BatchFile;
    idx: number;
    task: Task;
    tasksLayout: Task[];
    studentSections: string[];
    getConfidenceColor: (conf?: number) => string;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
    /** Zustand aus dem gemeinsamen Hook — nicht je Zelle neu aufgebaut. */
    aktionen: ReturnType<typeof useTaskReviewActions>;
    zweitmeinung: ReturnType<typeof useSecondOpinion>;
}

export const BatchTaskAnalysisCell: React.FC<BatchTaskAnalysisCellProps> = ({
    item,
    idx,
    task,
    tasksLayout,
    studentSections,
    getConfidenceColor,
    handleReviewPointChange,
    handleReviewFeedbackChange,
    aktionen,
    zweitmeinung
}) => {
    const {
        memories, activeMemoryId, targetMemoryId, setTargetMemoryId,
        savingTaskId, setSavingTaskId, isPending, handleStartAnonymize, isSaaSService
    } = aktionen;
    const { setShowSecondOpinionDrawer, setActiveDoubleCheckTask } = zweitmeinung;

    const aiResult = item.result?.tasks?.find(t =>
        t.name === task.name ||
        t.name?.toLowerCase() === task.name?.toLowerCase() ||
        task.name?.toLowerCase().includes(t.name?.toLowerCase() || '') ||
        t.name?.toLowerCase().includes(task.name?.toLowerCase() || '')
    );
    const confidence = aiResult?.confidence;
    const taskName = task.name || '';
    const safeTaskName = taskName.replace(/\s+/g, '-').toLowerCase();
    /** `maxPoints` ist auf `Task` string|number; undefined bleibt undefined. */
    const maxPoints = task.maxPoints === undefined ? undefined : Number(task.maxPoints);

    return (
        <div id={`task-card-${idx}-${safeTaskName}`} className="space-y-3 group/card">
            {/* Kopfzeile IN der Komponente: sonst zwei Zeilen gegen eine links. */}
            <EditableMathArea
                leftAction={<>
                    <span className="text-xs font-bold text-foreground font-outfit whitespace-nowrap">
                        <span className="inline sm:hidden">{taskName.replace(/Aufgabe\s*/i, 'A.')}</span>
                        <span className="hidden sm:inline">{taskName}</span>
                    </span>
                    <VertrauensChip vertrauen={confidence} getConfidenceColor={getConfidenceColor} />
                    <div className="ml-auto pl-2">
                        <PointInput
                            value={Number(aiResult?.pointsObtained ?? 0)}
                            maxPoints={Number(task.maxPoints || 0)}
                            onChange={(val) => handleReviewPointChange(idx, taskName, val)}
                            showMaxPoints={true}
                        />
                    </div>
                </>}
                value={aiResult?.feedback || ''} aiNotes={aiResult?.correctionNotes}
                onChange={(newVal) => handleReviewFeedbackChange(idx, taskName, newVal)}
                placeholder="Feedback ..."
                className="w-full"
            />
            {aiResult?.sandboxBypassed && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-3 flex items-start gap-2 text-xs font-semibold animate-in fade-in duration-200">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>Diese Bewertung erfolgte ohne mathematische Sandbox-Prüfung — bitte manuell gegenprüfen!</span>
                </div>
            )}

            {/* LOOP CLOSING FEEDBACK ACTION (On-The-Fly GradingMemory Appender) */}
            {aiResult && (
                <div className="pt-1 border-t border-border/40 flex flex-col gap-2">
                    {savingTaskId === taskName ? (
                        /*
                         * Eine Zeile, keine Karte.
                         *
                         * Hier stand bis zum 09.09.2026 ein Kasten mit Ueberschrift,
                         * Schliesskreuz, Feldbeschriftung und eigener Flaeche — rund 190px
                         * hoch, an der Stelle einer 32px hohen Knopfzeile. Fuer "ein Profil
                         * waehlen und bestaetigen" ist das Dialog-Moebel; als zweite weisse
                         * Karte wog es so schwer wie die Einschaetzung darueber, obwohl es
                         * nur eine voruebergehende Aktion ist.
                         *
                         * Jetzt tritt die Zeile an die Stelle der Knopfzeile, aus der sie
                         * kommt: 32px und 12px auf beiden Seiten, kein Sprung. Die Ueberschrift
                         * faellt weg — der Erfahrungsschatz nennt sich im Feld selbst, und
                         * der Hut links haelt die Verbindung zum angeklickten Knopf.
                         */
                        /*
                         * Die Hover-Flaechen sind hier NICHT `bg-muted`/`bg-accent`.
                         *
                         * Diese Zeile steht auf dem Seitengrund, und dort liegt `bg-muted`
                         * (220 14% 96%) genau einen Prozentpunkt ueber `bg-background`
                         * (220 20% 95%) — der Hover war schlicht unsichtbar (gemeldet am
                         * 09.09.2026). Der Ton ist als Behaelter IN einer weissen Karte
                         * gedacht; auf grauem Grund ist er ein No-Op wie seinerzeit `bg-card`.
                         * Auf dem Seitengrund hebt Weiss ab, nicht Grau.
                         *
                         * Und alle Elemente hier heben sich in DIESELBE Richtung: Das Feld
                         * wurde beim Drueberfahren dunkler, der Knopf daneben heller — zwei
                         * Hover-Sprachen in einer Zeile (gemeldet am 09.09.2026).
                         *
                         * Die Knoepfe setzen dafuer NICHTS mehr: `Button` traegt die Sprache
                         * inzwischen selbst (`hover:bg-foreground/5`, siehe dort). Hier stand
                         * einen Entwurf lang `hover:bg-card` — ein Aufhellen auf Weiss. Das
                         * war nur noetig, solange die Variante mit `bg-accent` einen Hover
                         * hatte, der auf grauem Grund nichts tat; jetzt waere es eine dritte
                         * Sprache. Das Auswahlfeld ist bereits weiss und sagt seinen Zustand
                         * ueber den Rand — Flaeche kann es nicht.
                         */
                        <div className="flex flex-wrap items-center gap-2 mt-1 animate-in fade-in duration-200">
                            <GraduationCap size={13} className="text-primary shrink-0" />
                            {memories.length === 0 ? (
                                <p className="flex-1 min-w-[200px] text-xs text-muted-foreground">
                                    Es wurden noch keine Erfahrungsschätze erstellt. Bitte richte erst einen über das Menü ein.
                                </p>
                            ) : (
                                <>
                                    {/* `size="sm"` statt handgesetzter Klassen: Die Aufrufstelle
                                        uebergab frueher `text-xs`, was den Knopf nie erreichte. */}
                                    <Dropdown
                                        value={targetMemoryId}
                                        onValueChange={setTargetMemoryId}
                                        options={memories.map(m => ({ value: m.id || '', label: m.name }))}
                                        disabled={isPending}
                                        size="sm"
                                        className="flex-1"
                                    />
                                    <KorekiTooltip
                                        title="Datenschutz & Anonymisierung"
                                        content="Vor dem Speichern wird die Antwort automatisch per KI anonymisiert. Personenbezogene Daten werden bereinigt, während der fachliche Kern unverändert bleibt."
                                        position="top"
                                        align="left"
                                        iconSize={14}
                                        buttonClassName="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                    />
                                </>
                            )}
                            {/*
                              * Ein Ausgang, und einer, den es in BEIDEN Zustaenden gibt. Vorher
                              * gab es zwei mit demselben Aufruf — ein Kreuz oben und einen Knopf
                              * unten —, aber der Knopf fehlte, sobald kein Erfahrungsschatz
                              * angelegt war.
                              */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSavingTaskId(null)}
                                className="shrink-0 h-8 text-xs font-bold text-muted-foreground hover:text-foreground"
                                disabled={isPending}
                            >
                                Abbrechen
                            </Button>
                            {memories.length > 0 && (
                                /* Die Standardvariante, nicht nachgebaut: Hier standen
                                   `hover:bg-primary/95`, `shadow-sm` und `font-black` gegen die
                                   `bg-primary/90`, `shadow-md`, `font-medium` des Bauteils —
                                   derselbe Knopf, knapp daneben. */
                                <Button
                                    size="sm"
                                    onClick={() => handleStartAnonymize(
                                        taskName,
                                        schuelerAntwort(item, task, tasksLayout, studentSections),
                                        Number(aiResult?.pointsObtained ?? 0),
                                        aiResult?.feedback || '',
                                        maxPoints
                                    )}
                                    className="shrink-0 h-8 text-xs gap-1.5 font-bold"
                                    disabled={isPending}
                                >
                                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    {isSaaSService ? 'Anlernen (1 C)' : 'Anlernen'}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 mt-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setActiveDoubleCheckTask({
                                        name: taskName,
                                        studentText: schuelerAntwort(item, task, tasksLayout, studentSections),
                                        maxPoints: Number(task.maxPoints || 0),
                                        currentPoints: Number(aiResult?.pointsObtained ?? 0),
                                        currentFeedback: aiResult?.feedback || ''
                                    });
                                    setShowSecondOpinionDrawer(true);
                                }}
                                className="h-8 text-xs font-bold text-primary hover:text-primary flex items-center gap-1.5"
                            >
                                <Sparkles size={13} className="text-primary group-hover/btn:scale-110 transition-all animate-pulse" />
                                KI-Zweitmeinung
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSavingTaskId(taskName);
                                    if (activeMemoryId) setTargetMemoryId(activeMemoryId);
                                }}
                                className="h-8 text-xs font-bold text-primary hover:text-primary flex items-center gap-1.5"
                            >
                                <GraduationCap size={13} className="text-primary group-hover/btn:scale-110 transition-transform" />
                                In Erfahrungsschatz übernehmen
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
