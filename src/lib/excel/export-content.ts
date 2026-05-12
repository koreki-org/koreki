import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { downloadFile } from '../file-utils';
import { StudentResult } from './types';
import { downloadWorkbook } from './utils';

/**
 * Generates an Excel workbook for a single student.
 */
export const generateStudentWorkbook = (r: StudentResult): XLSX.WorkBook => {
    const analysis = r.analysis || {};
    const data: any[] = [];

    if (!analysis.tasks || analysis.tasks.length === 0) {
        data.push({
            'Schülername': r.studentName || 'Unbekannt',
            'KI-Expertise': analysis.expertProfile || 'Standard',
            'Gesamtfeedback': analysis.overallFeedback || '',
            'Aufgabe': '-',
            'Feedback zur Aufgabe': '-'
        });
    } else {
        analysis.tasks.forEach((task, index) => {
            data.push({
                'Schülername': index === 0 ? (r.studentName || 'Unbekannt') : '',
                'KI-Expertise': index === 0 ? (analysis.expertProfile || 'Standard') : '',
                'Gesamtfeedback': index === 0 ? (analysis.overallFeedback || '') : '',
                'Aufgabe': task.name || `Aufgabe ${index + 1}`,
                'Feedback zur Aufgabe': task.feedback || ''
            });
        });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 50 }, { wch: 20 }, { wch: 60 }];

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
            'Schülername': r.studentName || 'Unbekannt',
            'KI-Expertise': analysis.expertProfile || 'Standard',
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

    const cols = [{ wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
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

    const data: any[] = [];
    results.forEach((r, rIdx) => {
        const analysis = r.analysis || {};
        if (!analysis.tasks || analysis.tasks.length === 0) {
            data.push({
                'Schülername': r.studentName || 'Unbekannt',
                'KI-Expertise': analysis.expertProfile || 'Standard',
                'Gesamtfeedback': analysis.overallFeedback || '',
                'Aufgabe': '-',
                'Feedback zur Aufgabe': '-'
            });
        } else {
            analysis.tasks.forEach((task, index) => {
                data.push({
                    'Schülername': index === 0 ? (r.studentName || 'Unbekannt') : '',
                    'KI-Expertise': index === 0 ? (analysis.expertProfile || 'Standard') : '',
                    'Gesamtfeedback': index === 0 ? (analysis.overallFeedback || '') : '',
                    'Aufgabe': task.name || `Aufgabe ${index + 1}`,
                    'Feedback zur Aufgabe': task.feedback || ''
                });
            });
        }
        if (rIdx < results.length - 1) data.push({});
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 50 }, { wch: 20 }, { wch: 60 }];

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
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const safeName = (r.studentName || 'Unbekannt').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
        const fileName = `${index + 1}_Feedback_${safeName}_${dateStr}.xlsx`;
        zip.file(fileName, wbout);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    await downloadFile(content, `Einzel_Feedbacks_${dateStr}.zip`, 'application/zip');
};
