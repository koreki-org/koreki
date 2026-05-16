import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { BatchFile } from '@/types';
import { encodeFeedback, FeedbackData } from '@/lib/distribution';
import Logo from '../Logo';

interface DigitalSlipsModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchFiles: BatchFile[];
}

export const DigitalSlipsModal: React.FC<DigitalSlipsModalProps> = ({ isOpen, onClose, batchFiles }) => {
    if (!isOpen) return null;

    const completedFiles = batchFiles.filter(f => f.status === 'done' && f.result);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 print:p-0 print:bg-white">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 print:max-h-none print:shadow-none print:rounded-none print:overflow-visible printable-slips">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
                    <div className="flex items-center gap-4">
                        <Logo size={40} showText={true} />
                        <div className="w-px h-8 bg-slate-200" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Digitale Rückgabe-Slips</h2>
                            <p className="text-sm text-slate-500 font-medium">QR-Codes für die Schüler zum Ausschneiden</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="h-10 gap-2 font-bold text-slate-700 rounded-xl">
                            <Printer size={18} /> Drucken
                        </Button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                        {completedFiles.length === 0 ? (
                            <div className="col-span-full py-20 text-center print:hidden">
                                <p className="text-slate-400 font-medium">Keine fertigen Korrekturen zum Exportieren gefunden.</p>
                            </div>
                        ) : (
                            completedFiles.map((file, idx) => {
                                // Deterministic PIN generation based on student name to ensure stability
                                const getStablePin = (name: string) => {
                                    let hash = 0;
                                    for (let i = 0; i < name.length; i++) {
                                        hash = ((hash << 5) - hash) + name.charCodeAt(i);
                                        hash |= 0;
                                    }
                                    return (Math.abs(hash) % 9000 + 1000).toString();
                                };
                                const pin = getStablePin(file.name);

                                const tasks = (file.result?.tasks || []);
                                const points = tasks.reduce((acc, t) => acc + Number(t.pointsObtained || 0), 0);
                                const maxPoints = tasks.reduce((acc, t) => acc + Number(t.maxPoints || 0), 0);

                                const feedbackData: FeedbackData = {
                                    studentName: file.name,
                                    date: new Date().toLocaleDateString('de-DE'),
                                    overallFeedback: file.result?.overallFeedback || '',
                                    tasks: tasks.map(t => ({
                                        id: t.name || 'Aufgabe',
                                        feedback: t.feedback || '',
                                        points: Number(t.pointsObtained || 0),
                                        maxPoints: Number(t.maxPoints || 0)
                                    })),
                                    pin: pin,
                                    points: points,
                                    maxPoints: maxPoints
                                };

                                const encoded = encodeFeedback(feedbackData);
                                // Universal Viewer Hub: Always point to the public viewer on koreki.org 
                                // to ensure mobile accessibility (even from Desktop/Local apps).
                                // Privacy is maintained as data is in the URL hash (#).
                                const url = `https://koreki.org/view#${encoded}`;

                                return (
                                    <div 
                                        key={idx} 
                                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex items-start gap-6 bg-slate-50/30 print:border-slate-300 print:bg-white print:break-inside-avoid print:mb-4 relative"
                                    >
                                        <div className="flex-1">
                                            <div className="mb-4 flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-extrabold text-slate-900 truncate">{file.name}</h3>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Feedback & Analyse</p>
                                                </div>
                                                <Logo size={20} className="opacity-40 grayscale print:opacity-100 print:grayscale-0" />
                                            </div>
                                            
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                                                    <ShieldCheck size={12} />
                                                    <span>Verschlüsselt</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PIN:</span>
                                                    <span className="text-sm font-black text-slate-900 tracking-widest">{pin}</span>
                                                </div>
                                            </div>

                                            <div className="text-[11px] text-slate-500 leading-tight">
                                                Scanne den Code und gib deinen <strong>persönlichen PIN</strong> ein.
                                            </div>
                                        </div>

                                        <div className="shrink-0 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                            <QRCodeSVG 
                                                value={url} 
                                                size={100} 
                                                level="M"
                                                includeMargin={false}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between print:hidden">
                    <p className="text-xs text-slate-400 font-medium">
                        Tipp: Nutze ein schwereres Papier (120g+) für ein hochwertigeres Gefühl bei der Rückgabe.
                    </p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Powered by Koreki.org
                    </p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        visibility: hidden;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .printable-slips, .printable-slips * {
                        visibility: visible;
                    }
                    .printable-slips {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .fixed {
                        position: static !important;
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
};
