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
    { id: 'qwen3.6:35b', name: 'Qwen 3.6', desc: 'Empfohlen (High Reasoning)' },
    { id: 'mistral-small3.2:latest', name: 'Mistral Small 3.2', desc: 'Schnell & Effizient' },
    { id: 'gemma4:31b', name: 'Gemma 31B', desc: 'Spezialist für Inhaltsanalyse' }
];

export const VORSCHLAG_IDS: string[] = OLLAMA_VORSCHLAEGE.map(v => v.id);
