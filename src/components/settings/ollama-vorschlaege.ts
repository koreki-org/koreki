/**
 * Die vorgeschlagenen Ollama-Modelle — EINE Liste.
 *
 * Sie stand hier viermal: dreimal als reine Kennungsliste (Erkennung des eigenen
 * Modus, Aufloesung lokal abweichender Tags, Rueckfall der eigenen Konfiguration)
 * und einmal als Kartensatz fuer die Anzeige. Wer ein Modell aufnimmt oder
 * austauscht, musste an vier Stellen daran denken — sonst zeigt die Anzeige ein
 * Modell, das die Erkennung nicht als Vorschlag kennt, und die Karte "Eigene
 * Konfiguration" faengt es faelschlich ein.
 *
 * Die Kennungen werden abgeleitet statt daneben gepflegt: Eine zweite,
 * handgepflegte Liste laeuft mit der Zeit auseinander.
 */
export const OLLAMA_VORSCHLAEGE = [
    // Feste Kennung statt `qwen3.8:latest` — so wurde es am 20.10.2026 gemessen, und
    // ein beweglicher Bezeichner koennte das Modell unbemerkt austauschen.
    // Seit 21.10.2026 die Empfehlung (vorne); 3.6 bleibt geprueft, ohne Empfehlung.
    { id: 'qwen3.8:27b-mtp-q4_K_M', name: 'Qwen 3.8', desc: 'Empfohlen (High Reasoning, kompakt)' },
    { id: 'qwen3.6:35b', name: 'Qwen 3.6', desc: 'High Reasoning' },
    { id: 'mistral-small3.2:latest', name: 'Mistral Small 3.2', desc: 'Schnell & Effizient' },
    { id: 'gemma4:31b', name: 'Gemma 31B', desc: 'Spezialist für Inhaltsanalyse' }
];

export const VORSCHLAG_IDS: string[] = OLLAMA_VORSCHLAEGE.map(v => v.id);

/** Der erste Vorschlag ist die Empfehlung — und zugleich die Voreinstellung,
 *  wenn noch kein Modell gewaehlt wurde. Eine Stelle, damit beide nicht
 *  auseinanderlaufen. */
export const EMPFOHLENES_OLLAMA_MODELL: string = OLLAMA_VORSCHLAEGE[0].id;
