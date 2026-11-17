import React from 'react';
import { Info, Highlighter, AlertTriangle } from 'lucide-react';
import { BatchFile } from '../../types';
import { istVollstaendigGeschwaerzt } from '../../lib/privacy-utils';
import { Button } from '../ui/Button';
import ConfirmationModal from '../ConfirmationModal';

/**
 * Die Rueckfrage vor einem Stapellauf: Datenschutz-Bestaetigung bzw. "Bewertungen
 * verwerfen und neu korrigieren".
 *
 * Am 17.11.2026 unveraendert aus `BatchProcessor` herausgezogen — dort stand die
 * Datei an ihrer Groessengrenze, und die Pruefansicht brauchte Platz.
 */
interface StapelRueckfrageProps {
    batchFiles: BatchFile[];
    showConfirm: 'ocr' | 'process' | 'reset' | null;
    unredactedScansCount: number;
    confirmText: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    /** Oeffnet das Schwaerzen fuer die Arbeit mit diesem Index. */
    onRedact: (idx: number) => void;
}

export const StapelRueckfrage: React.FC<StapelRueckfrageProps> = ({
    batchFiles, showConfirm, unredactedScansCount, confirmText, onConfirm, onCancel, onRedact
}) => {
    // Einstieg für die Sammel-Schwärzung aus der Datenschutz-Warnung heraus: der
    // erste noch ungeschwärzte Scan dient als Vorlage für alle weiteren.
    // `selected !== false` spiegelt `unredactedScansCount`: sonst öffnete der
    // Knopf eine abgewählte Arbeit, die die Warnung gar nicht ausgelöst hat.
    const firstUnredactedScanIdx = batchFiles.findIndex(f => !istVollstaendigGeschwaerzt(f) && f.selected !== false);

    // Der stapelweite Wiederlauf setzt `result` und `grade` jeder fertigen Arbeit
    // zurueck (useBatchActions.onResetResults) und startet sofort neu. Damit faellt
    // auch jede von Hand geaenderte Punktzahl und Rueckmeldung weg. Die Zeilen-
    // Rueckfrage benennt das seit dem 20.08.2026 — der Stapel-Dialog sprach bis
    // dahin nur vom Datenschutz und verwarf die Pruefarbeit wortlos.
    const bewerteteArbeiten = batchFiles.filter(f => f.status === 'done').length;

    // Nachträgliches Schwärzen entwertet eine bereits gelaufene Bilderkennung.
    const redactionDiscardsOcr = batchFiles.some(f => f.documentType === 'scanned' && !f.isRedacted && f.ocrDone && f.selected !== false);

    return (
        <ConfirmationModal
            isOpen={showConfirm !== null}
            title={showConfirm === 'reset' ? "Bewertungen verwerfen und neu korrigieren" : "Datenschutz-Bestätigung"}
            message={
                <>
                    {showConfirm === 'reset' && bewerteteArbeiten > 0 && (
                        <div className="mb-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-3">
                            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold mb-1">Bewertungen werden verworfen</p>
                                <p>Die Bewertungen von {bewerteteArbeiten} Arbeit(en) werden gelöscht und neu erzeugt — auch deine Änderungen an Punkten und Rückmeldungen. Deine Korrekturen am Schülertext bleiben erhalten.</p>
                            </div>
                        </div>
                    )}
                    {unredactedScansCount > 0 && (
                        <div className="mb-4 p-4 bg-warning/5 border border-warning/20 rounded-xl text-warning text-sm flex items-start gap-3">
                            <Info size={18} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold mb-1">Hinweis zur Anonymisierung</p>
                                <p>{unredactedScansCount} gescannte Arbeit(en) sind nicht auf jedem Blatt geschwärzt. Bitte stelle sicher, dass auf keinem Blatt personenbezogene Daten (z.B. Namen) sichtbar sind.</p>
                                {redactionDiscardsOcr && (
                                    <p className="mt-2 text-xxs font-medium opacity-90">
                                        Achtung: Wer jetzt noch schwärzt, verwirft den bereits erkannten Text dieser Arbeiten — die Bilderkennung muss dafür erneut laufen und kostet erneut Credits.
                                    </p>
                                )}
                                {firstUnredactedScanIdx >= 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { onCancel(); onRedact(firstUnredactedScanIdx); }}
                                        className="mt-3 h-8 gap-2 text-xs font-bold border-warning/30 text-warning hover:bg-warning hover:text-warning-foreground transition-all"
                                    >
                                        <Highlighter size={14} /> Jetzt schwärzen
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                    <p className="leading-relaxed text-foreground/80">{confirmText}</p>
                </>
            }
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
};
