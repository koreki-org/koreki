/**
 * Rückgängig im Schwärzungs-Dialog (hooks/useMitRueckgaengig.ts).
 *
 * ANLASS (25.10.2026). Ein Balken liegt standardmäßig auf jedem Blatt; Rückgängig
 * nahm nur die Kopie auf dem sichtbaren Blatt zurück. Ein Schritt ist der ganze Stand.
 */
import { renderHook, act } from '@testing-library/react';
import { useMitRueckgaengig } from '@/hooks/useMitRueckgaengig';
import { verteileAufAlleBlaetter, type RedactionRect } from '@/lib/privacy-utils';

type Balken = Record<number, RedactionRect[]>;
const groessen = { 0: { width: 100, height: 100 }, 1: { width: 100, height: 100 }, 2: { width: 100, height: 100 } };
const balken: RedactionRect = { x: 1, y: 1, w: 10, h: 5, scope: 'local' };

describe('Rückgängig über alle Blätter', () => {
    it('nimmt einen auf alle Blätter gelegten Balken überall zurück', () => {
        const { result } = renderHook(() => useMitRueckgaengig<Balken>({}));
        act(() => result.current.aendere(v => verteileAufAlleBlaetter(v, balken, 0, groessen as never)));
        expect(Object.values(result.current.stand).filter(r => r.length).length).toBe(3);

        act(() => result.current.rueckgaengig());
        expect(Object.values(result.current.stand).every(r => r.length === 0)).toBe(true);
        expect(result.current.kannRueckgaengig).toBe(false);
    });

    it('macht Laden nicht rückgängig, aber das Leeren', () => {
        const { result } = renderHook(() => useMitRueckgaengig<Balken>({}));
        act(() => result.current.ersetze({ 0: [balken] }));
        expect(result.current.kannRueckgaengig).toBe(false);

        act(() => result.current.aendere(() => ({})));
        act(() => result.current.rueckgaengig());
        expect(result.current.stand).toEqual({ 0: [balken] });
    });

    it('legt keinen Schritt ab, wenn sich nichts ändert', () => {
        const { result } = renderHook(() => useMitRueckgaengig<Balken>({}));
        act(() => result.current.aendere(v => v));
        expect(result.current.kannRueckgaengig).toBe(false);
    });
});
