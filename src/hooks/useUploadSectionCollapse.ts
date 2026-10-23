import { useEffect, useRef, useState } from 'react';

/**
 * Wann die Upload-Karten (Musterlösung, Schülerarbeiten) eingeklappt sind.
 * 📂
 *
 * Herausgezogen aus `pages/app.tsx` (23.10.2026), als die dritte Regel dazukam.
 */
export function useUploadSectionCollapse({ batchFilesCount, isLoadingModel, showDemoHint }: {
    batchFilesCount: number;
    isLoadingModel: boolean;
    showDemoHint: boolean;
}) {
    // Auto-Scroll Logic: Smooth scroll to BatchProcessor once files are added
    const prevFilesCount = useRef(0);
    // Auto-Collapse: Once the first student file lands, fold the upload cards
    // away to give the BatchProcessor more visual room. Reopened via the
    // per-card chevron (CollapseToggleButton) or a full "Neu starten" reset.
    const [isUploadSectionCollapsed, setIsUploadSectionCollapsed] = useState(false);
    // Der Demo-Banner und das Einklappen der Upload-Karten wollen beide die Aufmerksamkeit
    // direkt nach dem Laden — das kollabiert bisher im selben Moment und "erschlaegt" den
    // Banner. Waehrend der Banner sichtbar ist, wird das Einklappen zurueckgestellt und erst
    // nachgeholt, sobald er verschwindet (Auto-Timeout oder manuelles Schliessen).
    const demoCollapsePending = useRef(false);
    const collapseUploadAndScroll = () => {
        setIsUploadSectionCollapsed(true);
        setTimeout(() => {
            const element = document.getElementById('batch-processor-anchor');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };
    useEffect(() => {
        if (batchFilesCount > 0 && prevFilesCount.current === 0) {
            if (showDemoHint) {
                demoCollapsePending.current = true;
            } else {
                collapseUploadAndScroll();
            }
        }
        prevFilesCount.current = batchFilesCount;
    }, [batchFilesCount]);
    useEffect(() => {
        if (!showDemoHint && demoCollapsePending.current) {
            demoCollapsePending.current = false;
            collapseUploadAndScroll();
        }
    }, [showDemoHint]);
    // Wer bei eingeklappter Karte über „Ändern“ eine neue Musterlösung lädt, sähe
    // sonst nichts von der Analyse — und danach nicht das neue Ergebnis.
    useEffect(() => {
        if (isLoadingModel) setIsUploadSectionCollapsed(false);
    }, [isLoadingModel]);

    return { isUploadSectionCollapsed, setIsUploadSectionCollapsed };
}
