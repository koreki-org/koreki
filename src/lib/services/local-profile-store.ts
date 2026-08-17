import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Der gemeinsame Unterbau der lokalen Profil-Dienste.
 * 🗃️
 *
 * Koreki legt vier Arten von Profilen lokal ab: Expertise, KI-Parameter,
 * Erfahrungsschätze und Skill-Sets. Jede hatte ihren eigenen Dienst — mit
 * demselben Pfad-Aufbau, derselben Traversal-Abwehr und denselben
 * Lösch-/Umbenennen-Rümpfen. Vier Kopien einer Sicherheitsprüfung sind vier
 * Gelegenheiten, sie an drei Stellen zu vergessen.
 *
 * Sie stehen jetzt einmal hier. Was sich je Profilart wirklich unterscheidet —
 * Dateiname, Bezeichnung in Meldungen, Nutzdaten — kommt als Parameter herein.
 */

export interface StoredProfileBase {
    id: string;
    name: string;
}

/**
 * Wo die Datei einer Profilart liegt.
 *
 * Zwei Ablagen, je nach Betriebsart:
 * 1. Node-Server unter Windows (lokale Entwicklung, `tauri dev`) → APPDATA.
 *    ACHTUNG: Die ausgelieferte Desktop-App erreicht diesen Service NIE — sie
 *    wird als statischer Export gebaut (next.config.js: output 'export'), hat
 *    also keine API-Routen und persistiert im localStorage der Webview
 *    (siehe src/lib/local-vault.ts).
 * 2. Community Mode (Docker/Linux) → ./data/prompts, der produktive Pfad.
 *
 * Der Dateiname wird aus der Nutzerkennung GEHASHT, damit kein Zeichen aus der
 * Eingabe je in einem Pfad landet.
 */
export function buildStoragePath(dateiPraefix: string, dienstName: string, userId?: string): string {
    const baseDir = process.env.APPDATA
        ? path.join(process.env.APPDATA, 'koreki')
        : path.join(process.cwd(), 'data', 'prompts');

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        logger.error(`[${dienstName}] Critical: Could not create directory`, { message: toErrorMessage(e) });
    }

    const filename = userId
        ? `${dateiPraefix}_${crypto.createHash('sha256').update(userId).digest('hex')}.json`
        : `${dateiPraefix}.json`;

    const targetPath = path.join(baseDir, filename);

    // Defense in Depth: Der aufgeloeste Pfad muss im Basisverzeichnis bleiben.
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(targetPath);
    if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error('SECURITY ALERT: Path Traversal attempt detected and blocked.');
    }

    return targetPath;
}

export interface ProfileMutationsParams<T extends StoredProfileBase> {
    getPath: (userId?: string) => string;
    /** Kennung in Logmeldungen, z. B. `LocalSkillProfileService`. */
    dienstName: string;
    /** Wie die Profilart in Fehlermeldungen heißt, z. B. „Skill-Profil". */
    bezeichnung: string;
    readForUpdate: (pfad: string) => T[];
    write: (pfad: string, daten: T[]) => void;
    assertNameIsFree: (vorhandene: T[], id: string, name: string, bezeichnung: string) => void;
}

/**
 * Löschen und Umbenennen — für jede Profilart derselbe Ablauf.
 *
 * Der Unterschied zwischen beiden ist beabsichtigt: Löschen schluckt Fehler
 * (die Datei ist danach so oder so weg), Umbenennen wirft, weil die Lehrkraft
 * erfahren muss, warum ihr Name nicht angenommen wurde — etwa bei einer
 * Namensgleichheit.
 */
export function createProfileMutations<T extends StoredProfileBase>(p: ProfileMutationsParams<T>) {
    const { getPath, dienstName, bezeichnung, readForUpdate, write, assertNameIsFree } = p;

    return {
        async deleteProfile(id: string, userId?: string): Promise<void> {
            const storagePath = getPath(userId);
            if (!fs.existsSync(storagePath)) return;

            try {
                const vorhandene: T[] = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
                write(storagePath, vorhandene.filter(x => x.id !== id));
            } catch (err) {
                logger.error(`[${dienstName}] Error deleting profile`, { message: toErrorMessage(err) });
            }
        },

        async renameProfile(id: string, newName: string, userId?: string): Promise<void> {
            const storagePath = getPath(userId);
            if (!fs.existsSync(storagePath)) throw new Error(`${bezeichnung} nicht gefunden`);

            const vorhandene = readForUpdate(storagePath);
            const ziel = vorhandene.find(x => x.id === id);
            if (!ziel) throw new Error(`${bezeichnung} nicht gefunden`);

            assertNameIsFree(vorhandene, id, newName, bezeichnung);

            ziel.name = newName.trim();
            write(storagePath, vorhandene);
        }
    };
}
