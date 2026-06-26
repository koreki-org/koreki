import * as XLSX from 'xlsx';
import { logger } from '../logger';
import { BatchFile } from '../../types';

/**
 * Industrial Moodle Parser (@principal_architect)
 * Analyzes Moodle Quiz Exports (XLSX/CSV) and extracts student responses.
 */
export const parseMoodleExcel = async (file: File): Promise<Partial<BatchFile>[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

                const results: Partial<BatchFile>[] = rows.map((row, idx) => {
                    const lastName = row['Nachname'] || row['Last name'] || row['Surname'] || '';
                    const firstName = row['Vorname'] || row['First name'] || '';
                    const fullName = `${firstName} ${lastName}`.trim();

                    const responsePattern = /^(Response|Antwort|Frage|F\s*\d+)/i;
                    const responseParts: string[] = [];
                    
                    Object.entries(row).forEach(([key, value]) => {
                        if (responsePattern.test(key) && value != null) {
                            const valStr = String(value).trim();
                            const isNumeric = /^-?\d+([.,]\d+)?$/.test(valStr);
                            if (isNumeric && valStr.length < 5) return; 

                            if (valStr.length > 0) {
                                responseParts.push(`=== MOODLE: ${key} ===\n${valStr}`);
                            }
                        }
                    });

                    const consolidatedText = responseParts.join('\n\n');

                    return {
                        name: `Schüler #${idx + 1}`,
                        originalName: fullName || `Moodle-Schüler #${idx + 1}`,
                        studentFirstName: firstName || undefined,
                        studentLastName: lastName || undefined,
                        status: 'pending',
                        fileText: consolidatedText,
                        ocrDone: false,
                        documentType: 'typed',
                        pageCount: 1,
                        selected: true,
                        result: null,
                        error: null
                    };
                });

                resolve(results.filter(r => r.fileText && r.fileText.length > 0));
            } catch (err) {
                logger.error("Moodle parsing failed", { message: String(err) });
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};
