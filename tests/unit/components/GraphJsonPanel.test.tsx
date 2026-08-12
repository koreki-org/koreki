import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GraphJsonPanel } from '../../../src/components/batch/parts/GraphJsonPanel';

/**
 * Erster Reiter, der aus GradingGraphModal herausgeloest wurde.
 *
 * Die Darstellung der vier Reiter war bisher ungetestet — genau deshalb habe
 * ich das Zerlegen lange aufgeschoben. Dieser Test ist die Absicherung, die
 * das Verschieben der uebrigen Reiter erst verantwortbar macht: er haelt fest,
 * was der Reiter anzeigt und wann.
 */
describe('GraphJsonPanel', () => {
    const props = {
        jsonText: '{"variables":[]}',
        jsonError: null as string | null,
        isLocked: false,
        onJsonChange: jest.fn()
    };

    beforeEach(() => jest.clearAllMocks());

    it('zeigt den uebergebenen Text', () => {
        render(<GraphJsonPanel {...props} />);

        expect(screen.getByRole('textbox')).toHaveValue('{"variables":[]}');
    });

    it('meldet den Graphen als validiert, solange kein Fehler vorliegt', () => {
        render(<GraphJsonPanel {...props} />);

        expect(screen.getByText('Validiert')).toBeInTheDocument();
        expect(screen.queryByText('Syntax-Fehler!')).not.toBeInTheDocument();
    });

    it('zeigt bei einem Fehler die Meldung statt der Bestaetigung', () => {
        render(<GraphJsonPanel {...props} jsonError="Unerwartetes Zeichen bei Position 12" />);

        expect(screen.getByText('Syntax-Fehler!')).toBeInTheDocument();
        expect(screen.queryByText('Validiert')).not.toBeInTheDocument();
    });

    it('gibt den Fehlertext des Parsers wortgetreu aus', () => {
        // Die Lehrkraft soll sehen, WO es klemmt — nicht nur DASS es klemmt.
        render(<GraphJsonPanel {...props} jsonError="Unerwartetes Zeichen bei Position 12" />);

        expect(screen.getByText('Unerwartetes Zeichen bei Position 12')).toBeInTheDocument();
    });

    it('reicht Aenderungen nach oben durch', () => {
        render(<GraphJsonPanel {...props} />);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: '{"variables":[{"id":"a"}]}' } });

        expect(props.onJsonChange).toHaveBeenCalledWith('{"variables":[{"id":"a"}]}');
    });

    it('laesst im gesperrten Zustand keine Bearbeitung zu', () => {
        // Gesperrt heisst: ein zugewiesener Graph wird angesehen, nicht geaendert.
        render(<GraphJsonPanel {...props} isLocked />);

        expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
});
