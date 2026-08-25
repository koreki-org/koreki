import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Wächter über die Rückfragen
 * 🗣️🛡️
 *
 * WARUM ES DIESEN TEST GIBT
 * -------------------------
 * Koreki hat mit `ConfirmationModal` einen eigenen Dialog für Rückfragen. Über
 * Monate lief ein Großteil trotzdem über den Browser-Kasten — zuletzt sogar die
 * Konto-Löschung, also die folgenreichste Aktion des Produkts. Der Kasten sieht
 * aus wie eine Meldung des Betriebssystems, trägt keine Warnfarbe und lässt
 * sich weder gestalten noch übersetzen: eine belanglose Nachfrage sieht darin
 * genauso aus wie ein endgültiger Verlust.
 *
 * Das ist keine Regel, die man einmal aufräumt. Sie driftet zurück, sobald
 * jemand schnell eine Rückfrage braucht — der Browser-Kasten ist immer zur Hand
 * und immer einen Federstrich billiger.
 *
 * ZWEI SCHREIBWEISEN
 * ------------------
 * `window.confirm(...)` und das blanke `confirm(...)` sind dasselbe. Die erste
 * Fassung dieses Wächters kannte nur die lange Form und bestand deshalb, obwohl
 * zehn Aufrufe der kurzen Form im Baum standen. Beide werden gezählt.
 *
 * RATSCHE
 * -------
 * Die vier Profil-Familien, die Konto-Löschung und der Erfahrungsschatz sind
 * umgestellt und stehen auf null. Der Rest (Admin-Verwaltung, Instituts-
 * Verwaltung, Einstellungs-Widgets) ist eingefroren und darf nur schrumpfen.
 * Wer eine dieser Stellen anfasst, stellt sie auf `askConfirmation` um.
 */

const SRC_DIR = join(process.cwd(), 'src');

/**
 * Altbestand, Stand 25.08.2026. Nur schrumpfen, nie wachsen.
 * Neue Dateien dürfen gar nicht auftauchen.
 */
const ALTFAELLE: Record<string, number> = {
    'hooks/useAdminData.ts': 3,
    'hooks/useOrgManagement.ts': 2,
    'components/batch/GradingGraphModal.tsx': 1,
    'components/settings/MistralConfig.tsx': 1,
    'components/settings/OpenAICompatibleConfig.tsx': 1,
    'components/settings/SkillsModules.tsx': 1,
    'pages/app.tsx': 1
};

const alleQuellen = (dir: string): string[] =>
    readdirSync(dir).flatMap(eintrag => {
        const pfad = join(dir, eintrag);
        return lstatSync(pfad).isDirectory() ? alleQuellen(pfad) : [pfad];
    });

/** `window.confirm(` und das blanke `confirm(` — aber nicht `askConfirmation(`. */
const zaehleAufrufe = (quelle: string): number =>
    quelle.split('\n')
        .filter(zeile => !/^\s*(\/\/|\*|\/\*)/.test(zeile))
        .reduce((summe, zeile) => {
            const lang = zeile.match(/window\.confirm\s*\(/g)?.length ?? 0;
            const kurz = zeile.match(/(?<![.\w])confirm\s*\(/g)?.length ?? 0;
            return summe + lang + kurz;
        }, 0);

describe('Rückfragen-Governance', () => {
    const gezaehlt = alleQuellen(SRC_DIR)
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
        .map(pfad => ({
            datei: relative(SRC_DIR, pfad).split(sep).join('/'),
            anzahl: zaehleAufrufe(readFileSync(pfad, 'utf8'))
        }))
        .filter(e => e.anzahl > 0);

    it('öffnet in keiner neuen Datei einen Browser-Kasten', () => {
        const neu = gezaehlt.filter(e => ALTFAELLE[e.datei] === undefined);

        if (neu.length > 0) {
            throw new Error(
                'Browser-Kasten statt ConfirmationModal:\n  - '
                + neu.map(e => `${e.datei} (${e.anzahl}x)`).join('\n  - ')
                + '\n\n  `askConfirmation` aus lib/confirm-dialog nutzen.'
            );
        }
    });

    it('lässt den Altbestand nur schrumpfen', () => {
        const gewachsen = gezaehlt
            .filter(e => ALTFAELLE[e.datei] !== undefined && e.anzahl > ALTFAELLE[e.datei])
            .map(e => `${e.datei}: ${e.anzahl} statt höchstens ${ALTFAELLE[e.datei]}`);

        if (gewachsen.length > 0) {
            throw new Error('Altbestand gewachsen:\n  - ' + gewachsen.join('\n  - '));
        }
    });

    /**
     * Hält die Ratsche ehrlich: wer abträgt, zieht die Zahl nach. Sonst wächst
     * sie unbemerkt wieder bis zum alten Stand zurück.
     */
    it('verlangt das Nachziehen, wenn abgetragen wurde', () => {
        const veraltet = Object.entries(ALTFAELLE)
            .map(([datei, erlaubt]) => ({
                datei,
                erlaubt,
                ist: gezaehlt.find(e => e.datei === datei)?.anzahl ?? 0
            }))
            .filter(e => e.ist < e.erlaubt)
            .map(e => `${e.datei}: auf ${e.ist} geschrumpft — Eintrag von ${e.erlaubt} auf ${e.ist} nachziehen`
                + (e.ist === 0 ? ' (bzw. ganz entfernen)' : ''));

        if (veraltet.length > 0) {
            throw new Error('Ratsche nachziehen:\n  - ' + veraltet.join('\n  - '));
        }
    });

    /** Findet der Wächter keine Quellen mehr, winkt er ab da alles durch. */
    it('sieht überhaupt Quelldateien', () => {
        const quellen = alleQuellen(SRC_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
        expect(quellen.length).toBeGreaterThan(100);
    });
});
