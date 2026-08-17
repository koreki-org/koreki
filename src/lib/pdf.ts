import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { StudentResult } from './excel';
import { downloadFile } from './file-utils';
import { toSafeString } from './validation';

import { cleanDidacticalMarks, formatMarkdownTableForPDF, stripPangBlock } from './pdf-utils';

/**
 * Was `jspdf-autotable` und jsPDF zur Laufzeit anhaengen, aber nicht deklarieren.
 *
 * `lastAutoTable` entsteht erst NACH dem ersten `autoTable`-Aufruf — daran
 * haengt die Y-Position der naechsten Ueberschrift. `internal` ist als intern
 * markiert, `getNumberOfPages` daraus aber der uebliche Weg zur Seitenzahl.
 *
 * Stand vorher siebenmal als `(doc as any)` in dieser Datei. Einmal
 * hingeschrieben ist es nachpruefbar: faellt `lastAutoTable` in einer neuen
 * Version weg, meldet es der Compiler statt der leeren Seite.
 */
interface PdfMitAutoTable extends jsPDF {
    lastAutoTable?: { finalY: number };
    internal: jsPDF['internal'] & { getNumberOfPages: () => number };
}

/** Y-Position unterhalb der zuletzt gezeichneten Tabelle. */
const nachLetzterTabelle = (doc: jsPDF, abstand: number): number =>
    ((doc as PdfMitAutoTable).lastAutoTable?.finalY ?? 0) + abstand;

const seitenzahl = (doc: jsPDF): number => (doc as PdfMitAutoTable).internal.getNumberOfPages();

/**
 * Helper to generate a PDF blob for a single student.
 */
const generateStudentPDF = (r: StudentResult, pointsMode: 'none' | 'total' | 'detailed' = 'detailed'): Blob => {
    const doc = new jsPDF();
    const analysis = r.analysis || {};
    const name = toSafeString(r.studentName || 'Unbekannt');
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
    
    const feedbackText = cleanDidacticalMarks(stripPangBlock(toSafeString(analysis.overallFeedback || 'Kein Gesamtfeedback vorhanden.')));
    const splitFeedback = doc.splitTextToSize(feedbackText, 180);
    doc.text(splitFeedback, 14, 58);

    const startYForTable = 58 + (splitFeedback.length * 5) + 10;

    // --- Detail Table ---
    const tableData: (string | number)[][] = [];
    if (analysis.tasks && analysis.tasks.length > 0) {
        const getParentName = (taskName: string) => taskName.match(/^(.*?\d+)/)?.[0]?.trim() || taskName;

        const parentOrder: string[] = [];
        const grouped: Record<string, typeof analysis.tasks> = {};

        analysis.tasks.forEach((task) => {
            const parent = getParentName(task.name || '');
            if (!grouped[parent]) {
                grouped[parent] = [];
                parentOrder.push(parent);
            }
            grouped[parent].push(task);
        });

        parentOrder.forEach((parentName) => {
            const subtasks = grouped[parentName];

            // Calculate parent totals
            let parentObtained = 0;
            let parentMax = 0;
            subtasks.forEach((t) => {
                parentObtained += Number(t.pointsObtained || 0);
                parentMax += Number(t.maxPoints || 0);
            });

            if (subtasks.length === 1) {
                const task = subtasks[0];
                let displayName = toSafeString(task.name || parentName);
                if (pointsMode === 'detailed' || pointsMode === 'total') {
                    displayName += ` (${task.pointsObtained || 0} / ${task.maxPoints || 0} P.)`;
                }
                tableData.push([
                    displayName,
                    formatMarkdownTableForPDF(stripPangBlock(toSafeString(task.feedback || '-')))
                ]);
            } else {
                // List subtasks
                subtasks.forEach((task) => {
                    let displayName = toSafeString(task.name || '');
                    if (pointsMode === 'detailed') {
                        displayName += ` (${task.pointsObtained || 0} / ${task.maxPoints || 0} P.)`;
                    }
                    tableData.push([
                        displayName,
                        formatMarkdownTableForPDF(stripPangBlock(toSafeString(task.feedback || '-')))
                    ]);
                });

                // Add sum row for the parent task
                if (pointsMode === 'detailed' || pointsMode === 'total') {
                    tableData.push([
                        `Gesamt ${parentName} (${parentObtained} / ${parentMax} P.)`,
                        ''
                    ]);
                }
            }
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
    const pageCount = seitenzahl(doc);
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
export const exportIndividualPDFs = async (
    results: StudentResult[],
    pointsMode: 'none' | 'total' | 'detailed' = 'detailed'
): Promise<void> => {
    if (!results || results.length === 0) return;

    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];

    results.forEach((r, index) => {
        const pdfBlob = generateStudentPDF(r, pointsMode);
        const safeName = toSafeString(r.studentName || 'Unbekannt').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
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
    doc.text('Noten-/Einschätzungsverteilung', 14, nachLetzterTabelle(doc, 15));

    const distData = Object.entries(stats.distribution)
        .sort()
        .map(([label, count]) => [`Einschätzung ${label}`, `${count} Schüler`]);

    autoTable(doc, {
        startY: nachLetzterTabelle(doc, 20),
        head: [['Note / Einschätzung', 'Anzahl']],
        body: distData,
        theme: 'striped',
        headStyles: { fillColor: brandColor as [number, number, number] }
    });

    // --- Critical Tasks ---
    if (stats.criticalTasks.length > 0) {
        doc.setFontSize(14);
        doc.text('Kritische Aufgabengebiete', 14, nachLetzterTabelle(doc, 15));

        const criticalData = stats.criticalTasks.map((t, idx) => [
            idx + 1,
            t.name,
            `${Math.round(t.percentage)}%`,
            t.percentage < 40 ? 'Kritisch' : 'Prüfen'
        ]);

        autoTable(doc, {
            startY: nachLetzterTabelle(doc, 20),
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
    const pageCount = seitenzahl(doc);
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

