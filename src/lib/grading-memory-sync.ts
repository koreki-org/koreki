import type { GradingMemory } from '@/types';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { toErrorMessage } from '@/lib/error-message';
import { logger } from '@/lib/logger';

/**
 * Den aktiven Erfahrungsschatz vor der Korrektur bereitstellen.
 * 🔄
 *
 * Die Korrektur liest die Fallbeispiele aus dem lokalen Speicher. Hat die
 * Lehrkraft den aktiven Schatz in einer anderen Sitzung gewechselt, steht dort
 * noch der alte — die Bewertung folgte dann einem Massstab, den niemand mehr
 * gewaehlt hat. Dieser Abgleich laeuft deshalb VOR jedem Lauf.
 */
export async function ensureActiveGradingMemorySynced() {
    try {
        const activeId = localStorage.getItem('koreki_active_grading_memory_id');
        if (!activeId) {
            localStorage.removeItem('koreki_active_grading_memory_cases');
            localStorage.removeItem('koreki_active_grading_memory_name');
            // `debug`, nicht `info`: Das ist der Normalfall, kein Ereignis. Die
            // drei Geschwister-Zeilen darunter melden einen tatsaechlichen
            // Abgleich und bleiben deshalb auf `info`. Nur weglassen laesst sich
            // die Zeile nicht — glaubt die Lehrkraft, ein Schatz sei aktiv, und
            // er ist es nicht, ist sie der einzige Beleg dafuer.
            logger.debug('[GradingMemory Sync] No active grading memory configured. Cleared cases.');
            return;
        }

        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_grading_memories');
            if (stored) {
                const list: GradingMemory[] = JSON.parse(stored);
                const activeMem = list.find(m => m.id === activeId);
                if (activeMem) {
                    localStorage.setItem('koreki_active_grading_memory_name', activeMem.name);
                    if (activeMem.cases) {
                        localStorage.setItem('koreki_active_grading_memory_cases', JSON.stringify(activeMem.cases));
                        logger.info(`[GradingMemory Sync] (Desktop) Synced active memory "${activeMem.name}" with ${activeMem.cases.length} cases.`);
                    } else {
                        localStorage.setItem('koreki_active_grading_memory_cases', '[]');
                    }
                }
            }
            return;
        }

        // Community / SaaS Mode
        const res = await apiClient.get('/api/user/grading-memories');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                const activeMem = (data as GradingMemory[]).find(m => m.id === activeId);
                if (activeMem) {
                    localStorage.setItem('koreki_active_grading_memory_name', activeMem.name);
                    if (activeMem.cases) {
                        localStorage.setItem('koreki_active_grading_memory_cases', JSON.stringify(activeMem.cases));
                        logger.info(`[GradingMemory Sync] (Server) Synced active memory "${activeMem.name}" with ${activeMem.cases.length} cases.`);
                    } else {
                        localStorage.setItem('koreki_active_grading_memory_cases', '[]');
                    }
                }
            }
        }
    } catch (e) {
        logger.error('[GradingMemory Sync] Error syncing active memory before correction:', { message: toErrorMessage(e) });
    }
}
