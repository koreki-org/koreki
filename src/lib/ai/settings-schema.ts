import { z } from 'zod';

/**
 * Die Anbieter-Einstellungen, wie sie eine API-Route vom Client entgegennimmt. 🧾
 *
 * Der Block stand am 07.09.2026 in SECHS Routen wortgleich (`clean-and-analyze`,
 * `clean-and-map`, `extract-image`, `second-opinion`, `anonymize`, `generate`) und
 * war dem Duplikat-Waechter als Altlast bekannt. Aufgefallen ist er beim Nachtragen
 * eines einzigen Feldes: Zwei Kopien zu aendern liess die bekannte Doppelung wachsen,
 * was der Waechter zu Recht abgelehnt hat.
 *
 * `passthrough()` bleibt Absicht — die Routen reichen `settings` als Ganzes an den
 * Anbieter weiter, und nicht jedes Profilfeld steht hier einzeln. Was hier steht, ist
 * damit keine Filterliste, sondern die Menge der Felder, auf die eine Route TYPSICHER
 * zugreifen darf. Wer ein Profilfeld in einer Route benutzt, traegt es hier ein.
 *
 * Nicht zu verwechseln mit `sanitizeClientAiSettings`: Das ist der Sicherheitsriegel
 * gegen client-gelieferte Anbieter-ADRESSEN und laeuft nach dieser Pruefung.
 */
export const anbieterEinstellungenSchema = z.object({
    provider: z.enum(['mistral', 'ollama', 'openai-compatible']),
    mistralKey: z.string().optional(),
    openaiUrl: z.string().optional(),
    openaiKey: z.string().optional(),
    openaiModel: z.string().optional(),
    model: z.string().optional(),
    ollamaUrl: z.string().optional(),
    ollamaModel: z.string().optional(),
    ollamaNumCtx: z.number().optional(),
    /**
     * Der Denkschritt aus dem KI-Intelligenz-Modal. Steht hier, weil `denktBeiAktion`
     * ihn fuer `correction`, `second-opinion` und `student-simulator` auswertet —
     * ohne Eintrag kaeme er zwar durch `passthrough()` an, waere aber untypisiert.
     */
    enableThinking: z.boolean().optional()
}).passthrough();
