import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ZipPruefDialog } from '@/components/upload/ZipPruefDialog';
import type { ZipBefund, ZipDatei } from '@/lib/zip-abgaben';

/**
 * Fenster „Abgaben pruefen" (Layer 1)
 * 🗂️
 *
 * ANLASS, 15.11.2026: Die Meldung nach dem ZIP-Upload war lang, nicht nach
 * Prueflingen geordnet und schloss sich, bevor sie gelesen war.
 */

const datei = (pfad: string, art: ZipDatei['art']): ZipDatei =>
    ({ pfad, art, datei: new File(['x'], pfad.split('/').pop()!) });

const pruefling = (name: string) => ({
    name,
    dateien: [
        datei('sca/Bereitgestellte Dateien/Preisliste.pdf', 'vorlage'),
        datei('sca/_collect/a1.pdf', 'abgabe'),
        datei('sca/_collect/Kalkulation.ods', 'unlesbar'),
        datei('hda/_collect/fremd.pdf', 'abgabe')
    ]
});

const befund: ZipBefund = { quelle: 'Abgaben.zip', prueflinge: [pruefling('lena'), pruefling('max')], ausserhalb: [], doppelt: [] };

const zeige = () => {
    const onUebernehmen = jest.fn();
    const onAbbrechen = jest.fn();
    render(<ZipPruefDialog befund={befund} onUebernehmen={onUebernehmen} onAbbrechen={onAbbrechen} />);
    return { onUebernehmen, onAbbrechen };
};

const haken = (name: string) => screen.getByText(name).closest('label')!.querySelector('input') as HTMLInputElement;

describe('ZipPruefDialog', () => {
    it('zeigt je Pruefling eine Kurzfassung, den ersten aufgeklappt', () => {
        zeige();
        expect(screen.getByText('lena')).toBeInTheDocument();
        expect(screen.getAllByText('2 übernommen · 2 weggelassen')).toHaveLength(2);
        expect(screen.getAllByText('a1.pdf')).toHaveLength(1);
    });

    it('hakt Abgaben an, Vorlagen ab und sperrt Unlesbares', () => {
        zeige();
        expect(haken('a1.pdf').checked).toBe(true);
        expect(haken('Preisliste.pdf').checked).toBe(false);
        expect(haken('Kalkulation.ods').disabled).toBe(true);
        expect(screen.getByText('· Format nicht lesbar')).toBeInTheDocument();
    });

    /** Der Kern: einen fremden Ordner einmal abwaehlen, fuer die ganze Klasse. */
    it('waehlt einen Ordner bei allen Pruefligen ab und uebergibt die Auswahl', () => {
        const { onUebernehmen } = zeige();
        fireEvent.click(screen.getByLabelText('Ordner hda/_collect bei allen Prüflingen'));
        fireEvent.click(screen.getByTestId('zip-uebernehmen'));
        expect(onUebernehmen).toHaveBeenCalledWith({ lena: ['sca/_collect/a1.pdf'], max: ['sca/_collect/a1.pdf'] });
    });

    it('nennt einen Pruefling ohne Auswahl und zaehlt ihn nicht mit', () => {
        zeige();
        fireEvent.click(haken('a1.pdf'));
        fireEvent.click(haken('fremd.pdf'));
        expect(screen.getByText('wird nicht übernommen')).toBeInTheDocument();
        expect(screen.getByTestId('zip-uebernehmen')).toHaveTextContent('1 Prüfling übernehmen');
    });

    it('bricht ab ueber den Knopf und Escape', () => {
        const { onAbbrechen } = zeige();
        fireEvent.click(screen.getByText('Abbrechen'));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onAbbrechen).toHaveBeenCalledTimes(2);
    });
});
