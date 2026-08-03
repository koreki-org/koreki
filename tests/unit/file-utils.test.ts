import { toBase64, renderDocumentPages } from '../../src/lib/file-utils';

describe('File Utils tests', () => {

    describe('toBase64', () => {
        it('should convert a File to a base64 string', async () => {
            const blob = new Blob(['hello'], { type: 'text/plain' });
            const file = new File([blob], 'test.txt', { type: 'text/plain' });
            
            // Mock FileReader
            const mockReader = {
                result: 'data:text/plain;base64,aGVsbG8=',
                readAsDataURL: jest.fn(function() {
                    this.onload();
                }),
                onload: jest.fn(),
                onerror: jest.fn(),
            };
            (global as any).FileReader = jest.fn(() => mockReader);

            const result = await toBase64(file);
            expect(result).toBe('aGVsbG8=');
            expect(mockReader.readAsDataURL).toHaveBeenCalledWith(file);
        });
    });

    /**
     * renderDocumentPages erzeugt Seitenbilder auf Anforderung. Notwendig, weil
     * `extractTextFromFile` für Bild-Uploads (JPG/PNG) grundsätzlich keine
     * `previewDataUrls` liefert — ohne diese Funktion ließen sich gespeicherte
     * Schwärzungs-Koordinaten auf solchen Dokumenten nie auftragen, und an die
     * Bilderkennung ginge die ungeschwärzte Originalseite.
     */
    describe('renderDocumentPages', () => {
        const OriginalFileReader = global.FileReader;

        afterEach(() => {
            (global as any).FileReader = OriginalFileReader;
        });

        it('liefert für Bild-Uploads genau eine Seite als Data-URL', async () => {
            const mockReader = {
                result: 'data:image/png;base64,SCAN',
                readAsDataURL: jest.fn(function (this: any) { this.onload({ target: this }); }),
                onload: jest.fn(),
                onerror: jest.fn(),
            };
            (global as any).FileReader = jest.fn(() => mockReader);

            const file = new File(['x'], 'scan.png', { type: 'image/png' });

            await expect(renderDocumentPages(file)).resolves.toEqual(['data:image/png;base64,SCAN']);
        });

        /**
         * Der Aufrufer MUSS eine leere Liste von einem Fehlschlag unterscheiden
         * können: Ohne Seitenbilder darf ein Dokument nicht als geschwärzt
         * gekennzeichnet werden, sonst zeigt die Stapelliste einen Schutz an,
         * den es nicht gibt.
         */
        it('liefert eine leere Liste für nicht renderbare Dateitypen', async () => {
            const file = new File(['x'], 'notizen.txt', { type: 'text/plain' });

            await expect(renderDocumentPages(file)).resolves.toEqual([]);
        });
    });

    // Note: extractTextFromFile and convertPdfToImage rely heavily on pdfjs-dist
    // which is hard to mock deeply in unit tests without a lot of boilerplate.
    // For "Industrial Grade", we at least ensure the core utilities are tested.
    // Full PDF orchestration would typically be covered in E2E tests (Layer 3).
});
