import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VertrauensChip } from '@/components/batch/parts/VertrauensChip';

/**
 * Der sichtbare Teil der Regel aus `lib/vertrauen`.
 *
 * GEMELDET 08.09.2026: An jeder Aufgabe stand ein rotes "Ki-Vertrauen: 0 %",
 * obwohl das Modell nur keinen Wert je Aufgabe genannt hatte. Rot heisst in
 * dieser Ansicht "hier stimmt etwas nicht" — die Lehrkraft suchte einen Fehler,
 * den es nicht gab.
 *
 * Seit dem 12.10.2026 meldet sich der Chip nur noch, wenn es etwas zu pruefen
 * gibt ("Bitte prüfen"); sichere und fehlende Werte zeigen nichts.
 */
describe('VertrauensChip', () => {
    const farbe = (conf?: number) => (conf === undefined ? 'bg-muted-foreground/40' : 'bg-success');

    const chip = (vertrauen?: number) =>
        render(<VertrauensChip vertrauen={vertrauen} getConfidenceColor={farbe} />)
            .container.firstElementChild as HTMLElement | null;

    it('schweigt, wenn das Modell nichts genannt hat — kein "0 %", kein Alarm', () => {
        expect(chip(undefined)).toBeNull();
    });

    it('schweigt bei sicheren Werten', () => {
        expect(chip(95)).toBeNull();
    });

    it('bittet bei mittleren Werten um Pruefung, in Gelb', () => {
        const el = chip(72);

        expect(el?.textContent).toContain('Bitte prüfen');
        expect(el?.className).toContain('warning');
        expect(el).toHaveAttribute('title', expect.stringContaining('72'));
    });

    it('zeigt eine GENANNTE Null weiterhin rot', () => {
        const el = chip(0);

        expect(el?.textContent).toContain('Bitte prüfen');
        expect(el?.className).toContain('destructive');
    });
});
