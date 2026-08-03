import React, { useState, useRef } from 'react';
import { X, Scissors, Info, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface StudentConfig {
    firstName: string;
    lastName: string;
    pageCount: number;
}

interface PDFSplitModalProps {
    fileName: string;
    totalPageCount: number;
    onClose: () => void;
    onSplit: (students: any[]) => void;
}

const PDFSplitModal: React.FC<PDFSplitModalProps> = ({ fileName, totalPageCount, onClose, onSplit }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [students, setStudents] = useState<StudentConfig[]>([
        { firstName: '', lastName: 'Schüler #1', pageCount: totalPageCount }
    ]);

    const assignedPages = students.reduce((sum, s) => sum + s.pageCount, 0);
    const unassignedPages = totalPageCount - assignedPages;

    const addStudent = () => {
        setStudents([...students, { firstName: '', lastName: `Schüler #${students.length + 1}`, pageCount: 0 }]);
    };

    const removeStudent = (index: number) => {
        if (students.length <= 1) return;
        const newStudents = [...students];
        newStudents.splice(index, 1);
        setStudents(newStudents);
    };

    const updateStudent = (index: number, field: keyof StudentConfig, value: string | number) => {
        const newStudents = [...students];
        newStudents[index] = { ...newStudents[index], [field]: value } as StudentConfig;
        setStudents(newStudents);
    };

    const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt: any) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // Extract students from Excel rows
                const imported: { firstName: string, lastName: string, pageCount?: number }[] = [];
                data.forEach(row => {
                    if (!row) return;
                    
                    let colA = row[0] != null ? String(row[0]).trim() : '';
                    let colB = row[1] != null ? String(row[1]).trim() : '';
                    let colC = row[2] != null ? String(row[2]).trim() : '';
                    
                    // Skip header rows
                    const lowerA = colA.toLowerCase();
                    const lowerB = colB.toLowerCase();
                    if (lowerA === 'name' || lowerA === 'schüler' || lowerA === 'nachname' || lowerA === 'lastname' || lowerA === 'surname' ||
                        lowerB === 'vorname' || lowerB === 'firstname') {
                        return;
                    }

                    if (colA.length > 0) {
                        let lName = colA;
                        let fName = colB;
                        
                        // Fallback: If Col B is empty, try to split Col A
                        if (fName.length === 0) {
                            if (colA.includes(',')) {
                                // Format "Mustermann, Max"
                                const parts = colA.split(',');
                                lName = parts[0].trim();
                                fName = parts[1].trim();
                            } else if (colA.includes(' ')) {
                                // Format "Max Mustermann"
                                const parts = colA.split(/\s+/);
                                if (parts.length > 1) {
                                    fName = parts[0].trim();
                                    lName = parts.slice(1).join(' ').trim();
                                }
                            }
                        }

                        let pCount: number | undefined = undefined;
                        if (colC.length > 0) {
                            const parsed = parseInt(colC, 10);
                            if (!isNaN(parsed) && parsed >= 0) {
                                pCount = parsed;
                            }
                        }

                        imported.push({
                            firstName: fName,
                            lastName: lName,
                            pageCount: pCount
                        });
                    }
                });

                if (imported.length > 0) {
                    const count = imported.length;
                    
                    // Sum up defined pages to see how many pages are left
                    const definedPagesSum = imported.reduce((sum, s) => sum + (s.pageCount !== undefined ? s.pageCount : 0), 0);
                    const studentsWithoutPages = imported.filter(s => s.pageCount === undefined);
                    const remainingPages = Math.max(0, totalPageCount - definedPagesSum);
                    
                    const basePages = studentsWithoutPages.length > 0 ? Math.floor(remainingPages / studentsWithoutPages.length) : 0;
                    const extraPages = studentsWithoutPages.length > 0 ? remainingPages % studentsWithoutPages.length : 0;
                    
                    let extraIndex = 0;
                    const newStudents = imported.map((s) => {
                        let pCount = s.pageCount;
                        if (pCount === undefined) {
                            pCount = Math.max(1, basePages + (extraIndex < extraPages ? 1 : 0));
                            extraIndex++;
                        }
                        return {
                            firstName: s.firstName,
                            lastName: s.lastName,
                            pageCount: pCount
                        };
                    });
                    setStudents(newStudents);
                } else {
                    alert("Keine gültigen Namen in der Excel-Datei gefunden.");
                }
            } catch (err) {
                console.error("Excel import error:", err);
                alert("Fehler beim Lesen der Excel-Datei.");
            }
        };
        reader.readAsBinaryString(file);
        // Reset input value to allow re-importing same file
        e.target.value = '';
    };

    const handleSplit = () => {
        if (assignedPages === 0 || assignedPages > totalPageCount) return;
        onSplit(students);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-in fade-in duration-300">
            <div className="relative w-full max-w-[550px] max-h-[90vh] md:max-h-[85vh] bg-white rounded-hero p-8 shadow-glass border border-border animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">PDF Aufteilen</h2>
                    <Button variant="ghost" size="icon" className="h-auto p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors" onClick={onClose}>
                        <X size={24} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin mb-6">
                    <div className="flex justify-between items-start gap-4 mb-4">
                        <p className="text-muted-foreground text-sm m-0">
                            Datei: <strong className="text-foreground">{fileName}</strong> ({totalPageCount} Seiten)
                        </p>
                        <Button
                            variant="chip"
                            size="xs"
                            className="flex items-center gap-2 transition-all shadow-xs"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileSpreadsheet size={14} /> Excel Import
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleExcelImport}
                        />
                    </div>

                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3 mb-6">
                        <Info size={20} className="text-primary shrink-0 mt-0.5" />
                        <p className="text-sm text-primary leading-relaxed m-0">
                            Ordnen Sie die Seiten den jeweiligen Schülern zu. Sie können Namen direkt eingeben oder per Excel importieren.
                        </p>
                    </div>

                    <div className="grid grid-cols-[1fr_1fr_80px_40px] gap-3 px-2 text-xs font-bold text-muted-foreground uppercase mb-2">
                        <span>Nachname</span>
                        <span>Vorname</span>
                        <span className="text-center">Seiten</span>
                        <span></span>
                    </div>

                    <div className="max-h-[250px] overflow-y-auto mb-4 flex flex-col gap-3 pr-2 scrollbar-thin">
                        {students.map((student, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_1fr_80px_40px] gap-3 items-center">
                                <Input
                                    type="text"
                                    value={student.lastName}
                                    placeholder="Nachname..."
                                    onChange={(e) => updateStudent(idx, 'lastName', e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <Input
                                    type="text"
                                    value={student.firstName}
                                    placeholder="Vorname..."
                                    onChange={(e) => updateStudent(idx, 'firstName', e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    max={totalPageCount}
                                    value={student.pageCount}
                                    onChange={(e) => updateStudent(idx, 'pageCount', Math.max(0, parseInt(e.target.value) || 0))}
                                    className="px-3 py-2 rounded-xl border border-border text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:text-muted-foreground disabled:cursor-not-allowed flex h-auto p-2 justify-center rounded-lg hover:bg-destructive/10 transition-colors"
                                    onClick={() => removeStudent(idx)}
                                    disabled={students.length <= 1}
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        className="w-full h-auto bg-muted/20 border-2 border-dashed border-border text-muted-foreground p-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-muted/40 hover:border-border hover:text-foreground transition-all mb-6"
                        onClick={addStudent}
                    >
                        <Plus size={18} /> Schüler hinzufügen
                    </Button>

                    <div className="bg-muted/20 p-4 rounded-xl border border-border mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground font-medium">Zugeordnete Seiten:</span>
                            <span className={`font-bold ${assignedPages > totalPageCount ? 'text-destructive' : 'text-primary'}`}>
                                {assignedPages} / {totalPageCount}
                            </span>
                        </div>
                        {unassignedPages > 0 && (
                            <div className="flex justify-between text-xs text-warning font-medium mt-1">
                                <span>Noch verfügbar:</span>
                                <span>{unassignedPages} Seiten</span>
                            </div>
                        )}
                        {assignedPages > totalPageCount && (
                            <div className="text-destructive text-xs font-bold mt-2 text-center bg-destructive/10 py-1.5 rounded-md border border-destructive/20">
                                ⚠️ Zu viele Seiten zugeordnet!
                            </div>
                        )}
                    </div>

                </div>

                <div className="flex gap-4 mt-auto pt-4 border-t border-border shrink-0">
                    <Button variant="outline" onClick={onClose} className="flex-1 font-semibold">
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleSplit}
                        className="flex-[2] font-bold shadow-lg shadow-primary/20"
                        disabled={assignedPages === 0 || assignedPages > totalPageCount}
                    >
                        Aufteilen starten
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PDFSplitModal;
