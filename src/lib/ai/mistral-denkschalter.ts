import { MISTRAL_MEDIUM_MODEL } from './constants';

/**
 * Wie der Denkschritt bei einem Mistral-Modell geschaltet wird. 💭
 *
 * OB gedacht wird, entscheidet die Leiter in `denkschritt.ts` — fuer Mistral wie
 * fuer Ollama und den OpenAI-kompatiblen Weg. Diese Datei sagt nur, WIE die
 * Entscheidung bei Mistral ankommt (`reasoning_effort`).
 *
 * ANLASS (23.11.2026). Der Mistral-Weg fragte die Leiter nie. Der Schalter "Denken"
 * hob dort nur die Laengengrenze an und schickte nichts, was das Denken einschaltet.
 * Gemessen am selben Tag, je ein Aufruf:
 *
 * | Modell               | ohne Angabe      | erlaubte Werte       |
 * |----------------------|------------------|----------------------|
 * | `mistral-medium-2604`| denkt NICHT      | `high`, `none`       |
 * | `mistral-large-4-0`  | denkt (`high`)   | `low`, `medium`, `high` — abschalten geht nicht |
 * | `mistral-large-2512` | denkt nicht      | Feld wird mit HTTP 400 abgelehnt |
 *
 * Folge: Die Rechenweg-Extraktion, die laut Leiter IMMER denken muss (sonst
 * schreibt sie den Wert der Formel statt den des Schuelers ab, siehe dort), lief
 * bei Mistral ohne Denkschritt — und mit 1000 Tokens, an denen Large 4 schon beim
 * Nachdenken scheiterte.
 *
 * Ein Modell, das hier nicht steht, bekommt kein Feld: lieber das Verhalten von
 * vorher als ein Fehler 400 mitten im Korrekturlauf.
 */
type Denktiefe = 'none' | 'low' | 'medium' | 'high';

interface Schalter {
    an: Denktiefe;
    aus: Denktiefe;
}

const SCHALTER: Record<string, Schalter> = {
    [MISTRAL_MEDIUM_MODEL]: { an: 'high', aus: 'none' },
    // Large 4 laesst sich nicht abschalten; `low` ist das Naechstliegende.
    'mistral-large-4-0': { an: 'high', aus: 'low' },
    'mistral-large-4': { an: 'high', aus: 'low' },
};

export function mistralDenktiefe(model: string, denkt: boolean): Denktiefe | undefined {
    const schalter = SCHALTER[model];
    if (!schalter) return undefined;
    return denkt ? schalter.an : schalter.aus;
}
