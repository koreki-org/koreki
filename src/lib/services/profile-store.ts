import { apiClient } from '@/lib/api-client';
import { isDesktopTarget } from '@/lib/env-context';
import { isSameName } from './profile-naming';
import { readLocalArray, readLocalArrayForUpdate, writeLocalArray } from '@/lib/local-vault';

/**
 * Wo Profile liegen — lokal oder in der Datenbank.
 * 🗄️
 *
 * Koreki kennt drei Profil-Familien mit derselben Verwaltung: Experten-Profile,
 * KI-Parameter und Skill-Sets. Jede musste an vier Stellen entscheiden, ob sie
 * im localStorage der Desktop-Fassung oder ueber eine API-Route arbeitet —
 * beim Laden, Speichern, Loeschen und Umbenennen. Zwoelf Verzweigungen fuer
 * dieselbe Frage.
 *
 * Sie stehen jetzt einmal hier. Der Hook entscheidet danach nur noch, was mit
 * dem Ergebnis geschehen soll, nicht mehr, woher es kommt.
 *
 * DREI ABLAGEN, ABER NUR ZWEI FAELLE HIER
 * ---------------------------------------
 * Koreki persistiert in drei Betriebsarten VERSCHIEDEN:
 *
 *   Desktop    localStorage der Webview  — statischer Export, hat GAR KEINE
 *                                          API-Routen
 *   Community  Dateien in ./data/prompts — ueber eine API-Route
 *   SaaS       PostgreSQL via Prisma     — ueber DIESELBE API-Route
 *
 * Diese Datei liegt im CLIENT, und dort gibt es deshalb nur zwei Faelle: „kein
 * Server vorhanden" (Desktop) und „Server vorhanden" (Community und SaaS).
 * Welche der beiden Ablagen hinter der Route liegt, entscheidet die Route
 * selbst ueber `isLocalInstance()` — siehe pages/api/user/*-profiles.ts.
 *
 * 🏮 Diese Grenze bitte NICHT „vervollstaendigen". Ein `isLocalInstance()` hier
 * im Client hiesse, Community und SaaS ab da getrennt zu behandeln — und genau
 * daraus entstehen die Abweichungen, die dieser Unterbau verhindern soll.
 * Community ist ausdruecklich KEIN Desktop-Target: sie hat einen Server, nur
 * keine Datenbank.
 *
 * WARUM DAS MEHR ALS AUFRAEUMEN IST
 * ---------------------------------
 * Die Trennung Desktop/Server ist in diesem Projekt eine belegte Fehlerquelle:
 * mehrfach wurde eine Verbesserung nur in einem der beiden Zweige nachgezogen,
 * und die andere Betriebsart verhielt sich ab da anders — ohne dass irgendwo
 * etwas fehlschlug. Was hier einmal steht, kann nicht auseinanderlaufen.
 *
 * Die SYSTEM-VORLAGEN gehoeren bewusst nicht hierher. Sie sind je Familie
 * verschieden (Experten-Registry, zwei feste KI-Profile, MINT-Standardsets) und
 * werden vom jeweiligen Hook vor die geladene Liste gesetzt.
 */

export interface ProfilBasis {
    id: string;
    name: string;
    isSystem?: boolean;
}

/** Was eine Profil-Familie von den anderen unterscheidet. */
export interface ProfilArt {
    /** Schluessel im localStorage der Desktop-Fassung. */
    speicherSchluessel: string;
    /** API-Route im Server-Betrieb, ohne Parameter. */
    endpunkt: string;
    /** Praefix der lokal vergebenen Kennungen, z. B. `local-skill`. */
    idPraefix: string;
}

export interface SpeichereParams<T> {
    /** Leer beim Neuanlegen, sonst die Kennung des bearbeiteten Profils. */
    zielId: string;
    name: string;
    /** Was diese Familie ausmacht — Prompt-Text, Regler, Skill-Kennungen. */
    nutzdaten: Partial<T>;
}

export interface ProfileStore<T extends ProfilBasis> {
    /** Die GESPEICHERTEN Profile. System-Vorlagen setzt der Aufrufer davor. */
    lade(): Promise<T[]>;
    speichere(p: SpeichereParams<T>): Promise<T>;
    loesche(id: string): Promise<void>;
    /** `false`, wenn der Name lokal bereits vergeben ist. */
    benenneUm(id: string, neuerName: string): Promise<boolean>;
}

/** Liest die Fehlermeldung einer abgelehnten Antwort, ohne selbst zu werfen. */
const meldungAus = async (res: Response, rueckfall: string): Promise<string> => {
    try {
        const data = await res.json();
        return data?.message || rueckfall;
    } catch {
        return rueckfall;
    }
};

export function createProfileStore<T extends ProfilBasis>(art: ProfilArt): ProfileStore<T> {
    const { speicherSchluessel, endpunkt, idPraefix } = art;

    return {
        async lade(): Promise<T[]> {
            if (isDesktopTarget()) {
                return readLocalArray<T>(speicherSchluessel);
            }

            const res = await apiClient.get(endpunkt);
            if (!res.ok) throw new Error(await meldungAus(res, 'Laden fehlgeschlagen'));

            const data = await res.json();
            return Array.isArray(data) ? (data as T[]) : [];
        },

        /**
         * Legt ein Profil an oder aktualisiert es.
         *
         * Beim Bearbeiten entscheidet die KENNUNG, welcher Datensatz getroffen
         * wird — nicht der Name. Nur beim Neuanlegen faellt die Entscheidung
         * ueber den Namen, und dem hat die Lehrkraft dann ausdruecklich
         * zugestimmt.
         */
        async speichere({ zielId, name, nutzdaten }: SpeichereParams<T>): Promise<T> {
            if (isDesktopTarget()) {
                const profile = readLocalArrayForUpdate<T>(speicherSchluessel);
                const index = zielId
                    ? profile.findIndex(x => x.id === zielId)
                    : profile.findIndex(x => isSameName(x.name, name));

                if (index >= 0) {
                    // Der NAME bleibt, wie er abgelegt ist. Getroffen wird ein
                    // bestehender Eintrag entweder ueber die Kennung (dann ist
                    // der Name ohnehin derselbe) oder ueber `isSameName`, das
                    // Gross-/Kleinschreibung ignoriert. Ihn hier zu
                    // ueberschreiben hiesse, ein Speichern still in ein
                    // Umbenennen zu verwandeln.
                    profile[index] = { ...profile[index], ...nutzdaten };
                    writeLocalArray(speicherSchluessel, profile);
                    return profile[index];
                }

                const neu = {
                    ...nutzdaten,
                    id: `${idPraefix}-${Date.now()}`,
                    name,
                    isSystem: false
                } as T;
                profile.push(neu);
                writeLocalArray(speicherSchluessel, profile);
                return neu;
            }

            const res = await apiClient.post(endpunkt, {
                ...nutzdaten,
                id: zielId || undefined,
                name
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Speichern fehlgeschlagen');
            return data as T;
        },

        async loesche(id: string): Promise<void> {
            if (isDesktopTarget()) {
                writeLocalArray(
                    speicherSchluessel,
                    readLocalArrayForUpdate<T>(speicherSchluessel).filter(p => p.id !== id)
                );
                return;
            }

            const res = await apiClient.fetch(`${endpunkt}?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await meldungAus(res, 'Loeschen fehlgeschlagen'));
        },

        async benenneUm(id: string, neuerName: string): Promise<boolean> {
            if (isDesktopTarget()) {
                const profile = readLocalArrayForUpdate<T>(speicherSchluessel);
                if (profile.some(p => p.id !== id && isSameName(p.name, neuerName))) return false;

                writeLocalArray(
                    speicherSchluessel,
                    profile.map(p => p.id === id ? { ...p, name: neuerName.trim() } : p)
                );
                return true;
            }

            const res = await apiClient.fetch(endpunkt, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, newName: neuerName.trim() })
            });

            if (!res.ok) throw new Error(await meldungAus(res, 'Umbenennen fehlgeschlagen'));
            return true;
        }
    };
}
