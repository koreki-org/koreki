/**
 * Welche Ansicht ein Anbieter-Panel zeigt: zentral verwaltet oder selbst konfiguriert.
 *
 * Mistral und OpenAI-kompatibel stellen dieselbe Frage und müssen sie gleich
 * beantworten. Stand die Weiche in beiden Dateien wortgleich, hätte die nächste
 * Änderung sie auseinanderlaufen lassen — genau die Fehlerklasse, die dieses Projekt
 * wiederholt getroffen hat. Deshalb EINE Funktion statt zweier Kopien; erzwungen durch
 * `tests/unit/anbieter-panel-symmetrie.test.ts`.
 */
import { getKorekiMode, isSingleUserInstance } from '@/lib/env-context';

export interface AnbieterPanelModus {
    isDesktop: boolean;
    isCommunity: boolean;
    isSaaS: boolean;
    isPure: boolean;
    /**
     * Die Lehrkraft konfiguriert selbst, statt auf eine Administration zu warten.
     * Gilt im Einzelbenutzer-Betrieb: Dort gibt es niemanden sonst.
     */
    istEigenverwaltet: boolean;
}

export function anbieterPanelModus(appMode?: string): AnbieterPanelModus {
    const mode = getKorekiMode();
    const isCommunity = mode === 'community';

    return {
        isDesktop: mode === 'desktop',
        isCommunity,
        isSaaS: mode === 'saas',
        isPure: appMode === 'PURE',
        istEigenverwaltet: isCommunity && isSingleUserInstance()
    };
}
