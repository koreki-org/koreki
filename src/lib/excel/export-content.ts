import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { downloadFile } from '../file-utils';
import { StudentResult } from './types';
import { downloadWorkbook, schreibeWorkbook } from './utils';

/** Eine Zeile des Feedback-Blatts. */
export interface FeedbackZeile {
    'Nachname': string;
    'Vorname': string;
    'KI-Expertise': string;
    'Gesamtfeedback': string;
    'Aufgabe': string;
    'Feedback zur Aufgabe': string;
}

/**
 * Die Feedback-Zeilen einer Schuelerarbeit.
 * 📄
 *
 * Eine Zeile je Aufgabe; die Angaben zur Person stehen nur in der ERSTEN, damit
 * das Blatt lesbar bleibt und nicht bei jeder Aufgabe denselben Namen zeigt.
 * Ohne Aufgaben bleibt eine Zeile mit Strichen — sonst faellt die Arbeit im
 * Export ganz weg, und die Lehrkraft merkt nicht, dass sie fehlt.
 *
 * WARUM DAS EINE FUNKTION IST
 * ---------------------------
 * Dieser Aufbau stand zweimal da: einmal fuer den Einzelexport, einmal fuer die
 * Sammelmappe — 14 Zeilen zeichengleich. Wer eine Spalte ergaenzt haette, haette
 * sie in genau einem der beiden Exporte ergaenzt, und niemand haette es gemerkt,
 * weil beide fuer sich weiter funktionieren.
 */
export const baueFeedbackZeilen = (r: StudentResult): FeedbackZeile[] => {
    const analysis = r.analysis || {};
    const nachname = r.studentLastName || 'Unbekannt';
    const vorname = r.studentFirstName || '';
    const expertise = analysis.expertProfile || 'Standard';
    const gesamt = analysis.overallFeedback || '';

    if (!analysis.tasks || analysis.tasks.length === 0) {
        return [{
            'Nachname': nachname,
            'Vorname': vorname,
            'KI-Expertise': expertise,
            'Gesamtfeedback': gesamt,
            'Aufgabe': '-',
            'Feedback zur Aufgabe': '-'
        }];
    }

    return analysis.tasks.map((task, index) => ({
        'Nachname': index === 0 ? nachname : '',
        'Vorname': index === 0 ? vorname : '',
        'KI-Expertise': index === 0 ? expertise : '',
        'Gesamtfeedback': index === 0 ? gesamt : '',
        'Aufgabe': task.name || `Aufgabe ${index + 1}`,
        'Feedback zur Aufgabe': task.feedback || ''
    }));
};

/** Spaltenbreiten des Feedback-Blatts — fuer beide Exporte dieselben. */
const FEEDBACK_SPALTEN = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 50 }, { wch: 20 }, { wch: 60 }];

/**
 * Generates an Excel workbook for a single student.
 */
export const generateStudentWorkbook = (r: StudentResult): XLSX.WorkBook => {
    const ws = XLSX.utils.json_to_sheet(baueFeedbackZeilen(r));
    ws['!cols'] = FEEDBACK_SPALTEN;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feedback");
    return wb;
};

/**
 * Generates an Excel file for the teacher (Grade List).
 */
export const exportTeacherList = (
    results: StudentResult[],
    metadata?: {
        expertise?: string;
        gradingMemory?: string;
        aiModel?: string;
    }
): void => {
    if (!results || results.length === 0) return;

    const getParentName = (name: string) => name.match(/^(.*?\d+)/)?.[0]?.trim() || name;
    const parentTaskOrder: string[] = [];
    const parentTaskMaxPoints: Record<string, number> = {};

    results.forEach(r => {
        if (r.analysis?.tasks) {
            r.analysis.tasks.forEach(task => {
                const parentName = getParentName(task.name || '');
                if (!parentTaskOrder.includes(parentName)) {
                    parentTaskOrder.push(parentName);
                }
            });
        }
    });

    let totalExamMaxPoints = 0;
    if (results[0].analysis?.tasks) {
        results[0].analysis.tasks.forEach(task => {
            const parentName = getParentName(task.name || '');
            const pts = Number(task.maxPoints || 0);
            parentTaskMaxPoints[parentName] = (parentTaskMaxPoints[parentName] || 0) + pts;
            totalExamMaxPoints += pts;
        });
    }

    const data = results.map(r => {
        const analysis = r.analysis || {};
        let totalStudentPoints = 0;
        const studentParentPoints: Record<string, number> = {};
        (analysis.tasks || []).forEach(task => {
            const parentName = getParentName(task.name || '');
            const pts = Number(task.pointsObtained || 0);
            studentParentPoints[parentName] = (studentParentPoints[parentName] || 0) + pts;
            totalStudentPoints += pts;
        });

        const row: any = {
            'Nachname': r.studentLastName || 'Unbekannt',
            'Vorname': r.studentFirstName || '',
            [`Erreichte Punkte (von ${totalExamMaxPoints} P)`]: totalStudentPoints,
            'Gesamt (%)': analysis.overallMatchPercentage ? Math.round(analysis.overallMatchPercentage) : 0,
            'Einschätzung': r.grade || '-'
        };

        parentTaskOrder.forEach(parentName => {
            const maxP = parentTaskMaxPoints[parentName] || 0;
            const colName = `${parentName} (${maxP} P)`;
            row[colName] = studentParentPoints[parentName] || 0;
        });

        return row;
    });

    let ws: XLSX.WorkSheet;
    if (metadata) {
        ws = XLSX.utils.aoa_to_sheet([
            ['Koreki - KI-Korrektur-Übersicht (Einschätzungsliste)'],
            [],
            ['Angewandtes Fachprofil (Expertise):', metadata.expertise || 'Standard'],
            ['Angewandter Erfahrungsschatz (Memory):', metadata.gradingMemory || 'Standard'],
            ['Eingesetzte KI-Intelligenz (Modell):', metadata.aiModel || 'Standard'],
            ['Export-Datum:', new Date().toLocaleDateString('de-DE')],
            []
        ]);
        XLSX.utils.sheet_add_json(ws, data, { origin: 'A8' });
    } else {
        ws = XLSX.utils.json_to_sheet(data);
    }

    const cols = [{ wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
    parentTaskOrder.forEach(() => cols.push({ wch: 18 }));
    ws['!cols'] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bewertungsübersicht");

    const dateStr = new Date().toISOString().split('T')[0];
    downloadWorkbook(wb, `Bewertungsuebersicht_${dateStr}.xlsx`);
};

/**
 * Generates an Excel file with detailed summaries for all students in one sheet.
 */
export const exportStudentSummaries = (results: StudentResult[]): void => {
    if (!results || results.length === 0) return;

    // Zwischen zwei Arbeiten bleibt eine Leerzeile stehen, damit im Sammelblatt
    // erkennbar ist, wo eine Arbeit endet und die naechste beginnt.
    const data: Partial<FeedbackZeile>[] = [];
    results.forEach((r, rIdx) => {
        data.push(...baueFeedbackZeilen(r));
        if (rIdx < results.length - 1) data.push({});
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = FEEDBACK_SPALTEN;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schüler Feedback");

    const dateStr = new Date().toISOString().split('T')[0];
    downloadWorkbook(wb, `Studenten_Feedback_Gesamt_${dateStr}.xlsx`);
};

/**
 * Generates individual Excel files for each student and bundles them in a ZIP.
 */
export const exportIndividualFeedbacks = async (results: StudentResult[]): Promise<void> => {
    if (!results || results.length === 0) return;

    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];

    results.forEach((r, index) => {
        const wb = generateStudentWorkbook(r);
        const wbout = schreibeWorkbook(wb);
        const safeName = (r.studentName || 'Unbekannt').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        const fileName = `${index + 1}_Feedback_${safeName}_${dateStr}.xlsx`;
        zip.file(fileName, wbout);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    await downloadFile(content, `Einzel_Feedbacks_${dateStr}.zip`, 'application/zip');
};
