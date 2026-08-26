import * as XLSX from 'xlsx';
import { logger } from '../logger';
import { downloadFile } from '../file-utils';
import { excelKennzeichnung } from '../ai-disclosure';

/**
 * Schreibt ein Workbook als Byte-Array und setzt dabei die Herkunftsangabe
 * fuer KI-generierte Inhalte in die Dateieigenschaften.
 *
 * Jeder Excel-Export muss hierdurch — auch der, der die Datei nicht direkt
 * herunterlaedt, sondern in ein ZIP legt. Sonst entstuende ein Ausgabeweg
 * ohne Kennzeichnung.
 */
export const schreibeWorkbook = (wb: XLSX.WorkBook): ArrayBuffer => {
    wb.Props = { ...(wb.Props ?? {}), ...excelKennzeichnung() };
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
};

/**
 * Helper to trigger a browser download of an XLSX workbook.
 */
export const downloadWorkbook = async (wb: XLSX.WorkBook, fileName: string): Promise<void> => {
    try {
        const wbout = schreibeWorkbook(wb);
        // Ensure we have a Uint8Array for the desktop bridge (Array.from compatibility)
        const uint8 = new Uint8Array(wbout);
        await downloadFile(uint8, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (error) {
        logger.error("Excel download failed", { message: String(error) });
        throw new Error("Dateidownload fehlgeschlagen.");
    }
};
