import React from 'react';
import { Plus, Trash2, Layers, Sparkles, AlertCircle, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { GradingGraph, ValidationType, VariableDefinition, VariableType } from '@/lib/grading/types';
import type { ExpectedValues } from '@/lib/grading/graph-preview';

/**
 * Editor-Reiter des Bewertungsgraphen.
 *
 * Links die Knotenliste nach Gruppen, rechts der Inspektor fuer den gewaehlten
 * Knoten. Die Fachregeln — Verweise zwischen Variablen, Erwartungshorizont —
 * liegen in lib/grading/; dieser Reiter stellt sie dar und meldet Aenderungen
 * nach oben.
 */
interface GraphEditorPanelProps {
    graph: GradingGraph;
    /** Aktuell ueberfahrener Knoten — hebt seine Abhaengigkeiten hervor. */
    hoveredVarId: string | null;
    groupedVariables: Record<string, VariableDefinition[]>;
    selectedVar?: VariableDefinition;
    selectedVarId: string | null;
    setSelectedVarId: (id: string | null) => void;
    setHoveredVarId: (id: string | null) => void;
    /** Variablen, die in der Formel des gerade betrachteten Knotens vorkommen. */
    dependenciesOfHovered: Set<string>;
    evaluatedContext: ExpectedValues;
    isLocked: boolean;
    isPointsDisabled: boolean;
    showAdvancedInspector: boolean;
    setShowAdvancedInspector: (show: boolean) => void;
    getVariableDependencies: (variable: VariableDefinition) => string[];
    onAddVariable: (groupName?: string) => void;
    onDeleteVariable: (id: string) => void;
    onUpdateVariable: (id: string, updated: Partial<VariableDefinition>) => void;
    onRenameVariableId: (oldId: string, newId: string) => void;
}

export const GraphEditorPanel: React.FC<GraphEditorPanelProps> = ({
    graph,
    hoveredVarId,
    groupedVariables,
    selectedVar,
    selectedVarId,
    setSelectedVarId,
    setHoveredVarId,
    dependenciesOfHovered,
    evaluatedContext,
    isLocked,
    isPointsDisabled,
    showAdvancedInspector,
    setShowAdvancedInspector,
    getVariableDependencies,
    onAddVariable,
    onDeleteVariable,
    onUpdateVariable,
    onRenameVariableId
}) => (
                        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden min-h-0 bg-muted relative">
                            {/* Left part: Variables visual list */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-0">
                                <div className="space-y-8 pb-12">
                                    <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 flex gap-4 text-xs text-primary items-start shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                                        <span className="text-xl">💡</span>
                                        <div className="space-y-1">
                                            <p className="font-extrabold text-primary leading-none">Manuelle Knotengestaltung</p>
                                            <p className="leading-relaxed">
                                                Fügen Sie manuelle Variablen hinzu oder passen Sie Formeln und Punkte an. Wählen Sie einen Knoten aus, um ihn rechts im Detail-Inspektor einfach anzupassen.
                                            </p>
                                        </div>
                                    </div>

                                    {(graph as any).validation?.dryRunChecked && (
                                        <div className={cn(
                                            "rounded-3xl p-5 text-xs leading-normal flex items-start gap-3 border shadow-xs animate-in fade-in slide-in-from-top-2 duration-300 mt-4",
                                            (graph as any).validation.isValid
                                                ? "bg-success/10 border-success/20 text-success"
                                                : "bg-destructive/10 border-destructive/20 text-destructive"
                                        )}>
                                            <span className="text-xl shrink-0 mt-0.5">{(graph as any).validation.isValid ? "🛡️" : "⚠️"}</span>
                                            <div className="space-y-1">
                                                <p className={cn("font-extrabold leading-none", (graph as any).validation.isValid ? "text-success" : "text-destructive")}>
                                                    {(graph as any).validation.isValid ? "Automatische Validierung: Bestanden" : "Automatische Validierung: Fehler"}
                                                </p>
                                                <p className="leading-relaxed font-medium text-muted-foreground mt-1">
                                                    {(graph as any).validation.isValid 
                                                        ? `Dieser Graph hat alle Dry-Run-Tests im Backend erfolgreich bestanden. Er ist absolut deterministisch auswertbar. ${(graph as any).validation.retriesUsed ? `(Selbst-Korrektur benötigt: ${(graph as any).validation.retriesUsed} Versuche)` : ""}`
                                                        : `Warnung: ${(graph as any).validation.error || "Es wurde ein mathematischer Berechnungsfehler oder Zirkelbezug im Graphen festgestellt."}`}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {Object.keys(groupedVariables).length === 0 ? (
                                        <div className="bg-white border-2 border-dashed border-border rounded-hero p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center gap-4 shadow-lg shadow-glass/50 mt-8 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="w-12 h-12 bg-muted border border-border rounded-2xl flex items-center justify-center text-muted-foreground">
                                                <Sparkles size={24} className="text-primary animate-pulse" />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-foreground text-sm">Noch kein Bewertungs-Graph vorhanden</h4>
                                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium">
                                                    Dieser Task hat noch keine mathematische Struktur hinterlegt. Du kannst oben im KI-Assistenten 🪄 einen Graphen generieren lassen oder hier direkt eine manuelle Variable hinzufügen.
                                                </p>
                                            </div>
                                            {!isLocked && (
                                                <div className="flex gap-3 mt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onAddVariable()}
                                                        className="h-8 text-xs font-bold rounded-xl border-border text-muted-foreground hover:bg-muted transition-all"
                                                    >
                                                        + Erste Variable hinzufügen
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        Object.entries(groupedVariables).map(([groupName, vars]) => (
                                            <div key={groupName} className="space-y-3">
                                                <div className="flex justify-between items-center px-1">
                                                    <h4 className="text-xs font-black uppercase text-muted-foreground tracking-wider font-outfit flex items-center gap-2">
                                                        <Layers size={13} className="text-primary" />
                                                        {groupName}
                                                    </h4>
                                                    {!isLocked && (
                                                        <button
                                                            onClick={() => onAddVariable(groupName)}
                                                            className="text-xs font-bold text-primary hover:text-primary transition-colors flex items-center gap-1 py-0.5 px-2 hover:bg-primary/5 rounded-md"
                                                        >
                                                            <Plus size={11} /> Variable hinzufügen
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {vars.map(v => {
                                                        const isSelected = selectedVarId === v.id;
                                                        const isHovered = hoveredVarId === v.id;
                                                        const isDependency = dependenciesOfHovered.has(v.id);
                                                        const evalVal = evaluatedContext.context[v.id];
                                                        const hasError = evaluatedContext.errors[v.id];

                                                        return (
                                                            <div
                                                                key={v.id}
                                                                onClick={() => setSelectedVarId(v.id)}
                                                                onMouseEnter={() => setHoveredVarId(v.id)}
                                                                onMouseLeave={() => setHoveredVarId(null)}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 select-none relative group cursor-pointer text-left",
                                                                    hasError ? "bg-destructive/10 border-destructive/20 hover:border-destructive/20 shadow-destructive/10 shadow-sm" :
                                                                    isSelected ? "bg-white border-primary shadow-md shadow-primary/10 ring-1 ring-primary" :
                                                                    isDependency ? "bg-primary/5 border-primary/20 shadow-sm" :
                                                                    isHovered ? "bg-white border-border shadow-sm" :
                                                                    "bg-white border-border hover:border-border"
                                                                )}
                                                            >
                                                                {/* Variable ID Title and Badges */}
                                                                <div className="flex justify-between items-start gap-3">
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <h5 className={cn("text-xs font-black font-mono truncate leading-none pt-0.5", isSelected || isDependency ? "text-primary" : "text-foreground")}>
                                                                            {v.id}
                                                                        </h5>
                                                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                                                            {v.type === 'input' ? 'Statische Eingabe' : 'Formel-Kalkulation'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1.5 shrink-0 items-center">
                                                                        {hasError && (
                                                                            <Badge className="bg-destructive text-destructive-foreground text-xxs py-0 px-1.5 rounded font-black uppercase flex items-center gap-0.5">
                                                                                <AlertCircle size={8} /> FEHLER
                                                                            </Badge>
                                                                        )}
                                                                        {v.type === 'input' ? (
                                                                            <Badge className="bg-muted border-border text-muted-foreground text-xxs py-0 px-1.5 rounded font-black uppercase">INPUT</Badge>
                                                                        ) : (
                                                                            <Badge className="bg-primary/5 border-primary/20 text-primary text-xxs py-0 px-1.5 rounded font-black uppercase">FORMULA</Badge>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Expected Output / Master value */}
                                                                <div className={cn("rounded-xl p-2.5 flex justify-between items-center text-xs border", hasError ? "bg-destructive/10 border-destructive/20" : "bg-muted border-border")}>
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Erwarteter Wert:</span>
                                                                    <span className={cn("font-mono font-bold text-foreground", hasError ? "text-destructive" : "text-foreground")}>
                                                                        {String(evalVal)}
                                                                    </span>
                                                                </div>

                                                                {hasError && (
                                                                    <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-2.5 text-xxs leading-normal font-mono flex items-start gap-1.5">
                                                                        <AlertCircle size={12} className="shrink-0 mt-0.5 text-destructive" />
                                                                        <span className="break-all">{hasError}</span>
                                                                    </div>
                                                                )}

                                                                {/* Small display of expression / default value */}
                                                                <div className="text-xs leading-tight font-medium text-muted-foreground truncate font-mono">
                                                                    {v.type === 'input' ? (
                                                                        `Standardwert: ${v.defaultValue}`
                                                                    ) : (
                                                                        `Formel: ${v.expression}`
                                                                    )}
                                                                </div>

                                                                {/* Visual formula dependencies */}
                                                                {v.type === 'formula' && (
                                                                    (() => {
                                                                        const deps = getVariableDependencies(v);
                                                                        if (deps.length === 0) return null;
                                                                        return (
                                                                            <div className="flex flex-wrap gap-1 mt-1 items-center">
                                                                                <span className="text-xxs text-muted-foreground font-black uppercase tracking-wider mr-1 shrink-0">🔗 Berechnet aus:</span>
                                                                                {deps.map(d => (
                                                                                    <Badge key={d} className="bg-primary/5 border border-primary/20 text-primary text-xxs py-0 px-1 font-mono rounded-sm select-none font-bold">
                                                                                        {d}
                                                                                    </Badge>
                                                                                ))}
                                                                            </div>
                                                                        );
                                                                    })()
                                                                )}

                                                                {/* Hover Delete Action Icon */}
                                                                {!isLocked && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onDeleteVariable(v.id); }}
                                                                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-border shadow-md hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 p-1.5 rounded-lg text-muted-foreground"
                                                                        title="Variable löschen"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right part: Simplified Node Inspector */}
                            <div className={cn(
                                "absolute inset-0 lg:relative bg-white flex flex-col overflow-hidden shrink-0 transition-all duration-300 min-h-0 lg:w-80 lg:border-l lg:border-t-0 border-t border-border",
                                selectedVar ? "flex h-full z-40" : "h-0 lg:h-full lg:flex hidden"
                            )}>
                                {selectedVar ? (
                                    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-6">
                                        <div className="flex justify-between items-center pb-2 border-b border-border shrink-0">
                                            <h4 className="text-xs font-black uppercase text-foreground font-outfit tracking-tight flex items-center gap-1.5">
                                                <Layers size={12} className="text-primary" />
                                                <span>Knoten-Inspektor</span>
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                {!isLocked && (
                                                    <button 
                                                        onClick={() => onDeleteVariable(selectedVar.id)}
                                                        className="text-xs font-bold text-destructive hover:text-destructive transition-colors flex items-center gap-1 py-0.5 px-2 hover:bg-destructive/10 rounded-md cursor-pointer"
                                                    >
                                                        <Trash2 size={11} />
                                                        <span className="hidden sm:inline">Löschen</span>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setSelectedVarId(null)}
                                                    className="lg:hidden text-muted-foreground hover:text-muted-foreground transition-colors p-1 hover:bg-muted rounded-full"
                                                    title="Inspektor schließen"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Edit ID Field */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Variablen-ID</label>
                                            <Input
                                                value={selectedVar.id}
                                                disabled={isLocked}
                                                onChange={(e) => onRenameVariableId(selectedVar.id, e.target.value.trim())}
                                                className="h-9 font-mono text-xs font-bold disabled:opacity-60"
                                            />
                                            <p className="text-xs text-muted-foreground font-medium leading-normal mt-0.5">
                                                Eindeutiger Name der Variable in Schülerlösungen (z.B. <code className="font-mono bg-muted px-1 py-0.5 rounded text-muted-foreground">subnetA_hosts</code>).
                                            </p>
                                        </div>

                                        {/* Type Selector (Input vs Formula) */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Knotentyp</label>
                                            <select
                                                value={selectedVar.type}
                                                disabled={isLocked}
                                                onChange={(e) => onUpdateVariable(selectedVar.id, { type: e.target.value as VariableType })}
                                                className="w-full h-9 px-3 rounded-xl border border-border text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                <option value="input">📥 Statische Eingabe (Input)</option>
                                                <option value="formula">⚙️ Berechnete Formel (Formula)</option>
                                            </select>
                                            <p className="text-xs text-muted-foreground font-medium leading-normal mt-0.5">
                                                {selectedVar.type === 'input' 
                                                    ? 'Fester Vorgabewert aus der Musterlösung (z.B. Hostanzahl).' 
                                                    : 'Wert wird dynamisch berechnet, um Folgefehler von vorherigen Schritten zu kompensieren.'}
                                            </p>
                                        </div>

                                        {/* Default Value / Expression fields */}
                                        {selectedVar.type === 'input' ? (
                                            <div className="space-y-1">
                                                <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Musterlösung (Wert)</label>
                                                <Input
                                                    value={selectedVar.defaultValue !== undefined ? String(selectedVar.defaultValue) : ''}
                                                    disabled={isLocked}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const num = Number(val);
                                                        onUpdateVariable(selectedVar.id, { defaultValue: isNaN(num) || val.trim() === '' ? val : num });
                                                    }}
                                                    className="h-9 text-xs font-semibold disabled:opacity-60"
                                                />
                                                <p className="text-xs text-muted-foreground font-medium leading-normal mt-0.5">
                                                    Der didaktisch korrekte Wert aus der Musterlösung.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Berechnungs-Formel</label>
                                                    {evaluatedContext.errors[selectedVar.id] && (
                                                        <Badge className="bg-destructive/10 text-destructive text-xxs py-0 px-1 border-destructive/20 rounded">Error ⚠️</Badge>
                                                    )}
                                                </div>
                                                <Textarea
                                                    value={selectedVar.expression || ''}
                                                    disabled={isLocked}
                                                    onChange={(e) => onUpdateVariable(selectedVar.id, { expression: e.target.value })}
                                                    rows={3}
                                                    placeholder="z.B. network.calculateMask(subnetA_hosts)"
                                                    className="w-full p-2.5 rounded-xl border border-border text-xs font-mono text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white leading-relaxed resize-none shadow-3xs disabled:opacity-60"
                                                />
                                                <p className="text-xs text-muted-foreground font-medium leading-normal mt-0.5">
                                                    Berechnungsvorschrift. Verwende Variablen-IDs (z.B. <code className="font-mono bg-muted px-1 py-0.5 rounded text-muted-foreground">subnetA_hosts</code>).
                                                </p>
                                                {evaluatedContext.errors[selectedVar.id] && (
                                                    <p className="text-xs text-destructive font-semibold font-mono leading-tight pt-1">
                                                        {evaluatedContext.errors[selectedVar.id]}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Points allocation */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider text-left block">Punkte für diesen Schritt</label>
                                            <Input
                                                type="number"
                                                value={selectedVar.maxPoints !== undefined ? selectedVar.maxPoints : 1}
                                                disabled={isLocked}
                                                onChange={(e) => onUpdateVariable(selectedVar.id, { maxPoints: Number(e.target.value) })}
                                                className="h-9 text-xs font-semibold disabled:opacity-60"
                                            />
                                            <p className="text-xs text-muted-foreground font-medium leading-normal mt-0.5 text-left">
                                                Wie viele Punkte der Schüler für diesen korrektten Wert erhält.
                                            </p>
                                            {isPointsDisabled && (
                                                <p className="text-xs text-warning font-semibold leading-relaxed mt-1.5 bg-warning/10 border border-warning/20 rounded-lg p-2 flex items-start gap-1 text-left">
                                                    <span>⚠️</span>
                                                    <span>Hybrid-Grading aktiv: Diese Punkte dienen als relative Gewichtung und mathematische Empfehlung. Die finale Vergabe erfolgt didaktisch flexibel durch das LLM.</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Collapsible Advanced Settings for Laypeople ease */}
                                        <div className="border-t border-border pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowAdvancedInspector(!showAdvancedInspector)}
                                                className="w-full text-left text-xs font-black uppercase text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between py-1 cursor-pointer"
                                            >
                                                <span>⚙️ Erweiterte Einstellungen (Toleranzen)</span>
                                                <span className="font-bold text-xs">{showAdvancedInspector ? "−" : "+"}</span>
                                            </button>

                                            {showAdvancedInspector && (
                                                <div className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {/* Validation Type */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Validierungsart</label>
                                                        <select
                                                            value={selectedVar.validationType}
                                                            disabled={isLocked}
                                                            onChange={(e) => onUpdateVariable(selectedVar.id, { validationType: e.target.value as ValidationType })}
                                                            className="w-full h-9 px-3 rounded-xl border border-border text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            <option value="exact">Exakte Übereinstimmung</option>
                                                            <option value="tolerance">Abweichung (Toleranz)</option>
                                                            <option value="contains">Enthält Substring</option>
                                                        </select>
                                                        <p className="text-xs text-muted-foreground font-medium leading-normal mt-0.5">
                                                            {selectedVar.validationType === 'exact' && 'Der Schüler-Wert muss mathematisch exakt übereinstimmen.'}
                                                            {selectedVar.validationType === 'tolerance' && 'Erlaubt kleine Abweichungen (z.B. Rundungsfehler).'}
                                                            {selectedVar.validationType === 'contains' && 'Prüft, ob der Schüler-Wert einen bestimmten Text enthält.'}
                                                        </p>
                                                    </div>

                                                    {/* Tolerance offset field */}
                                                    {selectedVar.validationType === 'tolerance' && (
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Zulässige Toleranz (+/-)</label>
                                                            <Input
                                                                type="number"
                                                                value={selectedVar.tolerance !== undefined ? selectedVar.tolerance : 0}
                                                                disabled={isLocked}
                                                                onChange={(e) => onUpdateVariable(selectedVar.id, { tolerance: Number(e.target.value) })}
                                                                className="h-9 text-xs font-semibold disabled:opacity-60"
                                                            />
                                                            <p className="text-xs text-muted-foreground font-medium leading-normal mt-0.5">
                                                                Zulässige Rundungs-Abweichung (z.B. <code className="font-mono bg-muted px-1 py-0.5 rounded text-muted-foreground">0.1</code>).
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Evaluated Value Preview block */}
                                        <div className="pt-4 border-t border-border flex flex-col gap-2 shrink-0">
                                            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Echtzeit-Berechnung (Musterlösung)</span>
                                            <div className="bg-primary/5 rounded-xl p-3 border border-primary/20 flex flex-col gap-1 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-muted-foreground">Erwarteter Wert:</span>
                                                    <span className="font-mono font-bold text-primary truncate pl-4">
                                                        {String(evaluatedContext.context[selectedVar.id])}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2 select-none">
                                        <HelpCircle size={32} className="stroke-1 opacity-70" />
                                        <p className="text-xs font-semibold leading-relaxed">
                                            Wähle links einen Knoten aus, um seine Werte manuell anzupassen.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
);
