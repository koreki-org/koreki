import * as XLSX from 'xlsx';
import { logger } from '../logger';
import { downloadFile } from '../file-utils';

/**
 * Helper to trigger a browser download of an XLSX workbook.
 */
export const downloadWorkbook = async (wb: XLSX.WorkBook, fileName: string): Promise<void> => {
    try {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        // Ensure we have a Uint8Array for the desktop bridge (Array.from compatibility)
        const uint8 = new Uint8Array(wbout);
        await downloadFile(uint8, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (error) {
        logger.error("Excel download failed", { message: String(error) });
        throw new Error("Dateidownload fehlgeschlagen.");
    }
};
