import { MAX_BILDKANTE_LOKAL, zielGroesse, verkleinereFuerLokaleBilderkennung } from '../../src/lib/bild-verkleinern';

/**
 * Bilder fuer lokales Ollama auf Seitengroesse (20.10.2026). Hintergrund und
 * Messwerte im Kopf von `src/lib/bild-verkleinern.ts`.
 */
describe('Bildgroesse fuer die lokale Bilderkennung', () => {
    it('ist so lang wie eine gerenderte A4-Seite — keine zweite Zahl', () => {
        expect(MAX_BILDKANTE_LOKAL).toBe(1684);
    });

    it('verkleinert ein Handyfoto auf die Seitenlaenge, Seitenverhaeltnis bleibt', () => {
        expect(zielGroesse(2304, 3264)).toEqual({ breite: 1189, hoehe: 1684 });
    });

    it('verkleinert auch ein Querformat an der langen Kante', () => {
        expect(zielGroesse(3264, 2304)).toEqual({ breite: 1684, hoehe: 1189 });
    });

    it('laesst ein Bild in Seitengroesse unveraendert', () => {
        expect(zielGroesse(1190, 1684)).toBeNull();
        expect(zielGroesse(800, 600)).toBeNull();
    });

    it('gibt das Bild ohne Canvas (Server, Tests) unveraendert zurueck', async () => {
        const bild = { base64: 'QUJD', mimeType: 'image/png' };
        await expect(verkleinereFuerLokaleBilderkennung(bild)).resolves.toBe(bild);
    });
});
