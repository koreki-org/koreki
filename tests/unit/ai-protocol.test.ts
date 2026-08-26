import {
    erzeugeBewertungsEintraege,
    erzeugeKorrekturEintraege,
    erzeugeFehlerEintrag,
    erzeugeBestaetigungsEintrag,
    alsProtokolltext,
    type PunktStand
} from '@/lib/ai-protocol';
import type { AppSettings } from '@/types';

/**
 * Waechter fuer das Protokoll der KI-Laeufe (Art. 12 KI-VO).
 *
 * Zwei Zusagen stehen hier auf dem Spiel und beide sind nach aussen gegeben —
 * in der Betriebsanleitung und im AVV:
 *
 *   1. Es landet KEIN Schuelertext und KEIN Name im Protokoll.
 *   2. Die Abweichung zwischen KI-Vorschlag und Endnote ist ablesbar.
 *
 * Ohne Test driftet beides beim naechsten Feld, das jemand "praktischerweise"
 * mitprotokolliert.
 */

const settings: AppSettings = { provider: 'mistral', model: 'mistral-medium-latest' };

describe('Protokoll der KI-Laeufe', () => {
    it('schreibt einen Eintrag je bewerteter Aufgabe', () => {
        const tasks: PunktStand[] = [
            { name: 'Aufgabe 1', pointsObtained: 3, maxPoints: 4 },
            { name: 'Aufgabe 2', pointsObtained: 2, maxPoints: 2 }
        ];
        const eintraege = erzeugeBewertungsEintraege(1, tasks, settings, 1234.6);

        expect(eintraege).toHaveLength(2);
        expect(eintraege[0]).toMatchObject({
            ereignis: 'bewertung',
            schuelerNr: 1,
            aufgabe: 'Aufgabe 1',
            punkte: 3,
            maxPunkte: 4,
            anbieter: 'mistral',
            modell: 'mistral-medium-latest',
            dauerMs: 1235
        });
    });

    it('haelt Punkte als Zeichenkette aus — die Oberflaeche reicht Eingabefelder durch', () => {
        const eintraege = erzeugeBewertungsEintraege(
            2,
            [{ name: 'Aufgabe 1', pointsObtained: '2,5', maxPoints: '4' }],
            settings,
            10
        );
        expect(eintraege[0].punkte).toBe(2.5);
        expect(eintraege[0].maxPunkte).toBe(4);
    });

    it('protokolliert eine Korrektur der Lehrkraft mit dem urspruenglichen KI-Vorschlag', () => {
        const vorher: PunktStand[] = [{ name: 'Aufgabe 1', pointsObtained: 4, maxPoints: 4 }];
        const nachher: PunktStand[] = [{ name: 'Aufgabe 1', pointsObtained: 2, maxPoints: 4 }];

        const eintraege = erzeugeKorrekturEintraege(3, vorher, nachher, settings);

        expect(eintraege).toHaveLength(1);
        expect(eintraege[0]).toMatchObject({
            ereignis: 'korrektur',
            punkte: 2,
            punkteVorher: 4
        });
    });

    it('protokolliert NICHT, wenn sich nur das Feedback aendert', () => {
        // Sonst entstuende bei jedem Tastendruck im Feedback-Feld ein Eintrag.
        const vorher: PunktStand[] = [{ name: 'Aufgabe 1', pointsObtained: 3, maxPoints: 4 }];
        const nachher: PunktStand[] = [{ name: 'Aufgabe 1', pointsObtained: 3, maxPoints: 4 }];

        expect(erzeugeKorrekturEintraege(1, vorher, nachher, settings)).toHaveLength(0);
    });

    it('erkennt eine Aenderung auch, wenn die Oberflaeche eine Zeichenkette liefert', () => {
        const vorher: PunktStand[] = [{ name: 'Aufgabe 1', pointsObtained: 3 }];
        const nachher: PunktStand[] = [{ name: 'Aufgabe 1', pointsObtained: '3' }];

        // Gleicher Wert, anderer Typ — das ist keine Korrektur.
        expect(erzeugeKorrekturEintraege(1, vorher, nachher, settings)).toHaveLength(0);
    });

    it('haelt Fehllaeufe fest', () => {
        const eintrag = erzeugeFehlerEintrag(5, settings, 'Zeitüberschreitung');
        expect(eintrag).toMatchObject({ ereignis: 'fehler', schuelerNr: 5, punkte: null });
        expect(eintrag.fehler).toBe('Zeitüberschreitung');
    });

    it('nimmt weder Schuelertext noch Namen in den ausgegebenen Text auf', () => {
        // Die zentrale Zusage: das Protokoll ist herausgebbar, ohne dass
        // personenbezogene Inhalte mitwandern.
        const eintraege = [
            ...erzeugeBewertungsEintraege(1, [{ name: 'Aufgabe 1', pointsObtained: 3, maxPoints: 4 }], settings, 900),
            ...erzeugeKorrekturEintraege(
                1,
                [{ name: 'Aufgabe 1', pointsObtained: 3 }],
                [{ name: 'Aufgabe 1', pointsObtained: 4 }],
                settings
            )
        ];

        const text = alsProtokolltext(eintraege);

        expect(text).toContain('Art. 12');
        expect(text).toContain('Schüler #1');
        expect(text).toContain('KI-Vorschlag: 3');
        // Der Eintrag kennt schlicht kein Feld, in dem Text stehen koennte.
        const felder = Object.keys(eintraege[0]);
        expect(felder).not.toContain('studentText');
        expect(felder).not.toContain('name');
        expect(felder).not.toContain('feedback');
    });

    it('haelt EINE Bestaetigung fuer den ganzen Stapel fest, nicht eine je Arbeit', () => {
        const eintrag = erzeugeBestaetigungsEintrag(25);
        expect(eintrag).toMatchObject({ ereignis: 'bestaetigt', punkte: null });
        expect(eintrag.aufgabe).toContain('25 Arbeiten');

        // Eine menschliche Bestaetigung traegt keine Modellangabe — sie wuerde
        // etwas ueber einen Aufruf behaupten, den es nicht gab. Auch dann nicht,
        // wenn Einstellungen uebergeben werden.
        const text = alsProtokolltext([erzeugeBestaetigungsEintrag(25, settings)]);
        expect(text).not.toContain('mistral');
        // Sie gehoert auch zu keiner einzelnen Arbeit.
        expect(text).not.toContain('Schüler #0');
    });

    it('bleibt bei leerem Protokoll ausgebbar', () => {
        expect(alsProtokolltext([])).toContain('Einträge: 0');
    });
});
