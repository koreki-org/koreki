import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join } from 'path';
import { ToastHost } from '@/components/ToastHost';
import { useNotifyStore, meldeErfolg, meldeHinweis, meldeFehler, STANDZEIT } from '@/lib/notify';

/**
 * Der Wirt der Meldungen (Layer 2)
 * 🔔🛡️
 *
 * Der Speicher allein nuetzt nichts: Wenn der Wirt die Meldung nicht anzeigt,
 * verschwindet sie lautlos — die unangenehmste Art des Verschwindens, weil
 * niemand merkt, dass etwas fehlte. Genau das war frueher unmoeglich, denn
 * `alert()` brachte sein eigenes Fenster mit.
 */
describe('ToastHost', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        useNotifyStore.setState({ meldungen: [] });
        window.sessionStorage.clear();
    });

    afterEach(() => {
        // Nur zurueckstellen, nicht ablaufen lassen: Ein nachtraeglich
        // gefeuerter Timer wuerde ausserhalb von `act` in den Speicher
        // schreiben und eine Warnung erzeugen, die nichts bedeutet.
        jest.useRealTimers();
    });

    it('zeigt eine gemeldete Erfolgsmeldung an', () => {
        render(<ToastHost />);

        act(() => { meldeErfolg('Profil erfolgreich gespeichert!'); });

        expect(screen.getByText('Profil erfolgreich gespeichert!')).toBeInTheDocument();
    });

    it('zeigt mehrere Meldungen gleichzeitig', () => {
        render(<ToastHost />);

        act(() => {
            meldeErfolg('eins');
            meldeHinweis('zwei');
            meldeFehler('drei');
        });

        expect(screen.getByText('eins')).toBeInTheDocument();
        expect(screen.getByText('zwei')).toBeInTheDocument();
        expect(screen.getByText('drei')).toBeInTheDocument();
    });

    /**
     * Ein Fehler unterbricht die Vorlesereihenfolge, eine Bestaetigung wartet
     * hoeflich ab. Ohne diese Trennung liest ein Screenreader jede belanglose
     * Meldung mitten in den Satz hinein, an dem der Nutzer gerade ist.
     */
    it('meldet Fehler dringlich und Erfolg hoeflich', () => {
        render(<ToastHost />);

        act(() => {
            meldeFehler('Etwas ist schiefgegangen.');
            meldeErfolg('Alles gut.');
        });

        expect(screen.getByRole('alert')).toHaveTextContent('Etwas ist schiefgegangen.');
        expect(screen.getByRole('status')).toHaveTextContent('Alles gut.');
    });

    it('blendet eine Erfolgsmeldung nach ihrer Standzeit aus', () => {
        render(<ToastHost />);
        act(() => { meldeErfolg('vergaenglich'); });

        act(() => { jest.advanceTimersByTime((STANDZEIT.erfolg as number) + 100); });

        expect(screen.queryByText('vergaenglich')).not.toBeInTheDocument();
    });

    /**
     * DIE WICHTIGSTE ZUSICHERUNG DES WIRTS.
     *
     * Fehler enthalten oft, was zu tun ist. Einer, der sich selbst schliesst,
     * bevor er gelesen ist, ist schlimmer als keiner.
     */
    it('laesst einen Fehler stehen, egal wie lange', () => {
        render(<ToastHost />);
        act(() => { meldeFehler('bleibt stehen'); });

        act(() => { jest.advanceTimersByTime(10 * 60 * 1000); });

        expect(screen.getByText('bleibt stehen')).toBeInTheDocument();
    });

    it('laesst sich von Hand schliessen', () => {
        render(<ToastHost />);
        act(() => { meldeFehler('weg damit'); });

        fireEvent.click(screen.getByRole('button', { name: /schließen/i }));

        expect(screen.queryByText('weg damit')).not.toBeInTheDocument();
    });

    /**
     * Nach dem Beitritt zu einem Institut laedt Koreki neu. Ohne diese
     * Nachreichung waere die Erfolgsmeldung mit der alten Seite verschwunden.
     */
    it('reicht eine vor dem Neuladen hinterlegte Meldung nach', () => {
        window.sessionStorage.setItem(
            'koreki:meldung-nach-neuladen',
            JSON.stringify({ art: 'erfolg', text: 'Erfolgreich beigetreten: Musterschule' })
        );

        render(<ToastHost />);

        expect(screen.getByText('Erfolgreich beigetreten: Musterschule')).toBeInTheDocument();
    });

    it('zeigt nichts, solange nichts gemeldet wurde', () => {
        const { container } = render(<ToastHost />);

        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});

/**
 * Zwei Zusicherungen, die aus einem echten Fehler stammen (25.08.2026).
 *
 * Die erste Fassung faerbte den Zettel mit `bg-success/5` ein — zusammen mit
 * `bg-background` in derselben Klassenliste. `cn()` fasst ueber `tailwind-merge`
 * zusammen und behaelt nur die LETZTE Hintergrundklasse: uebrig blieben fuenf
 * Prozent Deckkraft, und ueber einem Modal war die Meldung kaum lesbar.
 *
 * Sie lag ausserdem auf `z-9999` und verliess sich darauf, spaeter im Dokument
 * zu stehen als die Dialoge. Zwei Modale liegen aber auf `z-10000` — der Zettel
 * verschwand hinter ihnen.
 */
const SRC_DIR = join(process.cwd(), 'src');

const alleQuellen = (dir: string): string[] =>
    readdirSync(dir).flatMap(eintrag => {
        const pfad = join(dir, eintrag);
        return lstatSync(pfad).isDirectory() ? alleQuellen(pfad) : [pfad];
    });

describe('Meldungen bleiben sichtbar', () => {
    const toastQuelle = readFileSync(join(SRC_DIR, 'components', 'ui', 'Toast.tsx'), 'utf8');
    const hostQuelle = readFileSync(join(SRC_DIR, 'components', 'ToastHost.tsx'), 'utf8');

    it('haelt die Flaeche undurchsichtig', () => {
        expect(toastQuelle).toContain('bg-background');

        // Eine zweite Hintergrundklasse — erst recht eine durchscheinende —
        // wuerde `bg-background` beim Zusammenfassen verdraengen.
        //
        // Kommentarzeilen bleiben aussen vor: Der Kopf der Datei erklaert den
        // Fehler und nennt die verbotene Klasse dabei beim Namen.
        const ohneKommentare = toastQuelle.split('\n')
            .filter(zeile => !/^\s*(\/\/|\*|\/\*)/.test(zeile))
            .join('\n');

        expect(ohneKommentare.match(/bg-(?:success|warning|destructive|white|black)\/\d+/g)).toBeNull();
    });

    it('liegt ueber allem anderen im Projekt', () => {
        const meins = Number(hostQuelle.match(/z-\[(\d+)\]/)?.[1]);
        expect(meins).toBeGreaterThan(0);

        const andere = alleQuellen(SRC_DIR)
            .filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('ToastHost.tsx'))
            .flatMap(f => Array.from(readFileSync(f, 'utf8').matchAll(/z-\[(\d+)\]/g)))
            .map(m => Number(m[1]));

        expect(Math.max(...andere)).toBeLessThan(meins);
    });
});
