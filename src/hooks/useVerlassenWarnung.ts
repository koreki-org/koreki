import { useEffect } from 'react';

/**
 * Fragt nach, bevor eine geladene Korrektur mit der Seite verschwindet.
 * ⚠️
 *
 * Schuelerdaten leben in Koreki ausschliesslich im Arbeitsspeicher
 * (`architectural-vision` §2, „Fidelity Guard"). Das ist Absicht und aus
 * Datenschutzsicht richtig — es heisst aber auch: Ein F5, ein geschlossenes
 * Fenster oder ein versehentliches Zurueck vernichtet eine halbe Stunde Arbeit,
 * ohne zu fragen und ohne Rueckweg. Es gibt keinen Papierkorb, keinen
 * Zwischenstand, keine Datenbank, aus der sich das wiederholen liesse.
 *
 * WAS DIESER HAKEN ABDECKT — UND WAS NICHT
 * ----------------------------------------
 * `beforeunload` greift beim Neuladen, beim Schliessen des Fensters und beim
 * Verlassen zu einer fremden Adresse. Er greift NICHT bei der clientseitigen
 * Navigation innerhalb von Koreki; die behaelt den Zustand ohnehin (am
 * 10.11.2026 im Browser nachgemessen: Marke auf `window` ueberlebt den Weg zur
 * Betriebsanleitung und zurueck). Die Wege nach draussen sind getrennt
 * abgesichert — die Links der Fusszeile oeffnen seit dem 11.11.2026 in einem
 * neuen Tab.
 *
 * WARUM OHNE EIGENEN TEXT
 * -----------------------
 * Der Satz im Dialog laesst sich seit Jahren nicht mehr vorgeben; jeder Browser
 * zeigt seine eigene Formulierung. Wer hier eine Botschaft hineinschreibt,
 * schreibt sie an eine Wand, die niemand sieht. Die Aufgabe dieses Hakens ist
 * allein, dass ueberhaupt gefragt wird.
 *
 * WARUM NUR BEI INHALT
 * --------------------
 * Eine Rueckfrage auf einer leeren Oberflaeche ist eine Rueckfrage, die man sich
 * abgewoehnt. Sie meldet sich nur, wenn es etwas zu verlieren gibt — und
 * verschwindet wieder, sobald nichts mehr geladen ist.
 */
export function useVerlassenWarnung(hatInhalt: boolean): void {
    useEffect(() => {
        if (!hatInhalt) return;

        const warnen = (e: BeforeUnloadEvent) => {
            // Beides ist noetig: `preventDefault` ist der heutige Weg,
            // `returnValue` der aeltere, den manche Browser weiter verlangen.
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', warnen);
        return () => window.removeEventListener('beforeunload', warnen);
    }, [hatInhalt]);
}
