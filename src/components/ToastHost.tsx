import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './ui/Toast';
import {
    useNotifyStore,
    holeMeldungNachNeuladen,
    STANDZEIT,
    type Meldung
} from '@/lib/notify';

/**
 * Zeigt die Meldungen aus `useNotifyStore`.
 *
 * Einmal in `_app.tsx` montiert und sonst nirgends. Ohne diesen Wirt bliebe
 * jede Meldung ungesehen — und zwar lautlos, was die unangenehmste Art des
 * Verschwindens ist.
 *
 * ZUR STAPELEBENE: Meldungen liegen UEBER allen Dialogen — sie berichten ja
 * ueber das, was in einem Dialog gerade geschehen ist. Ein erster Anlauf setzte
 * sie mit `z-9999` auf dieselbe Ebene wie die Modale und verliess sich auf die
 * Reihenfolge im Dokument. Das ging schief: `AVVUploadModal` und
 * `QuickStartModal` liegen bereits auf `z-10000`, und der Zettel verschwand
 * hinter ihnen. Die globale Stapelordnung des Design Systems kennt bisher keine
 * Ebene fuer fluechtige Meldungen — diese hier ist die hoechste im Projekt.
 */

/**
 * Eine einzelne Meldung mit ihrer eigenen Uhr.
 *
 * `verwirf` kommt unveraendert aus dem Speicher. Eine hier erzeugte
 * Inline-Funktion wechselte bei jedem Neuzeichnen die Identitaet — die Uhr
 * begaenne dann jedes Mal von vorn, und ein Erfolgszettel bliebe stehen,
 * solange nur oft genug etwas anderes passiert.
 */
const MeldungMitUhr: React.FC<{ meldung: Meldung; verwirf: (id: number) => void }> = ({
    meldung,
    verwirf
}) => {
    useEffect(() => {
        const standzeit = STANDZEIT[meldung.art];
        if (standzeit === null) return;

        const uhr = window.setTimeout(() => verwirf(meldung.id), standzeit);
        return () => window.clearTimeout(uhr);
    }, [meldung.id, meldung.art, verwirf]);

    return <Toast art={meldung.art} text={meldung.text} onSchliessen={() => verwirf(meldung.id)} />;
};

export const ToastHost: React.FC = () => {
    const [montiert, setMontiert] = useState(false);
    const meldungen = useNotifyStore((stand) => stand.meldungen);
    const verwirf = useNotifyStore((stand) => stand.verwirf);
    const melde = useNotifyStore((stand) => stand.melde);

    useEffect(() => {
        setMontiert(true);

        // Eine Meldung, die vor einem Neuladen hinterlegt wurde, nachreichen.
        const hinterlegt = holeMeldungNachNeuladen();
        if (hinterlegt) melde(hinterlegt.art, hinterlegt.text);
    }, [melde]);

    if (!montiert || meldungen.length === 0) return null;

    return createPortal(
        <div
            // OBEN MITTIG, nicht in einer Ecke.
            //
            // Die Meldung faengt Klicks ab — durchlaessig ist nur die leere
            // Flaeche zwischen mehreren Zetteln. Unten rechts lag sie damit
            // ueber genau dem Knopf, den fast jedes Modal dort hat („Zuweisen",
            // „Speichern"): Auf einem flachen Fenster war der fuer die Dauer
            // der Meldung weder sichtbar noch klickbar.
            //
            // Oben mittig kollidiert sie mit nichts: Der Kopfbereich liegt bei
            // offenem Modal ohnehin hinter dem Overlay, und ausserhalb eines
            // Modals folgt auf eine Meldung selten ein Klick genau dorthin.
            className="pointer-events-none fixed left-1/2 top-4 z-[10001] flex w-[calc(100vw-2rem)] max-w-[400px] -translate-x-1/2 flex-col gap-3"
        >
            {meldungen.map((meldung) => (
                <MeldungMitUhr key={meldung.id} meldung={meldung} verwirf={verwirf} />
            ))}
        </div>,
        document.body
    );
};
