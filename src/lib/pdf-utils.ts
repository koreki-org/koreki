/**
 * PDF Generation Utilities
 * 📄🏮🛡️
 * Decoupled utility functions for cleaning didactical marks and formatting tables
 * to keep the main pdf.ts orchestrator modular, testable, and lightweight.
 */

/**
 * Replaces didactical codes ([r], [f], [FF] etc.) with readable text,
 * removes gear/system emojis, and cleans non-ASCII symbols so that
 * standard Helvetica font renders them cleanly without corruption.
 */
export function cleanDidacticalMarks(text: string): string {
    if (!text) return "";
    return text
        .replace(/\[⚙️/g, '[System')
        .replace(/⚙️/g, '')
        // Clean up only the emojis and private use unicode areas to prevent PDF generation crashes/mangling
        .replace(/[\u2600-\u27BF]/g, '') // Dingbats & miscellaneous symbols
        .replace(/[\uE000-\uF8FF]/g, '') // Private use area
        .replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, ''); // Surrogate pairs (emojis)
}

/**
 * Parses markdown tables within the feedback string and formats them
 * into an extremely clean, readable bulleted key-value list for the PDF cell.
 */
export function formatMarkdownTableForPDF(text: string): string {
    if (!text) return "";

    const lines = text.split('\n');
    const tableLines: { index: number, line: string }[] = [];

    lines.forEach((line, idx) => {
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            tableLines.push({ index: idx, line: line.trim() });
        }
    });

    if (tableLines.length < 3) {
        return cleanDidacticalMarks(text);
    }

    const beforeLines: string[] = [];
    const afterLines: string[] = [];
    const tableStringLines: string[] = [];

    const tableStartIdx = tableLines[0].index;
    const tableEndIdx = tableLines[tableLines.length - 1].index;

    lines.forEach((line, idx) => {
        if (idx < tableStartIdx) {
            beforeLines.push(line);
        } else if (idx > tableEndIdx) {
            afterLines.push(line);
        } else {
            tableStringLines.push(line.trim());
        }
    });

    try {
        const parseRow = (row: string) => {
            const inner = row.slice(1, -1);
            return inner.split('|').map(cell => cell.trim());
        };

        const headerCells = parseRow(tableStringLines[0]);
        const dataRows = tableStringLines.slice(2).map(parseRow);

        let formattedTable = "";
        dataRows.forEach(rowCells => {
            const rowName = rowCells[0]?.replace(/\*\*/g, '') || 'Eintrag';
            formattedTable += `\n• ${rowName}:\n`;

            for (let i = 1; i < headerCells.length; i++) {
                const colName = headerCells[i] || `Wert ${i}`;
                const val = rowCells[i] || '-';
                if (val && val !== '-' && val !== '/' && val.trim() !== '') {
                    const cleanVal = val.replace(/\*/g, '').replace(/_/g, '');
                    formattedTable += `  - ${colName}: ${cleanVal}\n`;
                }
            }
        });

        const cleanBefore = cleanDidacticalMarks(beforeLines.join('\n').trim());
        const cleanAfter = cleanDidacticalMarks(afterLines.join('\n').trim());
        const cleanTable = cleanDidacticalMarks(formattedTable.trim());

        let result = "";
        if (cleanBefore) result += cleanBefore + "\n\n";
        if (cleanTable) result += cleanTable;
        if (cleanAfter) result += "\n\n" + cleanAfter;

        return result.trim();
    } catch (err) {
        console.error("Failed to parse markdown table in PDF export:", err);
        return cleanDidacticalMarks(text);
    }
}
