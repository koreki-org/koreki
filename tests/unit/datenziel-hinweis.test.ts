import { datenzielBestaetigung } from '@/lib/datenziel-hinweis';

/**
 * Die Bestätigung vor dem Senden nennt den Empfänger so genau, wie die
 * Einstellung ihn kennt — und nie einen, der nicht stimmt.
 */
describe('datenzielBestaetigung', () => {
    it('nennt bei Ollama, dass die Daten im eigenen Netz bleiben', () => {
        expect(datenzielBestaetigung({ provider: 'ollama' })).toMatch(/lokale KI-Instanz \(Ollama\)/);
    });

    it('nennt Mistral mit Sitz', () => {
        expect(datenzielBestaetigung({ provider: 'mistral' })).toMatch(/Mistral AI \(Paris, Frankreich\)/);
    });

    it('nennt Mittwald, wenn die Adresse auf Mittwald zeigt', () => {
        const text = datenzielBestaetigung({ provider: 'openai-compatible', openaiUrl: 'https://llm.aihosting.mittwald.de/v1' });
        expect(text).toMatch(/Mittwald CM Service GmbH & Co\. KG/);
    });

    it('nennt Mittwald bei leerer Adresse, weil der Server dann Mittwald nimmt', () => {
        expect(datenzielBestaetigung({ provider: 'openai-compatible', openaiUrl: '' })).toMatch(/Mittwald/);
        expect(datenzielBestaetigung({ provider: 'openai-compatible' })).toMatch(/Mittwald/);
    });

    it('nennt bei fremder Adresse keinen Empfänger, der nicht stimmt', () => {
        const fremd = datenzielBestaetigung({ provider: 'openai-compatible', openaiUrl: 'https://llm.example.org/v1' });
        expect(fremd).not.toMatch(/Mittwald/);
        expect(fremd).toMatch(/innerhalb der Europäischen Union/);
    });

    it('lässt sich nicht von einem Mittwald-Namen im Pfad oder in fremder Domain täuschen', () => {
        expect(datenzielBestaetigung({ provider: 'openai-compatible', openaiUrl: 'https://mittwald.de.example.org/v1' })).not.toMatch(/Mittwald/);
        expect(datenzielBestaetigung({ provider: 'openai-compatible', openaiUrl: 'https://example.org/mittwald.de' })).not.toMatch(/Mittwald/);
    });

    it('beginnt immer mit derselben Bestätigung', () => {
        for (const provider of ['ollama', 'mistral', 'openai-compatible', undefined] as const) {
            expect(datenzielBestaetigung({ provider })).toMatch(/^Ich bestätige, dass ich die oben hochgeladenen Dokumente anonymisiert habe\./);
        }
    });
});
