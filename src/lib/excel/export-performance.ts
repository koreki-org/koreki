import * as XLSX from 'xlsx';
import { BatchFile } from '../../types';
import { downloadWorkbook } from './utils';

export interface PerformanceMetadata {
    mode: string;
    provider: string;
    model: string;
    isPure: boolean;
}

/**
 * Generates an Excel file with AI performance metrics (inference duration).
 * Now includes configuration metadata as requested.
 */
export const exportPerformanceExcel = async (
    batchFiles: BatchFile[],
    metadata?: PerformanceMetadata
): Promise<void> => {
    const finishedFiles = batchFiles.filter(f => f.status === 'done' && f.inferenceDuration != null);
    if (finishedFiles.length === 0) return;

    const totalDurationMs = finishedFiles.reduce((acc, f) => acc + (f.inferenceDuration || 0), 0);
    const totalWords = finishedFiles.reduce((acc, f) => {
        const text = f.fileText || (f.tasks || []).map(t => t.content).join(' ');
        return acc + (text.trim() ? text.trim().split(/\s+/).length : 0);
    }, 0);
    const totalTasksInLayout = Math.max(...finishedFiles.map(f => f.result?.tasks?.length || 0));
    const totalProcessedTasks = totalTasksInLayout * finishedFiles.length;
    
    const globalDurationSec = totalDurationMs / 1000;
    const globalDurationPerWord = totalWords > 0 ? globalDurationSec / totalWords : 0;
    const globalDurationPerTask = totalProcessedTasks > 0 ? globalDurationSec / totalProcessedTasks : 0;

    const deploymentLabel = metadata ? (metadata.mode.charAt(0).toUpperCase() + metadata.mode.slice(1)) : 'Unbekannt';
    const sourceLabel = metadata ? (
        metadata.provider === 'ollama' ? 'Lokal (Ollama)' : 
        (metadata.isPure ? `API (Eigener Key - ${metadata.provider === 'openai-compatible' ? 'Qwen/Custom' : 'Mistral'})` : 
        (metadata.provider === 'openai-compatible' ? 'SaaS API (Qwen/Pro)' : 'SaaS API (Mistral)'))
    ) : 'Unbekannt';
    const modelLabel = metadata ? (metadata.model || (metadata.provider === 'openai-compatible' ? 'Qwen 3.6 (Pro)' : 'Mistral Standard')) : 'Unbekannt';

    const rows: any[][] = [
        ['KI-PERFORMANCE ANALYSE - KONFIGURATION'],
        ['Deployment-Modus:', deploymentLabel],
        ['KI-Quelle:', sourceLabel],
        ['Verwendetes Modell:', modelLabel],
        ['Export-Datum:', new Date().toLocaleString('de-DE')],
        [''],
        ['GESAMT-STATISTIK (OVERALL)'],
        ['Metrik / Fokus', 'Gesamt-Dauer (s)', 'Aufgabenanzahl (Total)', 'Ø Dauer pro Aufgabe (s)', 'Gesamt-Wortanzahl', 'Ø Dauer pro Wort (s)'],
        ['Stapelverarbeitung (Gesamt)', Number(globalDurationSec.toFixed(2)), totalProcessedTasks, Number(globalDurationPerTask.toFixed(4)), totalWords, Number(globalDurationPerWord.toFixed(4))],
        [''], 
        ['EINZELAUSWERTUNG PRO SCHÜLER'],
        ['Schüler / Arbeit', 'Inferenz-Dauer (s)', 'Aufgabenanzahl', 'Dauer pro Aufgabe (s)', 'Wortanzahl', 'Dauer pro Wort (s)']
    ];

    finishedFiles.forEach(f => {
        const text = f.fileText || (f.tasks || []).map(t => t.content).join(' ');
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        const durationSec = (f.inferenceDuration! / 1000);
        const durationPerWord = wordCount > 0 ? (durationSec / wordCount) : 0;
        const durationPerTask = totalTasksInLayout > 0 ? (durationSec / totalTasksInLayout) : 0;

        rows.push([
            f.name,
            Number(durationSec.toFixed(2)),
            totalTasksInLayout,
            Number(durationPerTask.toFixed(4)),
            wordCount,
            Number(durationPerWord.toFixed(4))
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 35 }, 
        { wch: 18 }, 
        { wch: 20 }, 
        { wch: 22 }, 
        { wch: 18 }, 
        { wch: 22 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KI-Performance");

    const dateStr = new Date().toISOString().split('T')[0];
    await downloadWorkbook(wb, `KI_Performance_Analyse_${dateStr}.xlsx`);
};
