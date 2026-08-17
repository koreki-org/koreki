import type { GradingMemory, GradingMemoryCase } from '@/types';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget } from '@/lib/env-context';
import { overwriteQuestion } from '@/lib/services/profile-naming';

/**
 * Einen Erfahrungsschatz anlegen — lokal oder in der Datenbank.
 * 💾
 *
 * Der Assistent legt auf zwei Wegen an: mit kalibrierten Fallbeispielen am
 * Ende des Durchlaufs, oder leer als Ausgangspunkt zum Befüllen von Hand.
 * Beide schrieben dieselben zwanzig Zeilen — Desktop in den lokalen Speicher,
 * SaaS und Community über die API. Der einzige Unterschied waren die Fälle.
 */

export interface PersistGradingMemoryParams {
    name: string;
    cases: GradingMemoryCase[];
    /** Nimmt den angelegten Schatz in die Liste der Oberfläche auf. */
    addLocalMemory: (memory: GradingMemory) => void;
}

export async function persistGradingMemory(p: PersistGradingMemoryParams): Promise<void> {
    const { name, cases, addLocalMemory } = p;

    if (isDesktopTarget()) {
        addLocalMemory({
            id: `local-grading-memory-${Date.now()}`,
            name,
            cases,
            userId: null,
            createdAt: new Date().toISOString()
        });
        return;
    }

    const response = await apiClient.post('/api/user/grading-memories', { name, cases });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Fehler beim Speichern des Erfahrungsschatzes.');
    }

    addLocalMemory(await response.json());
}

/**
 * Prüft den Namen und holt bei einer Namensgleichheit die Zustimmung ein.
 *
 * @returns `false`, wenn nicht weitergemacht werden soll.
 */
export function bestaetigeSchatzName(name: string, vorhandene: GradingMemory[]): { ok: boolean; fehler?: string } {
    if (!name.trim()) {
        return { ok: false, fehler: 'Bitte gib dem Erfahrungsschatz einen aussagekräftigen Namen.' };
    }

    const existing = vorhandene.find(m => m.name.toLowerCase() === name.trim().toLowerCase());
    if (!existing) return { ok: true };

    // Der Text versprach zuvor die Wahl zwischen Überschreiben und einem
    // zweiten Eintrag gleichen Namens. Beide Ablagen überschreiben aber
    // immer — die Datenbank erzwingt Eindeutigkeit je Nutzer.
    return { ok: window.confirm(overwriteQuestion('Erfahrungsschatz', name.trim())) };
}
