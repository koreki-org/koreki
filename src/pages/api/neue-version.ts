import type { NextApiResponse } from 'next';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { isLocalInstance } from '@/lib/env-context';
import { holeFreigegebeneVersion, istNeuer } from '@/lib/version-kanal';
import paket from '../../../package.json';

/**
 * Gibt es eine neuere freigegebene Version? Nur fuer Community-Instanzen.
 *
 * Der SaaS wird bei jedem Push ausgeliefert und kennt keine Updates durch die
 * Schule; die Desktop-App fragt den Kanal selbst (ohne Server). Deshalb
 * antwortet die Route ausserhalb von Community immer mit "nichts Neues".
 *
 * Kein Anfrage-Rumpf, daher keine Zod-Pruefung: die Route liest nichts vom
 * Client. Die Antwort enthaelt nur oeffentliche Versionsnummern.
 */
export interface NeueVersionAntwort {
    aktuell: string;
    neueste: string | null;
}

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse<NeueVersionAntwort | { error: string }>) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Nur GET.' });
    }

    const aktuell = paket.version;
    if (!isLocalInstance()) {
        return res.status(200).json({ aktuell, neueste: null });
    }

    const freigegeben = await holeFreigegebeneVersion();
    const neueste = freigegeben && istNeuer(freigegeben, aktuell) ? freigegeben : null;
    return res.status(200).json({ aktuell, neueste });
});
