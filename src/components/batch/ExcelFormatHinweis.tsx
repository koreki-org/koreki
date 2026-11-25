import React from 'react';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';

/**
 * Was der Excel-Import beim Aufteilen erwartet.
 * 📊
 *
 * Der Knopf „Excel Import" stand bis zum 09.11.2026 ohne jede Erklaerung da. Wer
 * ihn drueckte, konnte nur raten, welche Spalte was bedeutet — und bekam bei
 * einem Fehlgriff den Satz „Keine gültigen Namen in der Excel-Datei gefunden",
 * der nicht sagt, was stattdessen dort haette stehen sollen.
 *
 * Der Text hier ist aus `leseKlassenliste` (lib/stapel-aufteilen.ts) abgelesen,
 * nicht erfunden. Wer den Leser dort aendert, aendert diesen Hinweis mit: Eine
 * Formatbeschreibung, die nicht mehr stimmt, ist schlechter als keine.
 *
 * Seit dem 25.11.2026 liefert die Liste nur noch die Namen zur Auswahl. Die
 * Seitenzahl in Spalte C spielt keine Rolle mehr — geschnitten wird an den
 * Seitenbildern. Die Reihenfolge ist nicht noetig, aber am schnellsten: Aus ihr
 * kommt der Namensvorschlag, den man mit Enter bestaetigt.
 */
export const ExcelFormatHinweis: React.FC = () => (
    <KorekiTooltip
        title="Erwartetes Format"
        position="bottom"
        align="right"
        widthClass="w-80"
        content={<>
            <p className="m-0">
                Erstes Tabellenblatt, eine Zeile je Schüler. Eine Kopfzeile darf stehen —
                sie wird erkannt und übersprungen.
            </p>
            <ul className="mt-2 mb-0 pl-4 list-disc space-y-1">
                <li><strong>Spalte A</strong> — Nachname</li>
                <li><strong>Spalte B</strong> — Vorname</li>
            </ul>
            <p className="mt-2 mb-0">
                Steht der ganze Name in Spalte A, wird er geteilt: „Meier, Anna“ ebenso
                wie „Anna Meier“.
            </p>
            <p className="mt-2 mb-0">
                Am schnellsten geht es, wenn der Stapel in der Reihenfolge der Liste liegt.
                Dann schlägt Koreki jeden Namen vor, und du bestätigst mit Enter. Liegt er
                anders, tippst du die ersten Buchstaben.
            </p>
        </>}
    />
);
