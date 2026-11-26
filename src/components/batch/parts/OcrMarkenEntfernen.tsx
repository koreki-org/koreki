import React from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Task } from '../../../types';
import { askConfirmation } from '@/lib/confirm-dialog';
import { aufgabenOhneOcrMarken } from '@/lib/ocr-marken-entfernen';

interface OcrMarkenEntfernenProps {
    aufgaben: Task[] | undefined;
    layout: Pick<Task, 'name' | 'maxPoints'>[];
    abschnitte: string[];
    onUebernehmen: (aufgaben: Task[]) => void;
}

/**
 * „Alle 12 (?) entfernen" — pro Arbeit, nur solange es Marken gibt.
 *
 * Fragt vorher nach: Schuelerdaten leben nur im Arbeitsspeicher, es gibt kein
 * Rueckgaengig (`architectural-vision` §2).
 */
export const OcrMarkenEntfernen: React.FC<OcrMarkenEntfernenProps> = ({ aufgaben, layout, abschnitte, onUebernehmen }) => {
    const { anzahl, aufgaben: bereinigt } = aufgabenOhneOcrMarken(aufgaben, layout, abschnitte);
    if (anzahl === 0) return null;

    const entfernen = async () => {
        const weiter = await askConfirmation({
            title: 'Unsichere Stellen freigeben',
            message: anzahl === 1
                ? 'Die Markierung (?) in dieser Arbeit entfernen? Das Wort davor bleibt stehen. Das lässt sich nicht rückgängig machen.'
                : `Alle ${anzahl} Markierungen (?) in dieser Arbeit entfernen? Die Wörter davor bleiben stehen. Das lässt sich nicht rückgängig machen.`,
            bestaetigen: 'Entfernen',
        });
        if (weiter) onUebernehmen(bereinigt);
    };

    return (
        <Button variant="outline" size="xs" onClick={entfernen} className="ml-auto shrink-0">
            <Eraser size={14} />
            {anzahl === 1 ? '(?) entfernen' : `Alle ${anzahl} (?) entfernen`}
        </Button>
    );
};
