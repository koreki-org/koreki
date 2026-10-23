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
 * Seit dem 12.10.2026 meldet sich der Chip laut nur, wenn es etwas zu pruefen
 * gibt ("Bitte prüfen"). Sichere Werte stehen seit dem 23.10.2026 leise in
 * Grau da; fehlende zeigen weiterhin nichts.
 */
describe('VertrauensChip', () => {
    const farbe = (conf?: number) => (conf === undefined ? 'bg-muted-foreground/40' : 'bg-success');

    const chip = (vertrauen?: number) =>
        render(<VertrauensChip vertrauen={vertrauen} getConfidenceColor={farbe} />)
            .container.firstElementChild as HTMLElement | null;

    it('schweigt, wenn das Modell nichts genannt hat — kein "0 %", kein Alarm', () => {
        expect(chip(undefined)).toBeNull();
    });

    it('zeigt sichere Werte leise, ohne Farbe und ohne Aufforderung', () => {
        const el = chip(95);

        expect(el?.textContent).toBe('KI-Vertrauen 95 %');
        expect(el?.className).toContain('text-muted-foreground');
        expect(el?.className).not.toMatch(/warning|destructive|success/);
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
