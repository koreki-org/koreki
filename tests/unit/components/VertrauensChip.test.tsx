import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VertrauensChip } from '@/components/batch/parts/VertrauensChip';

/**
 * Der sichtbare Teil der Regel aus `lib/vertrauen`.
 *
 * GEMELDET 08.09.2026: An jeder Aufgabe stand ein rotes "Ki-Vertrauen: 0 %",
 * obwohl das Modell nur keinen Wert je Aufgabe genannt hatte. Rot heisst in
 * dieser Ansicht "hier stimmt etwas nicht" — die Lehrkraft suchte einen Fehler,
 * den es nicht gab.
 */
describe('VertrauensChip', () => {
    const farbe = (conf?: number) => (conf === undefined ? 'bg-muted-foreground/40' : 'bg-success');

    const chip = (vertrauen?: number) =>
        render(<VertrauensChip vertrauen={vertrauen} getConfidenceColor={farbe} />)
            .container.firstElementChild as HTMLElement;

    it('sagt "n. a." statt "0 %", wenn das Modell nichts genannt hat', () => {
        const el = chip(undefined);

        expect(screen.getAllByText(/n\. a\./).length).toBeGreaterThan(0);
        expect(el.textContent).not.toMatch(/0\s*%/);
        expect(el).toHaveAttribute('title');
    });

    it('faerbt die fehlende Angabe neutral, nicht warnend', () => {
        const el = chip(undefined);

        expect(el.className).toContain('bg-muted');
        expect(el.className).not.toContain('destructive');
        expect(el.className).not.toContain('warning');
    });

    it('zeigt eine GENANNTE Null weiterhin als roten Wert', () => {
        const el = chip(0);

        expect(el.textContent).toContain('0%');
        expect(el.className).toContain('destructive');
    });

    it('zeigt hohe Werte in Gruen und mittlere in Gelb', () => {
        expect(chip(95).className).toContain('success');
        expect(chip(72).className).toContain('warning');
    });
});
