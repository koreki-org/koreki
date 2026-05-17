import React, { useState, useRef } from 'react';
import { X, Scissors, Info, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface StudentConfig {
    name: string;
    pageCount: number;
}

interface PDFSplitModalProps {
    fileName: string;
    totalPageCount: number;
    onClose: () => void;
    onSplit: (students: StudentConfig[], autoRedact: boolean) => void;
}

const PDFSplitModal: React.FC<PDFSplitModalProps> = ({ fileName, totalPageCount, onClose, onSplit }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [autoRedact, setAutoRedact] = useState(false);
    const [students, setStudents] = useState<StudentConfig[]>([
        { name: 'Schüler #1', pageCount: totalPageCount }
    ]);

    const assignedPages = students.reduce((sum, s) => sum + s.pageCount, 0);
    const unassignedPages = totalPageCount - assignedPages;

    const addStudent = () => {
        setStudents([...students, { name: `Schüler #${students.length + 1}`, pageCount: 0 }]);
    };

    const removeStudent = (index: number) => {
        if (students.length <= 1) return;
        const newStudents = [...students];
        newStudents.splice(index, 1);
        setStudents(newStudents);
    };

    const updateStudent = (index: number, field: keyof StudentConfig, value: string | number) => {
        const newStudents = [...students];
        newStudents[index] = { ...newStudents[index], [field]: value };
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

                // Extract non-empty strings from the first column or first sheet
                const importedNames: string[] = [];
                data.forEach(row => {
                    if (row && row[0] && typeof row[0] === 'string' && row[0].trim().length > 0) {
                        const name = row[0].trim();
                        // Basic check to skip typical headers if they are "Name" or "Schüler"
                        if (name.toLowerCase() !== 'name' && name.toLowerCase() !== 'schüler') {
                            importedNames.push(name);
                        }
                    } else if (row && typeof row[1] === 'string' && row[1].trim().length > 0) {
                        // Fallback to second column if first one is empty (e.g. index column)
                        const name = row[1].trim();
                        if (name.toLowerCase() !== 'name' && name.toLowerCase() !== 'schüler') {
                            importedNames.push(name);
                        }
                    }
                });

                if (importedNames.length > 0) {
                    const count = importedNames.length;
                    const basePages = Math.floor(totalPageCount / count);
                    const extraPages = totalPageCount % count;
                    
                    const newStudents = importedNames.map((name, i) => ({
                        name,
                        pageCount: Math.max(1, basePages + (i < extraPages ? 1 : 0))
                    }));
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
        onSplit(students, autoRedact);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-in fade-in duration-300">
            <div className="relative w-full max-w-[550px] bg-white rounded-[24px] p-8 shadow-glass border border-border animate-in zoom-in-95 duration-500 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">PDF Aufteilen</h2>
                    <Button variant="ghost" size="icon" className="h-auto p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors" onClick={onClose}>
                        <X size={24} />
                    </Button>
                </div>

                <div className="mb-6">
                    <div className="flex justify-between items-start gap-4 mb-4">
                        <p className="text-slate-500 text-sm m-0">
                            Datei: <strong className="text-slate-800">{fileName}</strong> ({totalPageCount} Seiten)
                        </p>
                        <Button
                            variant="ghost"
                            className="flex h-auto items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 hover:border-green-300 transition-all shadow-sm"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileSpreadsheet size={16} /> Excel Import
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleExcelImport}
                        />
                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 mb-6">
                        <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-900 leading-relaxed m-0">
                            Ordnen Sie die Seiten den jeweiligen Schülern zu. Sie können Namen direkt eingeben oder per Excel importieren.
                        </p>
                    </div>

                    <div className="grid grid-cols-[1fr_80px_40px] gap-4 px-2 text-xs font-bold text-slate-500 uppercase mb-2">
                        <span>Name für Export (Klarname)</span>
                        <span className="text-center">Seiten</span>
                        <span></span>
                    </div>

                    <div className="max-h-[250px] overflow-y-auto mb-4 flex flex-col gap-3 pr-2 scrollbar-thin">
                        {students.map((student, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_80px_40px] gap-4 items-center">
                                <Input
                                    type="text"
                                    value={student.name}
                                    placeholder="Name eingeben..."
                                    onChange={(e) => updateStudent(idx, 'name', e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    max={totalPageCount}
                                    value={student.pageCount}
                                    onChange={(e) => updateStudent(idx, 'pageCount', Math.max(0, parseInt(e.target.value) || 0))}
                                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed flex h-auto p-2 justify-center rounded-lg hover:bg-red-50 transition-colors"
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
                        className="w-full h-auto bg-slate-50 border-2 border-dashed border-slate-200 text-slate-600 p-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800 transition-all mb-6"
                        onClick={addStudent}
                    >
                        <Plus size={18} /> Schüler hinzufügen
                    </Button>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 font-medium">Zugeordnete Seiten:</span>
                            <span className={`font-bold ${assignedPages > totalPageCount ? 'text-red-500' : 'text-blue-600'}`}>
                                {assignedPages} / {totalPageCount}
                            </span>
                        </div>
                        {unassignedPages > 0 && (
                            <div className="flex justify-between text-xs text-amber-600 font-medium mt-1">
                                <span>Noch verfügbar:</span>
                                <span>{unassignedPages} Seiten</span>
                            </div>
                        )}
                        {assignedPages > totalPageCount && (
                            <div className="text-red-500 text-xs font-bold mt-2 text-center bg-red-50 py-1.5 rounded-md border border-red-100">
                                ⚠️ Zu viele Seiten zugeordnet!
                            </div>
                        )}
                    </div>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-all">
                        <input
                            type="checkbox"
                            checked={autoRedact}
                            onChange={(e) => setAutoRedact(e.target.checked)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-slate-300 transition-all cursor-pointer"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Automatische Schwärzung</span>
                            <span className="text-[11px] text-slate-500 font-medium leading-normal">
                                Obere 2 cm auf allen Seiten automatisch mit einem schwarzen Balken schwärzen.
                            </span>
                        </div>
                    </label>
                </div>

                <div className="flex gap-4 mt-8">
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
