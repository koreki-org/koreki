import React, { useState } from 'react';
import { FolderOpen, Users, RefreshCw, FileUp } from 'lucide-react';
import { Task } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
}

export const StudentWorkCard: React.FC<StudentWorkCardProps> = ({
    batchFilesCount,
    tasksLayout,
    extractingLayout,
    onStudentUpload,
    onReExtractLayout,
    isLocked = false
}) => {
    const studentInputRef = React.useRef<HTMLInputElement>(null);

    const hasStudents = batchFilesCount > 0;

    return (
        <Card className="flex flex-col min-h-[320px] bg-white/60 backdrop-blur-xl border border-white hover:border-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-900/5 transition-all duration-500 overflow-hidden relative rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-20">
                <CardTitle className="text-lg font-bold flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <FolderOpen size={18} />
                    </div>
                    Schülerarbeiten
                </CardTitle>
                <div className="flex items-center gap-2">
                    {hasStudents && (
                        <>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.xlsx,.csv" multiple ref={studentInputRef} onChange={onStudentUpload} onClick={(e) => (e.target as HTMLInputElement).value = ''} hidden />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all font-outfit"
                                onClick={() => studentInputRef.current?.click()}
                            >
                                <RefreshCw size={12} />
                                <span>Ändern</span>
                            </Button>
                        </>
                    )}
                    <KorekiTooltip 
                        title="Organisation"
                        content="Laden Sie Dateien einzeln oder als Stapel hoch. Moodle-Exporte (XLSX/CSV) werden automatisch erkannt und digital verarbeitet."
                        position="bottom"
                    />
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col pt-4 relative z-10">
                {!hasStudents ? (
                    <div 
                        onClick={() => studentInputRef.current?.click()}
                        className="flex-1 border-2 border-dashed border-slate-200/80 rounded-[1.8rem] bg-slate-50/30 hover:bg-white/80 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-8 text-center group/dropzone min-h-[350px]"
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
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 group-hover/dropzone:scale-110 group-hover/dropzone:-translate-y-1 group-hover/dropzone:shadow-md transition-all duration-300">
                            <Users size={36} className="text-indigo-600" />
                        </div>
                        <p className="font-semibold text-slate-700 group-hover/dropzone:text-indigo-600 transition-colors">
                            Arbeiten auswählen (Excel/Moodle, Text (.txt), PDF, Bilder)
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center mb-6">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm mb-3">
                                <Users size={24} />
                            </div>
                            <h4 className="font-black text-slate-900 leading-tight mb-1">{batchFilesCount} Schüler gefunden</h4>
                            <p className="text-xs text-slate-500 font-medium">Bereit für die Analyse</p>
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
                                                className="h-auto p-0 text-xs text-indigo-600 font-bold uppercase tracking-wide flex items-center gap-1 font-outfit hover:text-indigo-700 transition-colors"
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
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kosten</span>
                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">1 Credit / Seite</span>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-tight font-outfit bg-indigo-50/30 px-1.5 py-0.5 rounded-md border border-indigo-100/30">
                                            1 Credit / Seite
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tasksLayout.map((t, i) => (
                                        <Badge key={i} variant="outline" className="bg-white/50 border-slate-200 font-bold px-3 py-1.5 text-xs text-slate-700 shadow-sm rounded-lg hover:border-indigo-200 transition-colors font-outfit">
                                            {t.name} <span className="ml-1 opacity-40 font-medium">{t.maxPoints}P</span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
