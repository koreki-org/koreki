import React from 'react';
import { AlertTriangle, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { PopoverMenu } from '../../ui/PopoverMenu';
import { AufgabenReiter } from '../../ui/AufgabenReiter';
import { BatchFile, Task } from '../../../types';
import { cn } from '@/lib/utils';
import { brauchtPruefung } from '@/lib/vertrauen';

interface BatchDoneHeaderProps {
    item: BatchFile;
    idx: number;
    showScan: boolean;
    onToggleScan: (idx: number) => void;
    groupNames: string[];
    activeGroupName: string;
    onSetActiveGroupName: (name: string) => void;
}

/**
 * BatchDoneHeader
 * 🏮 Industrial Navigation & Status Header
 */
export const BatchDoneHeader: React.FC<BatchDoneHeaderProps> = ({
    item,
    idx,
    showScan,
    onToggleScan,
    groupNames,
    activeGroupName,
    onSetActiveGroupName
}) => {
    const lowConfidenceTasks = item.result?.tasks?.filter(t => brauchtPruefung(t.confidence)) || [];

    // 🏮 INDUSTRIAL LOGIC: Springt zur passenden Task-Gruppe und scrollt zur Task-Card.
    // Extrahiert, da sowohl der Single-Treffer-Button als auch jedes Popover-Item
    // dieselbe Sprunglogik benötigen.
    const jumpToTask = (t: Task) => {
        const match = t.name?.match(/^(.*?\d+)/);
        const mainGroup = match ? match[1].trim() : (t.name || "");
        onSetActiveGroupName(mainGroup);

        setTimeout(() => {
            const safeTaskName = t.name?.replace(/\s+/g, '-').toLowerCase();
            const el = document.getElementById(`task-card-${idx}-${safeTaskName}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    /*
     * Seit dem 12.10.2026 eine einzige Zeile: links die Aufgaben, rechts
     * "Bitte prüfen" und der Scan-Umschalter. Vorher standen darueber eine
     * Zeile "KI-Korrektur Review", die nichts tat, und zwei Trennlinien — fuenf
     * Kopfzeilen, bevor die erste Zeile Schuelertext kam.
     */
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 w-full">
            {/* LEFT SIDE: Task Navigation */}
            <AufgabenReiter namen={groupNames} aktiv={activeGroupName} onWaehle={onSetActiveGroupName} />

            <div className="flex items-center gap-2 shrink-0">
            {/* RIGHT SIDE: Specific Review Recommendation */}
            {lowConfidenceTasks.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in duration-700 h-8">
                    {lowConfidenceTasks.length === 1 ? (
                        // Genau ein Treffer: direkter Sprung-Button, kein Popover-Overhead nötig
                        <Button
                            variant="outline"
                            size="sm"
                            title={lowConfidenceTasks[0].name}
                            onClick={(e) => {
                                e.stopPropagation();
                                jumpToTask(lowConfidenceTasks[0]);
                            }}
                            className="h-8 px-3 text-xs text-warning bg-warning/10 hover:bg-warning/20 shadow-none gap-1.5 max-w-[260px] truncate"
                        >
                            <AlertTriangle size={12} className="shrink-0" /> Bitte prüfen: {lowConfidenceTasks[0].name}
                        </Button>
                    ) : (
                        // Mehrere Treffer: fixer Trigger-Footprint statt N Buttons in der Reihe -
                        // wächst nicht mit der Trefferzahl, kein Kollisionsrisiko mit der Task-Navigation links.
                        <PopoverMenu
                            align="right"
                            widthClass="w-72"
                            trigger={
                                <Badge
                                    variant="secondary"
                                    className="bg-warning/10 text-warning border-transparent h-8 px-3 gap-1.5 rounded-lg cursor-pointer"
                                >
                                    <AlertTriangle size={12} className="text-warning" />
                                    {lowConfidenceTasks.length} Aufgaben: Bitte prüfen
                                    <ChevronDown size={12} className="text-warning" />
                                </Badge>
                            }
                            items={lowConfidenceTasks.map((t, i) => ({
                                key: `warn-item-${t.name || i}`,
                                label: t.name || 'Unbenannte Aufgabe',
                                icon: <AlertTriangle size={12} />,
                                className: 'hover:bg-warning/10 hover:text-warning',
                                onSelect: () => jumpToTask(t),
                            }))}
                        />
                    )}
                </div>
            )}
            {item.documentType === 'scanned' && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleScan(idx);
                    }}
                    className={cn("h-8 px-3 text-xs gap-2 shrink-0",
                        showScan && "bg-primary text-primary-foreground border-primary hover:bg-primary/90")}
                >
                    <ImageIcon size={14} /> {showScan ? "Scan aus" : "Scan ein"}
                </Button>
            )}
            </div>
        </div>
    );
};
