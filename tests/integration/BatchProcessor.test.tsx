import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BatchProcessor from '../../src/components/BatchProcessor';
import { createBatchFile } from '../../src/test/factories';
import '@testing-library/jest-dom';
import { useBatchStore } from '../../src/hooks/store/useBatchStore';

// Isolated Mocking for Industrial Integrity 🏮🛡️
jest.mock('../../src/hooks/useAuth', () => ({
    useAuth: () => ({
        userData: { id: 'u1', role: 'USER', credits: 100 },
        authLoading: false,
        aiStatus: { status: 'healthy' },
        checkAuth: jest.fn(),
        fetchAiStatus: jest.fn(),
        setUserData: jest.fn()
    })
}));

describe('BatchProcessor Integration (Steel Thread A)', () => {

    afterEach(() => {
        cleanup();
        // Die geoeffnete Arbeit lebt im Store (Seitenleiste) und ueberdauert sonst den Test.
        useBatchStore.setState({ batchFiles: [], aufgeklappteArbeit: null, einrichtungOffen: false });
    });

    const onProcessMock = jest.fn();
    const defaultProps = {
        batchFiles: [
            createBatchFile({ name: 'S1', status: 'pending', pageCount: 1 }),
            createBatchFile({ name: 'S2', status: 'pending', pageCount: 1 })
        ],
        loading: false,
        currentProcessingIndex: null,
        onProcess: onProcessMock,
        onExtractOCR: jest.fn(),
        onExportTeacher: jest.fn(),
        onExportStudents: jest.fn(),
        onExportIndividual: jest.fn(),
        onExportPDFs: jest.fn(),
        onExportKoreki: jest.fn(),
        onToggleSelect: jest.fn(),
        onToggleType: jest.fn(),
        onUpdateText: jest.fn(),
        onSplit: jest.fn(),
        onRedact: jest.fn(),
        onRemoveFile: jest.fn(),
        credits: 100,
        tasksLayout: [],
        avvAccepted: true
    };

    // Der stapelweite Wiederlauf verwarf die Pruefarbeit der Lehrkraft wortlos:
    // onResetResults setzt result und grade jeder fertigen Arbeit zurueck,
    // der Dialog davor sprach nur vom Datenschutz.
    it('warnt vor dem stapelweiten Wiederlauf, dass die Bewertungen verworfen werden', () => {
        render(<BatchProcessor {...defaultProps} batchFiles={[
            createBatchFile({ name: 'S1', status: 'done', pageCount: 1, grade: '2,0', result: { tasks: [] } }),
            createBatchFile({ name: 'S2', status: 'done', pageCount: 1, grade: '3,0', result: { tasks: [] } })
        ]} />);

        fireEvent.click(screen.getByText(/Erneut korrigieren/i));

        expect(screen.getByText('Bewertungen werden verworfen')).toBeInTheDocument();
        expect(screen.getByText(/Bewertungen von 2 Arbeit\(en\)/i)).toBeInTheDocument();
        // Der Titel darf nicht mehr vom Datenschutz sprechen, wenn Bewertungen fallen.
        expect(screen.getByText('Bewertungen verwerfen und neu korrigieren')).toBeInTheDocument();
    });

    it('should render the dashboard and trigger the Start Correction funnel', async () => {
        // 1. Initial Render
        render(<BatchProcessor {...defaultProps} />);
        
        expect(screen.getByText('Alle Arbeiten')).toBeInTheDocument();
        expect(screen.getByText('S1')).toBeInTheDocument();
        expect(screen.getByText('S2')).toBeInTheDocument();

        // 2. Locate Start Button in Header
        // In BatchHeader: {pendingCount === 0 ? "Alle korrigiert" : "Korrigieren ({totalPendingCredits} Credits)"}
        // `\s`: Zwischen Zahl und "Credits" steht ein geschuetztes Leerzeichen.
        const startBtn = screen.getByText(/Korrigieren \(2\sCredits\)/i);
        expect(startBtn).toBeInTheDocument();

        // 3. Click Start -> Should open ConfirmationModal
        fireEvent.click(startBtn);

        // 4. Verify Modal presence
        expect(screen.getByText('Datenschutz-Bestätigung')).toBeInTheDocument();
        expect(screen.getByText(/Ich bestätige, dass ich die oben hochgeladenen Dokumente anonymisiert habe/i)).toBeInTheDocument();

        // 5. Mock fetch for privacy logging (BatchProcessor line 140)
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ([]) });

        // 6. Click Confirm in Modal
        const confirmBtn = screen.getByText('Bestätigen');
        fireEvent.click(confirmBtn);

        // 7. Verify final callback (Wait for async fetch inside handleConfirmAction)
        const { waitFor } = require('@testing-library/react');
        await waitFor(() => {
            expect(onProcessMock).toHaveBeenCalled();
        });
    });

    it('should allow editing points in a finished student (Steel Thread B)', async () => {
        const onUpdateTextMock = jest.fn();
        const doneProps = {
            ...defaultProps,
            batchFiles: [
                createBatchFile({ 
                    name: 'S-Done', 
                    status: 'done', 
                    fileText: 'Full student paper text...',
                    result: { 
                        overallMatchPercentage: 80, 
                        tasks: [{ name: 'Aufgabe 1', pointsObtained: 5, maxPoints: 10, feedback: 'Gut' }] 
                    } 
                })
            ],
            onUpdateText: onUpdateTextMock
        };

        // Die Ansicht liest die Arbeiten aus dem Store — in der App sind es dieselben wie in den Props.
        useBatchStore.setState({ batchFiles: doneProps.batchFiles });
        render(<BatchProcessor {...doneProps} />);

        // 1. Open the student on the full surface
        const expandBtn = screen.getByLabelText('Öffnen');
        fireEvent.click(expandBtn);

        // 2. Find the points input for 'Aufgabe 1'
        // It has value 5 initially. We use getByDisplayValue since it's a number input.
        const pointsInput = screen.getByDisplayValue('5');
        expect(pointsInput).toBeInTheDocument();

        // 3. Change points to 8
        fireEvent.change(pointsInput, { target: { value: '8' } });

        // 4. Verify onUpdateText was called with the updated task list
        expect(onUpdateTextMock).toHaveBeenCalledWith(
            0, 
            expect.anything(), 
            expect.arrayContaining([
                expect.objectContaining({ name: 'Aufgabe 1', pointsObtained: 8 })
            ])
        );
    });

    it('should show export toolbar and trigger Koreki export (Steel Thread C)', async () => {
        const onExportKorekiMock = jest.fn();
        const doneProps = {
            ...defaultProps,
            batchFiles: [
                createBatchFile({ name: 'S-Done', status: 'done' })
            ],
            onExportKoreki: onExportKorekiMock
        };

        render(<BatchProcessor {...doneProps} />);

        // 1. Verify Export Toolbar is visible (Conditional rendering check)
        expect(screen.getByText(/Einschätzungsliste/i)).toBeInTheDocument();

        // 2. Click 'Korrektur speichern' (bis 21.11.2026 „Korrektur exportieren“)
        const exportBtn = screen.getByText(/Korrektur speichern/i);
        fireEvent.click(exportBtn);

        // 3. Verify callback
        expect(onExportKorekiMock).toHaveBeenCalled();
    });

    /**
     * Ein Knopf fuer dieselbe .koreki-Datei, vor UND nach dem Korrigieren
     * (21.11.2026). Vorher hiess er davor „Exportieren“ und danach
     * „Korrektur exportieren“ — und fehlte, solange die Bilderkennung offen war.
     */
    it('zeigt „Korrektur speichern“ schon vor dem Korrigieren, mit Dateiname als Schuelerloesung', () => {
        const onExportSL = jest.fn();
        const onExportKoreki = jest.fn();
        render(<BatchProcessor {...defaultProps}
            batchFiles={[createBatchFile({ name: 'S-Offen', status: 'pending' })]}
            onExportSL={onExportSL} onExportKoreki={onExportKoreki} />);

        fireEvent.click(screen.getByText(/Korrektur speichern/i));
        expect(onExportSL).toHaveBeenCalled();
        expect(onExportKoreki).not.toHaveBeenCalled();
    });
});
