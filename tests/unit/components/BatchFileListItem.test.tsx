import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchFileListItem } from '../../../src/components/batch/BatchFileListItem';
import { BatchFile } from '../../../src/types';

/**
 * Die Lauf-Aktionen einer Zeile lagen bis 20.08.2026 in drei Formen an zwei
 * Stellen und deckten den wartenden Zustand gar nicht ab: Eine erste Arbeit
 * liess sich nicht vorab korrigieren, ohne alle anderen von Hand abzuwaehlen.
 * Sie wohnen jetzt gemeinsam in der Aktionsleiste (BatchItemRunActions).
 */
describe('BatchFileListItem — Lauf-Aktionen einer Zeile (Layer 2)', () => {
    const KORRIGIEREN = 'Nur diese Arbeit korrigieren';
    const ERKENNEN = 'Nur diese Arbeit erkennen';
    const WIEDERHOLEN = 'Korrektur wiederholen';
    const ERNEUT = 'Erneut korrigieren';
    const ERSETZEN = 'Vorhandene Bewertung ersetzen';

    const datei = (ueberschreibung: Partial<BatchFile> = {}): BatchFile => ({
        name: 'Schueler #1',
        status: 'pending',
        result: null,
        error: null,
        selected: true,
        ocrDone: true,
        documentType: 'typed',
        fileText: 'Antwort des Schuelers',
        ...ueberschreibung
    });

    const fertig = (): BatchFile => datei({
        status: 'done',
        grade: '2,0',
        result: { tasks: [{ name: 'A1', pointsObtained: 4, maxPoints: 5 }] }
    });

    const zeichne = (item: BatchFile, props: Record<string, unknown> = {}) => {
        const onProcessSingleFile = jest.fn();
        const onProcessSingleOCR = jest.fn();
        render(
            <BatchFileListItem
                item={item}
                idx={3}
                currentProcessingIndex={null}
                loading={false}
                expandedIdx={null}
                onToggleExpand={() => {}}
                onToggleSelect={() => {}}
                onToggleType={() => {}}
                onRemoveFile={() => {}}
                onSplit={() => {}}
                onRedact={() => {}}
                onUpdateText={() => {}}
                previewUrl={null}
                showScan={false}
                onToggleScan={() => {}}
                mobileViewMode="text"
                onSetMobileViewMode={() => {}}
                tasksLayout={[]}
                groupNames={[]}
                activeGroupName=""
                onSetActiveGroupName={() => {}}
                groupedTasks={{}}
                getConfidenceColor={() => ''}
                handleReviewPointChange={() => {}}
                handleReviewFeedbackChange={() => {}}
                onProcessSingleFile={onProcessSingleFile}
                onProcessSingleOCR={onProcessSingleOCR}
                canRerunSingleOcr={true}
                {...props}
            />
        );
        return { onProcessSingleFile, onProcessSingleOCR };
    };

    describe('wartende Arbeit', () => {
        test('bietet die Einzelkorrektur an und reicht den Zeilenindex durch', () => {
            const { onProcessSingleFile } = zeichne(datei());

            fireEvent.click(screen.getByLabelText(KORRIGIEREN));

            // Der Index der Zeile, nicht der der ersten Datei.
            expect(onProcessSingleFile).toHaveBeenCalledWith(3);
        });

        test('ohne erkannten Text bleibt die Korrektur aus — sie haette keinen Schuelertext', () => {
            zeichne(datei({ ocrDone: false, documentType: 'scanned', fileText: '' }));

            expect(screen.queryByLabelText(KORRIGIEREN)).toBeNull();
            expect(screen.getByLabelText(ERKENNEN)).toBeTruthy();
        });
    });

    describe('fehlgeschlagene Arbeit', () => {
        test('die Wiederholung bleibt beschriftet — hier muss angeleitet werden', () => {
            const { onProcessSingleFile } = zeichne(datei({ status: 'error', error: 'Zeitueberschreitung' }));

            const knopf = screen.getByLabelText(WIEDERHOLEN);
            expect(knopf.textContent).toContain('Korrektur neu starten');

            fireEvent.click(knopf);
            expect(onProcessSingleFile).toHaveBeenCalledWith(3);
        });
    });

    describe('fertige Arbeit', () => {
        test('laeuft erst nach der Rueckfrage — ein Klick allein ersetzt nichts', () => {
            const { onProcessSingleFile } = zeichne(fertig());

            fireEvent.click(screen.getByLabelText(ERNEUT));
            expect(onProcessSingleFile).not.toHaveBeenCalled();

            const rueckfrage = screen.getByLabelText(ERSETZEN);
            expect(rueckfrage.textContent).toContain('Bewertung ersetzen?');

            fireEvent.click(rueckfrage);
            expect(onProcessSingleFile).toHaveBeenCalledWith(3);
        });

        test('die Rueckfrage verfaellt, wenn die Maus den Knopf verlaesst', () => {
            zeichne(fertig());

            fireEvent.click(screen.getByLabelText(ERNEUT));
            fireEvent.mouseLeave(screen.getByLabelText(ERSETZEN));

            expect(screen.getByLabelText(ERNEUT)).toBeTruthy();
        });
    });

    test('waehrend eines laufenden Stapels bleibt jede Lauf-Aktion aus', () => {
        zeichne(datei(), { loading: true });

        expect(screen.queryByLabelText(KORRIGIEREN)).toBeNull();
        expect(screen.queryByLabelText(ERKENNEN)).toBeNull();
    });
});
