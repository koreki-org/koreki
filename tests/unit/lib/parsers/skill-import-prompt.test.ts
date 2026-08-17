import { parseMarkdownProfile } from '@/lib/parsers/markdown-profile-parser';

/**
 * Import eines Skills aus einer Markdown-Datei (Layer 1)
 * 📥
 *
 * Der Anlass: `useSkillProfiles` las beim Import `parsed.content` — ein Feld,
 * das `parseMarkdownProfile` NIE liefert. Ein Skill, dessen Anweisung im Rumpf
 * der Datei steht (der Normalfall), wurde damit still mit leerem Prompt
 * importiert. Der Lehrer sah einen Skill mit Namen und Kategorie, der nichts
 * tat.
 *
 * `usePromptProfiles` hat seit jeher das richtige Feld gelesen — die beiden
 * Import-Wege waren auseinandergelaufen.
 *
 * Diese Datei haelt fest, WO der Parser was ablegt. Damit faellt auf, wenn ein
 * Aufrufer wieder an einem erfundenen Feld hängt.
 */
describe('parseMarkdownProfile', () => {
    /** So sieht eine exportierte Skill-Datei aus: Kopfdaten, dann die Anweisung. */
    const skillDatei = [
        '---',
        'id: skill-bruchrechnung',
        'name: Bruchrechnung',
        'category: math-science',
        'type: skill',
        '---',
        'Bewerte Kürzen und Erweitern getrennt.',
        'Ein nicht gekürztes Ergebnis kostet einen halben Punkt.'
    ].join('\n');

    it('legt die Anweisung aus dem Rumpf in correctionPrompt', () => {
        const parsed = parseMarkdownProfile(skillDatei);

        expect(parsed.correctionPrompt).toContain('Kürzen und Erweitern');
        expect(parsed.correctionPrompt).toContain('halben Punkt');
    });

    /**
     * Der Kern des Fehlers: Es gibt kein `content`. Wer es liest, bekommt
     * `undefined` — und das faellt nirgends auf, weil dahinter ein `|| ""`
     * stand.
     */
    it('hat kein Feld namens content', () => {
        const parsed = parseMarkdownProfile(skillDatei);

        expect('content' in parsed).toBe(false);
        expect(Object.keys(parsed).sort()).toEqual(['correctionPrompt', 'metadata']);
    });

    it('liest die Kopfdaten mit Typumwandlung', () => {
        const parsed = parseMarkdownProfile([
            '---',
            'name: Test',
            'isCalcTrace: true',
            'temperature: 0.4',
            '---',
            'Rumpf'
        ].join('\n'));

        expect(parsed.metadata.name).toBe('Test');
        expect(parsed.metadata.isCalcTrace).toBe(true);
        expect(parsed.metadata.temperature).toBe(0.4);
    });

    /** Ohne Kopfdaten ist die ganze Datei die Anweisung. */
    it('nimmt bei fehlenden Kopfdaten den gesamten Text als Anweisung', () => {
        const parsed = parseMarkdownProfile('Nur eine Anweisung, kein Vorspann.');

        expect(parsed.correctionPrompt).toBe('Nur eine Anweisung, kein Vorspann.');
        expect(parsed.metadata.name).toBe('Importierter Prompt');
    });

    /**
     * Die Reihenfolge, in der der Skill-Import seinen Prompt sucht:
     * `promptSnippet` aus den Kopfdaten schlaegt den Rumpf. So kann eine Datei
     * beides tragen — etwa eine erklaerende Beschreibung im Rumpf und die
     * eigentliche Anweisung im Kopf.
     */
    it('stellt promptSnippet aus den Kopfdaten bereit, wenn vorhanden', () => {
        const parsed = parseMarkdownProfile([
            '---',
            'name: Test',
            'promptSnippet: Kurzform aus dem Kopf',
            '---',
            'Erklaerender Rumpf'
        ].join('\n'));

        expect(parsed.metadata.promptSnippet).toBe('Kurzform aus dem Kopf');
        expect(parsed.correctionPrompt).toBe('Erklaerender Rumpf');
    });
});
