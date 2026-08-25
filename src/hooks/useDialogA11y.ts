import { useEffect, useRef, useState } from 'react';

/**
 * Barrierefreier Unterbau fuer blockierende Modals.
 *
 * Das Design System verlangt drei Dinge von jedem Modal, die bisher an keiner
 * Stelle zentral standen: Portal-Montage an den Body, gesperrter Body-Scroll und
 * eine Fokusfalle. Ohne die Falle laeuft der Tastatur-Fokus hinter das Overlay
 * weiter — der Nutzer bedient dann Bedienelemente, die er nicht sieht.
 *
 * Der Parameter `active` steuert, ob der Dialog gerade offen ist. Dialoge, die
 * ueber eine Prop auf- und zugeschaltet werden (ConfirmationModal), bleiben als
 * Komponente montiert — ohne diesen Schalter liefe der Aufbau genau einmal und
 * beim zweiten Oeffnen gaebe es weder Scroll-Sperre noch Fokusfalle. Wer
 * dauerhaft offen ist (Onboarding), laesst ihn weg.
 *
 * Der Hook gibt nur zwei Dinge zurueck:
 * - `mounted`: erst nach dem ersten Client-Render `true`, damit `createPortal`
 *   nicht schon beim Server-Rendering nach `document.body` greift.
 * - `dialogRef`: gehoert an das Dialog-Panel (nicht an die Backdrop-Ebene).
 *
 * Bewusst NICHT enthalten: ein Escape-Handler. Dieser Hook bedient auch
 * Dialoge, die man nicht wegdruecken darf (Onboarding-Auswahl). Wer schliessbar
 * ist, verdrahtet Escape selbst mit seiner eigenen `onClose`-Zusage.
 */

/** Was ueberhaupt Fokus annehmen kann. Deckungsgleich mit der Tab-Reihenfolge des Browsers. */
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

const collectFocusable = (root: HTMLElement): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => element.offsetParent !== null || element === root);

export function useDialogA11y<T extends HTMLElement>(active: boolean = true) {
    const [mounted, setMounted] = useState(false);
    const dialogRef = useRef<T | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!mounted || !active || !dialog) return;

        const previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        // Den vorherigen Wert merken statt blind auf 'unset' zurueckzusetzen:
        // sonst hebt der schliessende Dialog die Sperre eines noch offenen auf.
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const [firstFocusable] = collectFocusable(dialog);
        (firstFocusable ?? dialog).focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            const focusable = collectFocusable(dialog);
            if (focusable.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (event.shiftKey && (active === first || active === dialog)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus();
        };
    }, [mounted, active]);

    return { mounted, dialogRef };
}
