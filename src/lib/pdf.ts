import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { StudentResult } from './excel';
import { downloadFile } from './file-utils';

import { cleanDidacticalMarks, formatMarkdownTableForPDF, stripPangBlock } from './pdf-utils';

/**
 * Helper to generate a PDF blob for a single student.
 */
const generateStudentPDF = (r: StudentResult): Blob => {
    const doc = new jsPDF();
    const analysis = r.analysis || {};
    const name = r.studentName || 'Unbekannt';
    const brandColor = [37, 99, 235]; // Tailwind blue-600

    // --- Header Section ---
    doc.setFontSize(22);
    doc.setTextColor( brandColor[0], brandColor[1], brandColor[2] );
    doc.text('Koreki Feedback Report', 14, 22);
    
    doc.setDrawColor( brandColor[0], brandColor[1], brandColor[2] );
    doc.setLineWidth(0.5);
    doc.line(14, 25, 196, 25);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Schüler: ${name}`, 14, 35);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 14, 40);

    // --- Summary Section ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Gesamtfeedback:', 14, 52);
    doc.setFont('helvetica', 'normal');
    
    const feedbackText = cleanDidacticalMarks(stripPangBlock(analysis.overallFeedback || 'Kein Gesamtfeedback vorhanden.'));
    const splitFeedback = doc.splitTextToSize(feedbackText, 180);
    doc.text(splitFeedback, 14, 58);

    const startYForTable = 58 + (splitFeedback.length * 5) + 10;

    // --- Detail Table ---
    const tableData: any[][] = [];
    if (analysis.tasks && analysis.tasks.length > 0) {
        analysis.tasks.forEach((task, index) => {
            tableData.push([
                task.name || `Aufgabe ${index + 1}`,
                formatMarkdownTableForPDF(stripPangBlock(task.feedback || '-'))
            ]);
        });
    }

    if (tableData.length > 0) {
        autoTable(doc, {
            startY: startYForTable,
            head: [['Aufgabe', 'Detailliertes Feedback']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
                fillColor: brandColor as [number, number, number],
                fontSize: 11,
                halign: 'left'
            },
            styles: { 
                fontSize: 10, 
                cellPadding: 5,
                valign: 'top',
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 40, fontStyle: 'bold' },
                1: { cellWidth: 'auto' }
            },
            margin: { left: 14, right: 14 }
        });
    }

    // --- Footer (Page Number) ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Seite ${i} von ${pageCount}`, 196, 285, { align: 'right' });
        doc.text('Generiert mit Koreki - Die KI für Lehrer', 14, 285);
    }

    return doc.output('blob');
};


export interface CorrectionStatistics {
    distribution: Record<string, number>;
    avgScore: number;
    avgConfidence: number | null;
    analyzedTasks: {
        name: string;
        percentage: number;
        avgPoints: number;
        maxPoints: number;
    }[];
    criticalTasks: {
        name: string;
        percentage: number;
        avgPoints: number;
        maxPoints: number;
    }[];
    timeSavedMinutes: number;
    totalCount: number;
}

/**
 * Generates individual PDF files for each student and bundles them in a ZIP.
 */
export const exportIndividualPDFs = async (results: StudentResult[]): Promise<void> => {
    if (!results || results.length === 0) return;

    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];

    results.forEach((r, index) => {
        const pdfBlob = generateStudentPDF(r);
        const safeName = (r.studentName || 'Unbekannt').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        const fileName = `${index + 1}_Feedback_${safeName}_${dateStr}.pdf`;
        zip.file(fileName, pdfBlob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    await downloadFile(content, `Einzel_PDFs_${dateStr}.zip`, 'application/zip');
};

/**
 * Generates a PDF report for the batch analytics.
 */
export const exportAnalyticsPDF = async (stats: CorrectionStatistics): Promise<void> => {
    const doc = new jsPDF();
    const brandColor = [37, 99, 235]; // Tailwind blue-600
    const dateStr = new Date().toLocaleDateString('de-DE');

    // --- Header Section ---
    doc.setFontSize(22);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text('Koreki Analyse-Report', 14, 22);

    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 25, 196, 25);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Datum: ${dateStr}`, 14, 32);
    doc.text(`Anzahl korrigierter Arbeiten: ${stats.totalCount}`, 14, 37);

    // --- Summary Cards (Top Stats) ---
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Zusammenfassung', 14, 50);

    const summaryData = [
        ['Ø Erfüllungsgrad', `${Math.round(stats.avgScore)}%`],
        ['KI-Konfidenz', stats.avgConfidence ? `${Math.round(stats.avgConfidence)}%` : 'N/A'],
        ['Zeit gespart', `~${stats.timeSavedMinutes} Min`],
        ['Kritische Bereiche', `${stats.criticalTasks.length}`]
    ];

    autoTable(doc, {
        startY: 55,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    // --- Distribution Table ---
    doc.setFontSize(14);
    doc.text('Noten-/Einschätzungsverteilung', 14, (doc as any).lastAutoTable.finalY + 15);

    const distData = Object.entries(stats.distribution)
        .sort()
        .map(([label, count]) => [`Einschätzung ${label}`, `${count} Schüler`]);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Note / Einschätzung', 'Anzahl']],
        body: distData,
        theme: 'striped',
        headStyles: { fillColor: brandColor as [number, number, number] }
    });

    // --- Critical Tasks ---
    if (stats.criticalTasks.length > 0) {
        doc.setFontSize(14);
        doc.text('Kritische Aufgabengebiete', 14, (doc as any).lastAutoTable.finalY + 15);

        const criticalData = stats.criticalTasks.map((t, idx) => [
            idx + 1,
            t.name,
            `${Math.round(t.percentage)}%`,
            t.percentage < 40 ? 'Kritisch' : 'Prüfen'
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['#', 'Aufgabe', 'Erfolg', 'Status']],
            body: criticalData,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] }, // Red-600
            columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 20 }, 3: { cellWidth: 25 } }
        });
    }

    // --- Full Task Analysis ---
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Vollständige Aufgaben-Analyse', 14, 22);

    const fullTaskData = stats.analyzedTasks.map(t => [
        t.name,
        `${t.avgPoints.toFixed(1)} / ${t.maxPoints}`,
        `${Math.round(t.percentage)}%`
    ]);

    autoTable(doc, {
        startY: 28,
        head: [['Aufgabe', 'Ø Punkte', 'Erfolgsquote']],
        body: fullTaskData,
        theme: 'striped',
        headStyles: { fillColor: brandColor as [number, number, number] }
    });

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Seite ${i} von ${pageCount}`, 196, 285, { align: 'right' });
        doc.text('Generiert mit Koreki - Die KI für Lehrer', 14, 285);
    }

    const blob = doc.output('blob');
    await downloadFile(blob, `Koreki_Analyse_${dateStr.replace(/\./g, '_')}.pdf`, 'application/pdf');
};

