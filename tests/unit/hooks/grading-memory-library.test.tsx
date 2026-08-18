import { renderHook, act } from '@testing-library/react';
import { useGradingMemoryLibrary } from '../../../src/hooks/grading-memory/useGradingMemoryLibrary';
import { persistGradingMemory } from '../../../src/lib/grading-memory-persistence';
import { downloadFile } from '../../../src/lib/file-utils';
import { isDesktopTarget } from '../../../src/lib/env-context';
import type { GradingMemory } from '../../../src/types';

jest.mock('../../../src/lib/grading-memory-persistence', () => ({
    ...jest.requireActual('../../../src/lib/grading-memory-persistence'),
    persistGradingMemory: jest.fn()
}));
jest.mock('../../../src/lib/file-utils', () => ({ downloadFile: jest.fn() }));
jest.mock('../../../src/lib/env-context', () => ({ isDesktopTarget: jest.fn(() => false) }));
jest.mock('../../../src/lib/api-client', () => ({
    apiClient: { post: jest.fn(), fetch: jest.fn() }
}));

/**
 * Erfahrungsschätze ein- und ausführen (Layer 2)
 * 📚🛡️
 *
 * ANLASS, 18.08.2026. Zwei Berichte an einem Tag, beide aus derselben Ecke:
 *
 * 1. Ein LEERER Erfahrungsschatz liess sich exportieren. Die Datei enthielt
 *    dann nichts und meldete beim Wiedereinlesen einen Formatfehler — obwohl
 *    sie einwandfrei war.
 * 2. Ein Import ersetzte den gleichnamigen Schatz WORTLOS. Der Name steht im
 *    Kopf der Datei, nicht im Dateinamen; wer nach dem Export noch am Original
 *    gearbeitet hatte, verlor diese Arbeit.
 *
 * Beides ist behoben, war aber auf Hook-Ebene ungeprueft (0 % Zweigabdeckung).
 * Diese Datei haelt fest, was zugesichert bleiben muss.
 */

const schatz = (name: string, faelle = 1): GradingMemory => ({
    id: `id-${name}`,
    name,
    cases: Array.from({ length: faelle }, (_, i) => ({
        id: `c${i}`,
        studentText: `Antwort ${i}`,
        expectedCorrection: { pointsObtained: 1, correctionNotes: 'Begruendung' }
    })),
    userId: null,
    createdAt: '2026-08-18T00:00:00.000Z'
});

/**
 * Die `File` von jsdom kennt `text()` in dieser Fassung nicht. Der Hook nutzt
 * genau zwei Dinge — `name` und `text()` —, also reicht das hier.
 */
const datei = (inhalt: string): File =>
    ({ name: 'schatz.md', text: async () => inhalt } as unknown as File);

const gueltigeDatei = (name: string) => datei(`---
name: "${name}"
type: "grading_memory"
version: "1.0.0"
---

[CASE_START]
## Fallbeispiel 1

### Schülerantwort:
Eine Antwort.

### Erwartete Korrektur:
- Punkte: 2
- Begründung: Eine Begründung.
[CASE_END]
`);

const baue = (memories: GradingMemory[] = []) => {
    const addLocalMemory = jest.fn();
    const refreshMemories = jest.fn();
    const { result } = renderHook(() =>
        useGradingMemoryLibrary({ addLocalMemory, refreshMemories, memories }));
    return { result, addLocalMemory, refreshMemories };
};

beforeEach(() => {
    jest.clearAllMocks();
    (isDesktopTarget as jest.Mock).mockReturnValue(false);
    (persistGradingMemory as jest.Mock).mockResolvedValue(undefined);
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
});

const gemeldet = () => (window.alert as jest.Mock).mock.calls.map(c => String(c[0])).join('\n');

describe('Import', () => {
    it('legt einen neuen Schatz ohne Rueckfrage ab', async () => {
        const { result } = baue([schatz('Anderer')]);

        await act(async () => {
            await result.current.importMemoryFile(gueltigeDatei('Neu'));
        });

        expect(window.confirm).not.toHaveBeenCalled();
        expect(persistGradingMemory).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Neu' })
        );
        expect(gemeldet()).toMatch(/importiert/);
    });

    /**
     * DER GEMELDETE FALL. Der Name steht im KOPF der Datei — eine umbenannte
     * Datei traegt weiterhin den alten. Beide Ablagen ueberschreiben
     * namensgleich, also ist diese Rueckfrage das Einzige, was die Arbeit
     * schuetzt, die nach dem Export am Original gemacht wurde.
     */
    it('fragt, bevor ein gleichnamiger Schatz ersetzt wird', async () => {
        const { result } = baue([schatz('Physik')]);

        await act(async () => {
            await result.current.importMemoryFile(gueltigeDatei('Physik'));
        });

        expect(window.confirm).toHaveBeenCalled();
        expect(gemeldet()).toMatch(/ersetzt/);
    });

    it('legt nichts ab, wenn die Rueckfrage verneint wird', async () => {
        (window.confirm as jest.Mock).mockReturnValue(false);
        const { result } = baue([schatz('Physik')]);

        await act(async () => {
            await result.current.importMemoryFile(gueltigeDatei('Physik'));
        });

        expect(persistGradingMemory).not.toHaveBeenCalled();
    });

    /** Namensgleichheit gilt unabhaengig von Schreibweise und Randzeichen. */
    it('erkennt die Namensgleichheit auch bei anderer Schreibweise', async () => {
        const { result } = baue([schatz('  Physik ')]);

        await act(async () => {
            await result.current.importMemoryFile(gueltigeDatei('PHYSIK'));
        });

        expect(window.confirm).toHaveBeenCalled();
    });

    /**
     * Der zweite Bericht: eine gueltige, aber leere Datei. Sie meldete einen
     * FORMATFEHLER, obwohl sie aus unserem eigenen Export stammte.
     */
    it('nennt einen leeren Erfahrungsschatz beim Namen, statt das Format zu beschuldigen', async () => {
        const leer = datei(`---
name: "Erfahrungsschatz (12.08.2026)"
type: "grading_memory"
version: "1.0.0"
---

# Erfahrungsschatz: Erfahrungsschatz (12.08.2026)
`);
        const { result } = baue();

        await act(async () => {
            await result.current.importMemoryFile(leer);
        });

        expect(gemeldet()).toMatch(/keine Fallbeispiele/);
        expect(gemeldet()).toMatch(/Erfahrungsschatz \(12\.08\.2026\)/);
        expect(gemeldet()).not.toMatch(/KEP-MD-2/);
        expect(persistGradingMemory).not.toHaveBeenCalled();
    });

    /** Eine FREMDE Datei ist dagegen sehr wohl ein Formatfehler. */
    it('meldet bei einer fremden Datei das Format', async () => {
        const { result } = baue();

        await act(async () => {
            await result.current.importMemoryFile(datei('# Meine Notizen\n\nIrgendein Text.'));
        });

        expect(gemeldet()).toMatch(/KEP-MD-2/);
        expect(persistGradingMemory).not.toHaveBeenCalled();
    });

    it('meldet einen Fehler beim Ablegen, statt ihn zu verschlucken', async () => {
        (persistGradingMemory as jest.Mock).mockRejectedValue(new Error('Datenbank nicht erreichbar'));
        const { result } = baue();

        await act(async () => {
            await result.current.importMemoryFile(gueltigeDatei('Neu'));
        });

        expect(gemeldet()).toMatch(/Datenbank nicht erreichbar/);
    });
});

describe('Export', () => {
    /**
     * Ein leerer Schatz ergibt eine Datei, die sich nicht wieder einlesen
     * laesst — die Fallbeispiele SIND ihr gesamter Inhalt. Das gehoert hier
     * gesagt, nicht erst beim Wiedereinlesen.
     */
    it('schreibt einen leeren Erfahrungsschatz gar nicht erst', async () => {
        const { result } = baue();

        await act(async () => {
            await result.current.handleExportMemory(schatz('Leer', 0));
        });

        expect(downloadFile).not.toHaveBeenCalled();
        expect(gemeldet()).toMatch(/keine Fallbeispiele/);
    });

    it('schreibt einen gefuellten Erfahrungsschatz', async () => {
        const { result } = baue();

        await act(async () => {
            await result.current.handleExportMemory(schatz('Physik', 3));
        });

        expect(downloadFile).toHaveBeenCalled();
        const [inhalt, dateiname] = (downloadFile as jest.Mock).mock.calls[0];
        expect(String(inhalt)).toContain('[CASE_START]');
        expect(dateiname).toMatch(/\.md$/);
    });

    /** Der Dateiname darf keine Zeichen tragen, die ein Dateisystem stoeren. */
    it('entschaerft den Namen fuer den Dateinamen', async () => {
        const { result } = baue();

        await act(async () => {
            await result.current.handleExportMemory(schatz('Physik / Klasse 10a', 1));
        });

        const [, dateiname] = (downloadFile as jest.Mock).mock.calls[0];
        expect(dateiname).not.toMatch(/[/\\:*?"<>|]/);
    });
});

describe('Rundlauf ueber den Hook', () => {
    /**
     * Was exportiert wurde, muss sich wieder einlesen lassen — sonst ist die
     * Datei ein Andenken, kein Sicherungsstand.
     */
    it('liest wieder ein, was der Export geschrieben hat', async () => {
        const { result } = baue();

        await act(async () => {
            await result.current.handleExportMemory(schatz('Physik', 3));
        });
        const [inhalt] = (downloadFile as jest.Mock).mock.calls[0];

        await act(async () => {
            await result.current.importMemoryFile(datei(String(inhalt)));
        });

        expect(persistGradingMemory).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Physik',
                cases: expect.arrayContaining([expect.objectContaining({ studentText: 'Antwort 0' })])
            })
        );
    });
});
