import React, { useRef } from 'react';
import { X, ShieldCheck, Sparkles, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { BatchFile } from '../../types';
import { FeedbackData, encodeFeedback } from '@/lib/distribution';
import { stripPangBlock } from '@/lib/pdf-utils';
import { downloadFile } from '@/lib/file-utils';
import { Button } from '../ui/Button';
import Logo from '../Logo';

interface DigitalSlipsModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchFiles: BatchFile[];
}

export const DigitalSlipsModal: React.FC<DigitalSlipsModalProps> = ({ isOpen, onClose, batchFiles }) => {
    const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

    if (!isOpen) return null;

    const completedFiles = batchFiles.filter(f => f.status === 'done' && f.result);

    const getRealName = (f: BatchFile) => {
        // If it's a pseudonym like "Schüler #1", try to get originalName
        if (/^Schüler #\d+$/.test(f.name) && f.originalName) return f.originalName;
        return f.name || f.originalName || 'Unbekannt';
    };

    const handleDownloadPDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const slipHeight = 55;
        const slipsPerPage = Math.floor((pageHeight - 20) / slipHeight);

        let currentY = 15;
        let count = 0;

        for (const file of completedFiles) {
            if (count > 0 && count % slipsPerPage === 0) {
                doc.addPage();
                currentY = 15;
            }

            const canvas = canvasRefs.current[file.name];
            const realName = getRealName(file);
            
            // Draw Slip Border (Dashed)
            doc.setLineDashPattern([2, 2], 0);
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, currentY, pageWidth - 2 * margin, slipHeight);
            
            // Student Name (Large & Bold) - Real Name used for Export!
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(30, 41, 59);
            doc.text(realName, margin + 8, currentY + 15);

            // Koreki Branding (Top Right)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42); // Slate 900
            const brandingText = 'Koreki';
            const brandingWidth = doc.getTextWidth(brandingText);
            doc.text(brandingText, pageWidth - margin - 38 - brandingWidth - 4, currentY + 14);
            
            doc.setTextColor(37, 99, 235); // Blue 600
            doc.text('.', pageWidth - margin - 38 - 4, currentY + 14);

            // Points
            const tasks = (file.result?.tasks || []);
            const points = tasks.reduce((acc, t) => acc + Number(t.pointsObtained || 0), 0);
            const maxPoints = tasks.reduce((acc, t) => acc + Number(t.maxPoints || 0), 0);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text(`${points} / ${maxPoints} Punkte`, margin + 8, currentY + 22);

            // PIN
            const getStablePin = (name: string) => {
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    hash = ((hash << 5) - hash) + name.charCodeAt(i);
                    hash |= 0;
                }
                return (Math.abs(hash) % 9000 + 1000).toString();
            };
            const pin = getStablePin(realName);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(`PIN: ${pin}`, margin + 8, currentY + 45);

            if (!canvas || canvas.width === 0) {
                // If canvas didn't render (e.g. too long), show placeholder in PDF
                doc.setFontSize(8);
                doc.setTextColor(239, 68, 68);
                doc.text('Feedback zu lang für QR!', pageWidth - margin - 35, currentY + 20);
                doc.text('Bitte Einzel-PDF nutzen.', pageWidth - margin - 35, currentY + 24);
            } else {
                const qrDataUrl = canvas.toDataURL('image/png');
                // Use FAST compression to keep file size low
                doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 38, currentY + 8, 30, 30, undefined, 'FAST');
            }

            // Footer / Instructions
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text('Scan QR-Code für detaillierte Analyse', margin + 8, currentY + 32);
            doc.text('Verschlüsseltes Feedback | koreki.org', margin + 8, currentY + 36);

            currentY += slipHeight;
            count++;
        }

        const pdfBlob = doc.output('blob');
        await downloadFile(pdfBlob, `Koreki_Feedback_Slips_${new Date().toISOString().split('T')[0]}.pdf`, 'application/pdf');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-hero shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
                {/* Header */}
                <div className="p-8 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-background rounded-2xl shadow-sm flex items-center justify-center border border-border">
                            <Logo size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Digitale Rückgabe-Slips</h2>
                            <p className="text-sm text-muted-foreground font-medium">Bereit zum PDF-Export (mit Klarnamen)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleDownloadPDF} className="gap-2 font-bold text-foreground bg-background shadow-sm hover:bg-muted border-border">
                            <Download size={18} /> PDF Export
                        </Button>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors ml-2">
                            <X size={20} className="text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {completedFiles.length === 0 ? (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-muted-foreground font-medium">Keine fertigen Korrekturen zum Exportieren gefunden.</p>
                            </div>
                        ) : (
                            completedFiles.map((file, idx) => {
                                const realName = getRealName(file);
                                const getStablePin = (name: string) => {
                                    let hash = 0;
                                    for (let i = 0; i < name.length; i++) {
                                        hash = ((hash << 5) - hash) + name.charCodeAt(i);
                                        hash |= 0;
                                    }
                                    return (Math.abs(hash) % 9000 + 1000).toString();
                                };
                                const pin = getStablePin(realName);

                                const tasks = (file.result?.tasks || []);
                                const points = tasks.reduce((acc, t) => acc + Number(t.pointsObtained || 0), 0);
                                const maxPoints = tasks.reduce((acc, t) => acc + Number(t.maxPoints || 0), 0);

                                const feedbackData: FeedbackData = {
                                    studentName: realName,
                                    date: new Date().toLocaleDateString('de-DE'),
                                    overallFeedback: stripPangBlock(file.result?.overallFeedback || ''),
                                    tasks: tasks.map(t => ({
                                        id: t.name || 'Aufgabe',
                                        feedback: stripPangBlock(t.feedback || ''),
                                        points: Number(t.pointsObtained || 0),
                                        maxPoints: Number(t.maxPoints || 0)
                                    })),
                                    pin: pin,
                                    points: points,
                                    maxPoints: maxPoints
                                };

                                const encoded = encodeFeedback(feedbackData);
                                const url = `https://koreki.org/view#${encoded}`;
                                const isTooLong = encoded.length > 2700;

                                return (
                                    <div 
                                        key={idx}
                                        className="slip-card bg-background border-2 border-dashed border-border rounded-2xl p-6 flex flex-col gap-4 relative hover:border-border/80 transition-colors"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black text-foreground leading-tight">{file.name}</h3>
                                                <p className="text-sm font-bold text-primary uppercase tracking-wider">{points} / {maxPoints} Punkte</p>
                                                <div className="flex items-center gap-1.5 mt-4 text-muted-foreground">
                                                    <Logo size={14} />
                                                    <span className="text-xxs font-bold uppercase tracking-widest">Feedback Slip</span>
                                                </div>
                                            </div>
                                            <div className="bg-background p-2 rounded-xl border border-border flex items-center justify-center min-w-[120px] min-h-[120px]">
                                                {isTooLong ? (
                                                    <div className="text-xxs text-destructive font-bold text-center leading-tight p-2">
                                                        <X className="mx-auto mb-1" size={16} />
                                                        Feedback zu lang<br/>für QR-Code
                                                    </div>
                                                ) : (
                                                    <QRCodeCanvas 
                                                        value={url} 
                                                        size={400} 
                                                        style={{ width: '100px', height: '100px' }}
                                                        level="L"
                                                        ref={(el) => { canvasRefs.current[file.name] = el; }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between mt-auto">
                                            <div className="space-y-1">
                                                <p className="text-xxs text-muted-foreground font-medium uppercase tracking-tighter">Zugangscode</p>
                                                <p className="text-lg font-mono font-black text-foreground tracking-widest">PIN: {pin}</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-xxs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                                                <ShieldCheck size={12} /> Verschlüsselt
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-6 bg-muted/30 border-t border-border flex items-center justify-between text-muted-foreground print:hidden">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <Sparkles size={14} className="text-primary" />
                        <span>Tipp: Der PDF-Export ist am zuverlässigsten für den Druck.</span>
                    </div>
                    <div className="text-xxs font-bold uppercase tracking-widest opacity-50">
                        koreki.org distribution system
                    </div>
                </div>
            </div>
        </div>
    );
};
