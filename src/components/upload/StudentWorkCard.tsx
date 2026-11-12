import React from 'react';
import { FolderOpen, Users, RefreshCw } from 'lucide-react';
import { Task } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CollapsibleCardContent, CollapseToggleButton } from '@/components/ui/CollapsibleCardContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { UploadAblage } from './UploadAblage';
import { zeigtCredits } from '@/lib/env-context';

/**
 * Die Karte der Schuelerarbeiten.
 * 📂
 *
 * Hochladen heisst hier IMMER hinzufuegen. Bis zum 09.11.2026 ersetzte jeder
 * weitere Upload die gesamte Liste, und der Knopf dafuer hiess "Ändern" — er
 * stand direkt neben einer Liste, die man eigentlich wachsen lassen will. Wer
 * eine Arbeit nachreichen wollte, verlor dreissig.
 *
 * Zum Wegnehmen gibt es zwei Wege, die es schon gab: den Muelleimer je Zeile in
 * der Stapelliste darunter und "Neue Korrektur" in der Kopfzeile. Ein dritter,
 * der versehentlich alles loescht, wird nicht gebraucht.
 */

interface StudentWorkCardProps {
    batchFilesCount: number;
    tasksLayout: Task[];
    extractingLayout: boolean;
    /** Bekommt die Dateien, gleich ob geklickt oder abgelegt. */
    onStudentUpload: (dateien: File[]) => void;
    onReExtractLayout: () => void;
    isLocked?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export const StudentWorkCard: React.FC<StudentWorkCardProps> = ({
    batchFilesCount,
    tasksLayout,
    extractingLayout,
    onStudentUpload,
    onReExtractLayout,
    isLocked = false,
    collapsed = false,
    onToggleCollapse
}) => {
    const hasStudents = batchFilesCount > 0;
    const ARTEN = '.pdf,.jpg,.jpeg,.png,.txt,.xlsx,.csv,.koreki';

    return (
        <Card className="flex flex-col bg-card shadow-raised rounded-hero overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 border-b border-border/50">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                        <FolderOpen size={18} />
                    </div>
                    <span className="truncate">Schülerarbeiten</span>
                    <KorekiTooltip
                        title="Organisation"
                        handbuch="schuelerarbeiten"
                        content="Lade Dateien einzeln oder als Stapel hoch — auch nachträglich, es kommt immer etwas dazu. Moodle-Exporte (XLSX/CSV) werden automatisch erkannt."
                        position="bottom"
                        align="left"
                        className="inline-flex shrink-0"
                    />
                </CardTitle>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {onToggleCollapse && (
                        <CollapseToggleButton
                            collapsed={collapsed}
                            onToggleCollapse={onToggleCollapse}
                            label="Schülerarbeiten"
                        />
                    )}
                </div>
            </CardHeader>

            <CollapsibleCardContent collapsed={collapsed} className="flex-grow pt-4">
                {!hasStudents ? (
                    <UploadAblage
                        gross
                        testId="upload-schuelerarbeit"
                        accept={ARTEN}
                        multiple
                        onFiles={onStudentUpload}
                        icon={<Users size={36} className="text-primary" />}
                        titel="Arbeiten auswählen (Excel/Moodle, Text (.txt), PDF, Bilder)"
                    />
                ) : (
                    <div className="flex-1 flex flex-col">
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center text-primary shadow-sm mb-3">
                                <Users size={24} />
                            </div>
                            <h4 className="font-bold text-foreground leading-tight mb-1">{batchFilesCount} Schüler gefunden</h4>
                            <p className="text-xs text-muted-foreground font-medium">Bereit für die Analyse</p>
                        </div>

                        <UploadAblage
                            testId="upload-schuelerarbeit"
                            accept={ARTEN}
                            multiple
                            onFiles={onStudentUpload}
                            titel="Weitere Arbeiten hinzufügen"
                        />

                        {tasksLayout.length > 0 && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-xs font-medium text-muted-foreground">Erkannte Aufgabenstellung</span>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={onReExtractLayout}
                                                disabled={extractingLayout || isLocked}
                                                className="h-auto p-0 text-xs text-primary font-medium flex items-center gap-1 hover:text-primary/90 transition-colors"
                                            >
                                                <RefreshCw size={10} className={extractingLayout ? "animate-spin" : ""} />
                                                Aktualisieren
                                            </Button>

                                            <KorekiTooltip
                                                title="Aufgaben-Sync"
                                                content="Aktualisiert die Aufgabenstruktur basierend auf deiner Musterlösung, damit die Schüler nach dem aktuellen Stand korrigiert werden."
                                                position="top"
                                                iconSize={14}
                                                buttonClassName="h-6 w-6"
                                                footer={zeigtCredits() ? (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-muted-foreground">Kosten</span>
                                                        <span className="text-xxs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">1 Credit / Seite</span>
                                                    </div>
                                                ) : undefined}
                                            />
                                        </div>
                                        {zeigtCredits() && (
                                            <span className="text-xs font-medium text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded-md">1 Credit / Seite</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tasksLayout.map((t, i) => (
                                        <Badge key={i} variant="outline" className="bg-card/50 border-border font-bold px-3 py-1.5 text-xs text-foreground shadow-sm rounded-lg hover:border-primary/40 transition-colors">
                                            {t.name} <span className="ml-1 opacity-40 font-medium">{t.maxPoints}P</span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleCardContent>
        </Card>
    );
};
