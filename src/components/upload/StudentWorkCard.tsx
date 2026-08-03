import React, { useState } from 'react';
import { FolderOpen, Users, RefreshCw, FileUp } from 'lucide-react';
import { Task } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CollapsibleCardContent, CollapseToggleButton } from '@/components/ui/CollapsibleCardContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';

interface StudentWorkCardProps {
    batchFilesCount: number;
    tasksLayout: Task[];
    extractingLayout: boolean;
    onStudentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    const studentInputRef = React.useRef<HTMLInputElement>(null);

    const hasStudents = batchFilesCount > 0;

    return (
        <Card className="flex flex-col border-border/50 bg-background/60 backdrop-blur-xl shadow-xl shadow-foreground/5 rounded-hero overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 border-b border-border/50">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                        <FolderOpen size={18} />
                    </div>
                    <span className="truncate">Schülerarbeiten</span>
                    <KorekiTooltip
                        title="Organisation"
                        content="Laden Sie Dateien einzeln oder als Stapel hoch. Moodle-Exporte (XLSX/CSV) werden automatisch erkannt und digital verarbeitet."
                        position="bottom"
                        align="left"
                        className="inline-flex shrink-0"
                    />
                </CardTitle>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {hasStudents && (
                        <>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.xlsx,.csv" multiple ref={studentInputRef} onChange={onStudentUpload} onClick={(e) => (e.target as HTMLInputElement).value = ''} hidden />
                            <Button
                                variant="chip"
                                size="xs"
                                className="flex items-center gap-2 transition-all shrink-0"
                                onClick={() => studentInputRef.current?.click()}
                                title="Schülerarbeiten ändern"
                                aria-label="Schülerarbeiten ändern"
                            >
                                <RefreshCw size={12} />
                                <span className="hidden sm:inline">Ändern</span>
                            </Button>
                        </>
                    )}
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
                    <div 
                        onClick={() => studentInputRef.current?.click()}
                        className="flex-1 border-2 border-dashed border-border/60 rounded-hero bg-muted/20 hover:bg-background/80 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-8 text-center group/dropzone min-h-[350px]"
                    >
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.txt,.xlsx,.csv"
                            multiple
                            ref={studentInputRef}
                            onChange={onStudentUpload}
                            onClick={(e) => (e.target as HTMLInputElement).value = ''}
                            hidden
                        />
                        <div className="bg-background p-4 rounded-2xl shadow-sm border border-border mb-4 group-hover/dropzone:scale-110 group-hover/dropzone:-translate-y-1 group-hover/dropzone:shadow-md transition-all duration-300">
                            <Users size={36} className="text-primary" />
                        </div>
                        <p className="font-semibold text-foreground group-hover/dropzone:text-primary transition-colors">
                            Arbeiten auswählen (Excel/Moodle, Text (.txt), PDF, Bilder)
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex flex-col items-center justify-center text-center mb-6">
                            <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center text-primary shadow-sm mb-3">
                                <Users size={24} />
                            </div>
                            <h4 className="font-black text-foreground leading-tight mb-1">{batchFilesCount} Schüler gefunden</h4>
                            <p className="text-xs text-muted-foreground font-medium">Bereit für die Analyse</p>
                        </div>

                        {tasksLayout.length > 0 && (
                            <div className="mt-auto">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-outfit">Erkannte Aufgabenstellung</span>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={onReExtractLayout}
                                                disabled={extractingLayout || isLocked}
                                                className="h-auto p-0 text-xs text-primary font-bold uppercase tracking-wide flex items-center gap-1 font-outfit hover:text-primary/90 transition-colors"
                                            >
                                                <RefreshCw size={10} className={extractingLayout ? "animate-spin" : ""} />
                                                Update
                                            </Button>

                                            <KorekiTooltip 
                                                title="Aufgaben-Sync"
                                                content="Aktualisiert die Aufgabenstruktur basierend auf deiner Musterlösung, damit die Schüler nach dem aktuellen Stand korrigiert werden."
                                                position="top"
                                                iconSize={14}
                                                buttonClassName="h-6 w-6"
                                                footer={(
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xxs font-bold text-muted-foreground uppercase tracking-wider">Kosten</span>
                                                        <span className="text-xxs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">1 Credit / Seite</span>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                        <span className="text-xxs font-bold text-primary/70 uppercase tracking-tight font-outfit bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/20">
                                            1 Credit / Seite
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tasksLayout.map((t, i) => (
                                        <Badge key={i} variant="outline" className="bg-background/50 border-border font-bold px-3 py-1.5 text-xs text-foreground shadow-sm rounded-lg hover:border-primary/40 transition-colors font-outfit">
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
