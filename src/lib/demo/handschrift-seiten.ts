/**
 * Die Blaetter der Handschrift-Demo unter `public/demo/handschrift/`.
 *
 * Die Handschrift ist NACHGEMACHT, keine echte Schuelerarbeit. Entstanden am
 * 18.11.2026: Claude erzeugte aus dem Text der getippten Demo zwei Blaetter mit
 * Handschrift-Schriften, ChatGPT zeichnete sie als echt wirkende Handschrift
 * neu. Auf Blatt 1 schrieb ChatGPT dabei „960" statt „9600" — das haette
 * Schueler #1 in Aufgabe 1 von 3 auf 1 Punkt fallen lassen (die Rechenpruefung
 * erkennt es sicher); die fehlende Null ist von Hand nachgetragen.
 *
 * Die Blaetter weichen an Stellen, die fuer die Bewertung keine Rolle spielen,
 * vom getippten Text ab — siehe `abweichungen`. Gemessen am selben Tag: Ollama
 * (qwen3.8) und Mittwald (Qwen3.6) lesen beide Blaetter bis auf genau diese
 * Stellen und die Art der Gedankenstriche woertlich.
 *
 * Die Bilder lassen sich nicht aus dem Text erzeugen. Aendert sich der Text der
 * getippten Demo (`demoScenario.ts`), muessen die Blaetter neu gezeichnet und
 * die Pruefsummen unten erneuert werden — der Waechter
 * (`tests/unit/demo-handschrift.test.ts`) meldet beides.
 */

export interface HandschriftSeite {
    /** Dateiname unter `public/demo/handschrift/`. */
    datei: string;
    /** Wie in der getippten Demo. */
    name: string;
    originalName: string;
    /** SHA-256 des Bilds — aendert es sich, muss jemand hinsehen. */
    bildSha256: string;
    /** SHA-256 des getippten Demo-Texts, nach dem das Blatt gezeichnet wurde. */
    textSha256: string;
    /** Wo das Blatt bewusst vom getippten Text abweicht — fuer die Bewertung ohne Belang. */
    abweichungen: string[];
}

export const HANDSCHRIFT_ORDNER = '/demo/handschrift';

export const HANDSCHRIFT_SEITEN: HandschriftSeite[] = [
    {
        datei: 'schueler-1.jpg',
        name: 'Schüler #1',
        originalName: 'Nele Beispielfeld',
        bildSha256: 'ffed06130686252c2432f606e514992ff51b4e3903280cd892c99476cecf30af',
        textSha256: 'be89b343b896ab32445e9b102d0b2de6611c5a7fe0b2f38dae144402929c454a',
        abweichungen: [
            'Aufgabe 2: „mehr Geld als“ ohne Komma',
            'Aufgabe 3: „gar nichts“ ohne Anführungszeichen, „wenn“ klein, „wie etwas“ statt „wie sowas“',
        ],
    },
    {
        datei: 'schueler-2.jpg',
        name: 'Schüler #2',
        originalName: 'Jonas Beispielfeld',
        bildSha256: '08c6be3584972a73fdc015a33171eb5860e221357cd17ede17a41c48e3ed5023',
        textSha256: '4b54be3d271b7b0434ecffc0d1ac8f03d050d445e72e0793f253e9520852a371',
        abweichungen: [
            'Das „h“ ist oft wie ein „k“ geschrieben („nickt“, „Dack“) — beide KIs lesen trotzdem „nicht“, „Dach“',
        ],
    },
];
