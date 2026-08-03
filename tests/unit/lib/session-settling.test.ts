/**
 * Staggered Cookie Settling (Layer 1)
 * 🛡️ Sichert das Staffelungs-Schema gegen stilles Auseinanderlaufen.
 *
 * Die konkreten Millisekunden sind empirisch und dürfen sich ändern. Was NICHT
 * brechen darf, ist die Invariante dahinter: die Slots müssen echt aufsteigend
 * und paarweise verschieden sein, sonst feuern zwei Governance-Hooks wieder
 * gleichzeitig in denselben Logto-Token-Refresh. Genau das ist vorher passiert,
 * als die Werte als vier lose setTimeout-Aufrufe in vier Hook-Dateien lagen.
 */

const mockIsLocalInstance = jest.fn();

jest.mock('@/lib/env-context', () => ({
    isLocalInstance: () => mockIsLocalInstance()
}));

import { SettlingSlot, settlingDelayMs, awaitSettlingSlot } from '@/lib/session-settling';

const ALL_SLOTS = Object.values(SettlingSlot);

beforeEach(() => {
    mockIsLocalInstance.mockReset();
    mockIsLocalInstance.mockReturnValue(false);
});

describe('session settling — Staffelungs-Schema', () => {

    it('vergibt jedem Governance-Hook einen eigenen Slot', () => {
        expect(new Set(ALL_SLOTS).size).toBe(ALL_SLOTS.length);
    });

    it('staffelt die Delays echt aufsteigend', () => {
        const delays = [...ALL_SLOTS].sort((a, b) => a - b).map(settlingDelayMs);

        for (let i = 1; i < delays.length; i++) {
            expect(delays[i]).toBeGreaterThan(delays[i - 1]);
        }
    });

    it('hält den Abstand zwischen benachbarten Slots konstant', () => {
        const delays = [...ALL_SLOTS].sort((a, b) => a - b).map(settlingDelayMs);
        const steps = delays.slice(1).map((d, i) => d - delays[i]);

        expect(new Set(steps).size).toBe(1);
    });

    it('überspringt die Staffelung auf lokalen Instanzen vollständig', async () => {
        mockIsLocalInstance.mockReturnValue(true);

        const before = Date.now();
        await awaitSettlingSlot(SettlingSlot.GRADING_MEMORIES);

        expect(Date.now() - before).toBeLessThan(50);
    });

    /**
     * Schutz vor versehentlicher Rückkehr zur alten Größenordnung: der letzte
     * Slot hat das Dashboard mit 1500ms spürbar ausgebremst.
     */
    it('hält den letzten Slot unter einer Sekunde', () => {
        const slowest = Math.max(...ALL_SLOTS.map(settlingDelayMs));

        expect(slowest).toBeLessThan(1000);
    });
});
