import { isLocalInstance } from './env-context';

/**
 * Staggered Cookie Settling (SaaS only)
 * 🛡️
 *
 * Beim Dashboard-Load starten mehrere Governance-Hooks gleichzeitig einen
 * Request. Serverseitig laufen die alle durch `logtoClient.withLogtoApiRoute`
 * (siehe `src/lib/security.ts`), das die Session aus dem Cookie liest und bei
 * abgelaufenem Access Token einen Token-Refresh gegen Logto auslöst. Feuern
 * mehrere Requests zeitgleich in diesen Refresh, gewinnt einer und die übrigen
 * laufen ins 401.
 *
 * Diese Staffelung zieht die Requests auseinander. Sie ist bewusst eine
 * MITIGATION, keine Lösung — die eigentliche Behebung wäre eine serverseitige
 * Refresh-Serialisierung. Die Werte sind empirisch, nicht hergeleitet.
 *
 * ⚠️ Die Slots sind ein zusammenhängendes Schema. Sie lagen früher als vier
 * einzelne `setTimeout`-Aufrufe in vier Hook-Dateien, was dazu geführt hat,
 * dass die Staffelung auseinanderlief (drei Hooks dokumentierten sich als
 * "Slot n/3", während längst ein vierter existierte). Deshalb hier zentral:
 * einzelne Werte nie isoliert ändern.
 *
 * @see docs/support/troubleshooting-login-401.md
 */

/** Vorlauf des ersten Slots. */
const SETTLING_BASE_MS = 75;

/** Abstand zwischen zwei aufeinanderfolgenden Slots. */
const SETTLING_STEP_MS = 225;

/**
 * Reihenfolge der Governance-Hooks beim Dashboard-Load.
 * Niedrigere Slots laufen früher.
 */
export const SettlingSlot = {
    PROMPT_PROFILES: 1,
    SKILL_PROFILES: 2,
    AI_PROFILES: 3,
    GRADING_MEMORIES: 4
} as const;

export type SettlingSlotValue = typeof SettlingSlot[keyof typeof SettlingSlot];

export function settlingDelayMs(slot: SettlingSlotValue): number {
    return SETTLING_BASE_MS + (slot - 1) * SETTLING_STEP_MS;
}

/**
 * Wartet den Slot der aufrufenden Governance-Hook ab.
 * Lokale Instanzen (Desktop / Community) haben keine Logto-Session und
 * überspringen die Staffelung vollständig.
 */
export async function awaitSettlingSlot(slot: SettlingSlotValue): Promise<void> {
    if (isLocalInstance()) return;
    await new Promise(resolve => setTimeout(resolve, settlingDelayMs(slot)));
}
