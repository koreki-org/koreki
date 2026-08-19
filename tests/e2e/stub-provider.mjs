/**
 * Ein KI-Anbieter, der genau das antwortet, was der Test vorgibt.
 * 🎭
 *
 * WARUM ES DIESEN STUB GIBT
 * -------------------------
 * Der bisherige E2E-Test lief gegen die Produktion und rief dort ein echtes
 * Modell auf. Das kostet Credits, dauert, und — der eigentliche Punkt — es ist
 * NICHT STEUERBAR: Man kann dem System keine bestimmte Antwort vorlegen und
 * sehen, was es damit macht.
 *
 * Genau darauf kam es aber an. Die Durchsicht vom 18./19.08.2026 hat eine
 * ganze Reihe von Fehlern gefunden, die alle dieselbe Form hatten: Das Modell
 * schickt etwas Unerwartetes, und Koreki verrechnet sich daran, ohne dass es
 * jemand merkt. `points: "drei"` wurde zu NaN Punkten, eine abgeschnittene
 * Antwort zum Totalverlust, eine untippbare Maximalpunktzahl zur Note 6,0.
 *
 * Mit einem steuerbaren Anbieter lassen sich diese Faelle vorlegen und bis auf
 * den Bildschirm der Lehrkraft verfolgen — durch die Server-Abbildung, die
 * Notenberechnung und die Anzeige hindurch. Das ist der Unterschied zwischen
 * "der Unit-Test der Funktion ist gruen" und "die Lehrkraft sieht das
 * Richtige".
 *
 * SCHNITTSTELLE
 * -------------
 * Der Stub spricht die OpenAI-kompatible `/chat/completions`. Koreki laesst
 * seine Adresse setzen (`OPENAI_API_BASE`), weil lokale Instanzen ihren
 * Endpunkt selbst bestimmen duerfen — im SaaS entfernt
 * `sanitizeClientAiSettings` das Feld.
 *
 * Was geantwortet wird, steuert der Test ueber `POST /__antwort`. Der Stub
 * haelt eine Warteschlange: Jeder Aufruf verbraucht den naechsten Eintrag; ist
 * sie leer, kommt die Standardantwort. So laesst sich ein Lauf aus mehreren
 * Modell-Aufrufen (Struktur, Extraktion, Korrektur) gezielt bestuecken.
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_PORT || 4010);

/**
 * Antworten je ART des Aufrufs, nicht je Reihenfolge.
 *
 * Ein einziger Korrekturlauf ruft das Modell MEHRFACH: erst die Extraktion des
 * Rechenwegs (Temperatur 0.0), dann die eigentliche Korrektur (0.6). Eine
 * schlichte Warteschlange fuehrt deshalb in die Irre — der erste Aufruf
 * verbraucht die Antwort, die fuer den zweiten gedacht war. Genau das ist mir
 * beim ersten Anlauf passiert: Die Korrektur bekam die Standardantwort und
 * lieferte 4 Punkte bei einem Maximum von 3.
 *
 * Deshalb wird nach dem System-Prompt unterschieden. Tests bleiben damit
 * unabhaengig von der Aufrufreihenfolge und lesen sich als das, was sie meinen:
 * "auf die KORREKTUR antworte so".
 */
const warteschlangen = { extraktion: [], korrektur: [] };

/** Woran die Art erkennbar ist. */
const bestimmeArt = (nachrichten) => {
    const system = nachrichten.find(n => n.role === 'system')?.content || '';
    return system.includes('Extraktions-KI') ? 'extraktion' : 'korrektur';
};

/**
 * Womit geantwortet wird, wenn nichts vorgegeben ist.
 *
 * Die Extraktion liefert bewusst einen leeren Rechenweg: So laeuft die Sandbox
 * durch, ohne dass ein Test, der sich fuer die Korrektur interessiert, sich um
 * sie kuemmern muss.
 */
const STANDARD_EXTRAKTION = { steps: [] };

const STANDARD_ANTWORT = {
    tasks: [
        {
            name: 'Aufgabe 1',
            pointsObtained: 4,
            maxPoints: 5,
            feedback: 'Weitgehend richtig.',
            content: 'Antwort des Schuelers'
        }
    ],
    overallFeedback: 'Solide Arbeit.',
    confidence: 95
};

/** Alles, was aufgerufen wurde — der Test kann es abfragen. */
const aufrufe = [];

const leseRumpf = (req) =>
    new Promise((auf) => {
        let daten = '';
        req.on('data', (stueck) => { daten += stueck; });
        req.on('end', () => auf(daten));
    });

const sende = (res, status, koerper) => {
    const text = typeof koerper === 'string' ? koerper : JSON.stringify(koerper);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(text);
};

/**
 * Verpackt eine Antwort so, wie ein OpenAI-kompatibler Anbieter es tut.
 *
 * `inhalt` ist bewusst eine ZEICHENKETTE und wird nicht serialisiert: Nur so
 * lassen sich die kaputten Faelle vorlegen — abgeschnittenes JSON, ein
 * Denkblock davor, ein unmaskiertes Anfuehrungszeichen mittendrin.
 */
const alsModellAntwort = (inhalt) => ({
    id: 'stub-1',
    object: 'chat.completion',
    choices: [{ index: 0, message: { role: 'assistant', content: inhalt }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 10 }
});

const server = createServer(async (req, res) => {
    const rumpf = await leseRumpf(req);

    // --- Steuerung durch den Test ---
    if (req.url === '/__antwort' && req.method === 'POST') {
        const { inhalt, fuer = 'korrektur', wiederholen = 1 } = JSON.parse(rumpf || '{}');
        if (!warteschlangen[fuer]) return sende(res, 400, { error: `Unbekannte Art: ${fuer}` });
        for (let i = 0; i < wiederholen; i++) warteschlangen[fuer].push(inhalt);
        return sende(res, 200, { ok: true, wartend: warteschlangen[fuer].length });
    }

    if (req.url === '/__aufrufe' && req.method === 'GET') {
        return sende(res, 200, aufrufe);
    }

    if (req.url === '/__zuruecksetzen' && req.method === 'POST') {
        warteschlangen.extraktion = [];
        warteschlangen.korrektur = [];
        aufrufe.length = 0;
        return sende(res, 200, { ok: true });
    }

    // --- Der eigentliche Anbieter ---
    if (req.url?.endsWith('/chat/completions')) {
        let angefragt = {};
        try { angefragt = JSON.parse(rumpf || '{}'); } catch { /* egal */ }
        const art = bestimmeArt(angefragt.messages || []);
        aufrufe.push({
            art,
            model: angefragt.model,
            temperature: angefragt.temperature,
            // Der zusammengebaute Prompt — damit laesst sich pruefen, was
            // Koreki dem Modell tatsaechlich vorlegt.
            nachrichten: (angefragt.messages || []).map((m) => ({ role: m.role, content: m.content }))
        });

        const vorgabe = warteschlangen[art].shift();
        const standard = art === 'extraktion' ? STANDARD_EXTRAKTION : STANDARD_ANTWORT;
        const inhalt = vorgabe !== undefined ? vorgabe : JSON.stringify(standard);
        return sende(res, 200, alsModellAntwort(inhalt));
    }

    sende(res, 404, { error: `Unbekannter Pfad: ${req.url}` });
});

server.listen(PORT, () => {
    console.log(`[Stub-Anbieter] hoert auf http://localhost:${PORT}`);
});
