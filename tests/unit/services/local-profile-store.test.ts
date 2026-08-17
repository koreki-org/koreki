import { buildStoragePath } from '../../../src/lib/services/local-profile-store';
import fs from 'fs';
import path from 'path';

jest.mock('fs');

/**
 * Ablageort der lokalen Profil-Dateien (Layer 1)
 * 🗃️🛡️
 *
 * Der gemeinsame Unterbau der vier Profil-Dienste. Vorher stand dieser Aufbau
 * VIERMAL da — inklusive vier Kopien der Traversal-Abwehr. Vier Kopien einer
 * Sicherheitsprüfung sind vier Gelegenheiten, sie an drei Stellen zu vergessen.
 *
 * Diese Datei prüft, was beim Zusammenlegen zugesichert bleiben muss.
 */
describe('buildStoragePath', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    /**
     * Der Dateiname wird aus der Nutzerkennung GEHASHT. Sie ist eine
     * Fremdeingabe (Logto-ID) und darf nie als Zeichenfolge in einem Pfad
     * landen — weder als Trennzeichen noch als `..`.
     */
    it('hasht die Nutzerkennung in den Dateinamen', () => {
        const pfad = buildStoragePath('profiles', 'TestService', 'user-123');
        const datei = path.basename(pfad);

        expect(datei).toMatch(/^profiles_[a-f0-9]{64}\.json$/);
        expect(datei).not.toContain('user-123');
    });

    it('nutzt ohne Nutzerkennung den schlichten Dateinamen', () => {
        expect(path.basename(buildStoragePath('profiles', 'TestService')))
            .toBe('profiles.json');
    });

    /**
     * Das Praefix entscheidet, WELCHE Profilart getroffen wird. Vertauscht es
     * jemand, liest ein Dienst die Datei eines anderen — die Profile der
     * Lehrkraft waeren dann scheinbar verschwunden.
     */
    it.each([
        ['profiles', 'profiles.json'],
        ['ai_profiles', 'ai_profiles.json'],
        ['grading_memories', 'grading_memories.json'],
        ['skill_profiles', 'skill_profiles.json']
    ])('bildet fuer "%s" den Dateinamen %s', (praefix, erwartet) => {
        expect(path.basename(buildStoragePath(praefix, 'TestService'))).toBe(erwartet);
    });

    /**
     * DIE SICHERHEITSPRUEFUNG.
     *
     * Der aufgeloeste Pfad muss im Basisverzeichnis bleiben. Die Hashung oben
     * schuetzt bereits vor einer boesartigen Nutzerkennung — diese Pruefung ist
     * die zweite Verteidigungslinie und faengt auch ein fehlerhaftes Praefix ab.
     */
    it('blockiert einen Ausbruch aus dem Basisverzeichnis', () => {
        expect(() => buildStoragePath('../../../etc/passwd', 'TestService'))
            .toThrow(/Path Traversal/);
    });

    it('blockiert den Ausbruch auch mit Nutzerkennung', () => {
        expect(() => buildStoragePath('../../secrets', 'TestService', 'user-123'))
            .toThrow(/Path Traversal/);
    });

    /**
     * Ein nicht anlegbares Verzeichnis darf den Aufruf nicht abbrechen: die
     * Meldung geht ins Log, der Pfad wird trotzdem geliefert. Sonst haette ein
     * Rechteproblem beim ersten Start die gesamte Profilverwaltung blockiert.
     */
    it('liefert einen Pfad, auch wenn das Verzeichnis nicht anlegbar ist', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockImplementation(() => {
            throw new Error('EACCES');
        });

        expect(() => buildStoragePath('profiles', 'TestService')).not.toThrow();
    });
});
