import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { isLocalInstance, getKorekiMode } from '@/lib/env-context';
import { logger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/error-message';
import paket from '../../../package.json';

/**
 * Lebenszeichen der Instanz.
 * 🩺
 *
 * WOFÜR DAS DA IST
 * ----------------
 * Coolify (und jede andere Orchestrierung) fragt regelmäßig, ob eine Instanz
 * gesund ist. Ohne eigenen Endpunkt bleibt nur „läuft der Container / antwortet
 * der Port" — und das ist zu schwach: Ein Next.js-Server antwortet auf Port
 * 3000 auch dann noch, wenn die Datenbank weg ist. Also genau in dem Fall, den
 * man bemerken will.
 *
 * Deshalb fasst diese Prüfung die Datenbank WIRKLICH an. Eine triviale Abfrage
 * genügt: Es geht nicht um Inhalte, sondern darum, dass die Verbindung steht.
 *
 * WAS HIER BEWUSST NICHT DRINSTEHT
 * --------------------------------
 * Nichts, was der Betrieb nicht braucht. Ein Endpunkt, der alle zehn Sekunden
 * ohne Anmeldung abgefragt wird, ist die falsche Stelle für Zahlen über
 * Nutzung, Kosten oder Budgets.
 *
 * `/api/ai-status` wäre als Sonde technisch geeignet gewesen — es ist anonym
 * erreichbar und liest aus der Datenbank. Es liefert aber die Monatskosten und
 * Budgets der Instanz mit, und die gehören nicht in eine Dauerabfrage.
 *
 * WAS ER NICHT BEANTWORTET
 * ------------------------
 * Ob eine KORREKTUR funktioniert. Das ist eine andere Frage, und sie gehört
 * nicht in die Produktion: Sie wird vor der Auslieferung beantwortet, von der
 * lokalen Test-Kette (`npm run test:e2e`) gegen einen gestubbten Anbieter.
 * Brennt das Licht — das ist diese Datei. Funktioniert die Bewertung — das ist
 * die Test-Kette.
 *
 * BEWUSST OHNE `withSecurity`
 * ---------------------------
 * Die Sonde läuft aus dem Container heraus, ohne Sitzung. Sie darf deshalb
 * keine Authentifizierung verlangen — und sie verrät auch nichts, das eine
 * bräuchte. Der Ratenbegrenzer des Wrappers wäre hier zudem schädlich: Eine
 * Sonde im Zehn-Sekunden-Takt liefe irgendwann in sein Limit und meldete die
 * gesunde Instanz als krank.
 *
 * Der Sicherheits-Audit verlangt fuer diese Ausnahme den Tag oben — er zwingt
 * zur Begruendung an Ort und Stelle und macht sie im Diff sichtbar. Das ist
 * gewollt: Diese Route ist die einzige unauthentifizierte im Projekt, und das
 * soll auffallen, wenn jemand sie erweitert.
 *
 * Konkret heisst das fuer kuenftige Aenderungen: Was hier hineingeschrieben
 * wird, liest die ganze Welt. Status, Modus, Version — mehr nicht.
 */

// @security-audit-exclude — Begruendung im Kopf dieser Datei.
//
// Die Marke muss woertlich als Zeilenkommentar dastehen; im Blockkommentar
// darueber findet der Waechter sie nicht. Das ist kein Schoenheitsfehler,
// sondern Absicht: Eine Ausnahme von der Authentifizierung soll eine eigene,
// unuebersehbare Zeile kosten.

interface Gesundheit {
    status: 'ok' | 'degraded';
    mode: string;
    version: string;
    database: 'ok' | 'unreachable' | 'not-required';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Gesundheit | { error: string }>) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const gemeinsam = {
        mode: getKorekiMode(),
        // Aus der package.json statt aus einer eigenen Umgebungsvariable: Eine
        // Variable, die jemand zu setzen vergisst, meldet nach dem Deploy die
        // ALTE Version — und damit genau dann etwas Falsches, wenn man sie
        // braucht.
        version: paket.version
    };

    // Lokale Instanzen (Desktop, Community-Einzelplatz) haben keine Datenbank.
    // Sie danach zu fragen hiesse, eine gesunde Instanz als krank zu melden.
    if (isLocalInstance()) {
        return res.status(200).json({ ...gemeinsam, status: 'ok', database: 'not-required' });
    }

    try {
        // Die billigste Abfrage, die eine echte Verbindung beweist.
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({ ...gemeinsam, status: 'ok', database: 'ok' });
    } catch (error) {
        // 503, damit die Orchestrierung die Instanz aus dem Verkehr zieht,
        // statt Anfragen in eine Instanz ohne Datenbank zu leiten.
        logger.error('[Health] Datenbank nicht erreichbar', { message: toErrorMessage(error) });
        return res.status(503).json({ ...gemeinsam, status: 'degraded', database: 'unreachable' });
    }
}
