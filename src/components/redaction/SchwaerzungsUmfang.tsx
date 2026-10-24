import React from 'react';
import { Files, Users } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox';

/**
 * Wofür ein gezogener Balken gilt: alle Blätter dieser Arbeit, alle Arbeiten des Stapels.
 * 🏮
 *
 * Beide Haken sind beim Öffnen gesetzt (24.10.2026). Vorher galt ein Balken nur
 * für das Blatt, auf dem er gezogen wurde; die Übertragung auf andere Arbeiten
 * war aus, und bei nur einer Arbeit im Stapel fehlte der Haken ganz. Wer die
 * Kopfzeile auf Blatt 1 schwärzte, schickte die übrigen Blätter mit Namen an die
 * Texterkennung. Zu viel geschwärzt sieht man beim Blättern; zu wenig nicht.
 */
interface SchwaerzungsUmfangProps {
    blattAnzahl: number;
    weitereArbeiten: number;
    aufAlleBlaetter: boolean;
    setAufAlleBlaetter: (wert: boolean) => void;
    aufAlleArbeiten: boolean;
    setAufAlleArbeiten: (wert: boolean) => void;
}

export const SchwaerzungsUmfang: React.FC<SchwaerzungsUmfangProps> = ({
    blattAnzahl, weitereArbeiten, aufAlleBlaetter, setAufAlleBlaetter, aufAlleArbeiten, setAufAlleArbeiten
}) => {
    if (blattAnzahl <= 1 && weitereArbeiten === 0) return null;

    return (
        <div className="mt-4 pt-4 border-t border-primary/10 flex flex-col gap-3">
            {blattAnzahl > 1 && (
                <label className="flex items-start gap-3 cursor-pointer select-none">
                    <Checkbox checked={aufAlleBlaetter} onChange={(e) => setAufAlleBlaetter(e.target.checked)} className="mt-0.5" />
                    <span className="text-sm font-bold text-primary flex items-center gap-2">
                        <Files size={14} className="shrink-0" />
                        Auf alle {blattAnzahl} Blätter dieser Arbeit
                    </span>
                </label>
            )}
            {weitereArbeiten > 0 && (
                <label className="flex items-start gap-3 cursor-pointer select-none">
                    <Checkbox checked={aufAlleArbeiten} onChange={(e) => setAufAlleArbeiten(e.target.checked)} className="mt-0.5" />
                    <span className="text-sm font-bold text-primary flex items-center gap-2">
                        <Users size={14} className="shrink-0" />
                        Auf alle {weitereArbeiten + 1} Schülerarbeiten
                    </span>
                </label>
            )}
            <span className="text-xs text-primary/70 font-medium leading-normal">
                Die Haken gelten für Balken, die Du ab jetzt ziehst. Für eine einzelne Stelle — etwa einen Namen mitten in einer Antwort — vorher abwählen.
            </span>
        </div>
    );
};
