import { useCallback } from 'react';
import { askConfirmation } from '@/lib/confirm-dialog';
import { meldeHinweis } from '@/lib/notify';
import { istLesbaresDokument, MUSTERLOESUNG_ENDUNGEN } from '@/lib/upload-dateiarten';

/**
 * Entscheidet, was mit einer neu angebotenen Musterloesung geschieht.
 * 📄
 *
 * Diese Entscheidung stand bis zum 09.11.2026 als anonyme Pfeilfunktion mitten
 * im Seitenaufbau von `app.tsx` — und sie fehlte dort zur Haelfte: der Knopf
 * "Ändern" oeffnete den Dateidialog ohne jede Pruefung, auch nachdem schon
 * Arbeiten korrigiert waren. Die Aufgabenstruktur wechselte unter fertigen
 * Korrekturen hinweg, und die Punkte der Schueler zeigten danach auf Aufgaben,
 * die es nicht mehr gab.
 *
 * Zwei Tore, in dieser Reihenfolge:
 *
 * 1. GESPERRT, sobald eine Arbeit korrigiert wird oder ist. Keine Rueckfrage —
 *    hier gibt es nichts abzuwaegen: Die bereits vergebenen Punkte beziehen
 *    sich auf die geladene Aufgabenstruktur. Wer die Aufgaben wirklich wechseln
 *    will, startet eine neue Korrektur; dieser Weg ist vorhanden und benannt.
 * 2. RUECKFRAGE, wenn schon eine Musterloesung da ist, aber noch nichts
 *    korrigiert wurde. Ersetzen ist dann eine normale Absicht — nur eben eine,
 *    die eine halbe Stunde Tipparbeit vernichten kann.
 *
 * Die Flaeche in `UploadAblage` kennt die Sperre ebenfalls und nimmt gar nichts
 * an. Das ist kein Doppel, sondern Absicht: Die Flaeche sagt es dem Auge, hier
 * steht die Regel. Eine dritte Aufrufstelle (ein Knopf, ein Tastenkuerzel)
 * wuerde die Flaeche umgehen, nicht aber diesen Hook.
 */
interface MusterloesungAnnahmeMittel {
    /** Steht schon eine Musterloesung im Feld? */
    hatMusterloesung: boolean;
    /** Wird oder wurde bereits korrigiert? */
    gesperrt: boolean;
    /** Merkt die Datei fuer den Dialog "Scan oder digitaler Text?". */
    setPendingModelFile: (datei: File) => void;
    setShowModelTypeModal: (zeigen: boolean) => void;
}

export function useMusterloesungAnnahme({
    hatMusterloesung,
    gesperrt,
    setPendingModelFile,
    setShowModelTypeModal
}: MusterloesungAnnahmeMittel) {
    return useCallback(async (dateien: File[]) => {
        const datei = dateien[0];
        if (!datei) return;

        // Eine Musterloesung ist EIN Dokument. Mehrere stillschweigend fallen zu
        // lassen waere die Fehlerklasse, gegen die `useFileDropZone` seit
        // demselben Tag alle Dateien weiterreicht: Der Verlust faellt erst
        // spaeter auf. Also wird er gesagt.
        if (dateien.length > 1) {
            meldeHinweis(
                `Es wird nur „${datei.name}" geladen — eine Musterlösung ist ein einzelnes Dokument. ` +
                `Mehrseitige Vorlagen gehören in EINE PDF.`
            );
        }

        // Nur was Koreki lesen kann. Bis zum 12.11.2026 lief jede andere Datei
        // als Text durch — eine Word-Datei kam als Zeichensalat bei der KI an.
        if (!istLesbaresDokument(datei)) {
            meldeHinweis(
                `„${datei.name}" kann Koreki nicht lesen. Möglich sind: ${MUSTERLOESUNG_ENDUNGEN.split(',').join(', ')}. ` +
                `Word-Dateien bitte als PDF speichern.`
            );
            return;
        }

        if (gesperrt) {
            meldeHinweis(
                'Die Musterlösung ist gesperrt, weil bereits Arbeiten korrigiert wurden — ' +
                'die vergebenen Punkte beziehen sich auf die geladene Aufgabenstruktur. ' +
                'Für eine andere Aufgabenstellung bitte „Neue Korrektur" starten.'
            );
            return;
        }

        if (hatMusterloesung && !(await askConfirmation({
            title: 'Musterlösung ersetzen',
            message: `„${datei.name}" ersetzt die aktuelle Musterlösung samt Aufgabenstruktur. Fortfahren?`
        }))) return;

        // Scan oder digitaler Text? Das entscheidet ueber Texterkennung und
        // damit ueber Credits, also fragt der Dialog — nicht wir.
        setPendingModelFile(datei);
        setShowModelTypeModal(true);
    }, [hatMusterloesung, gesperrt, setPendingModelFile, setShowModelTypeModal]);
}
