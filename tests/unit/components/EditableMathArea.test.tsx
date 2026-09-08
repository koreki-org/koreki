import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EditableMathArea } from '../../../src/components/ui/EditableMathArea';

// Mock components
jest.mock('../../../src/components/ui/MathMarkdown', () => ({
    MathMarkdown: ({ content }: { content: string }) => <div data-testid="math-rendered">{content}</div>
}));

jest.mock('lucide-react', () => ({
    Pencil: () => <div data-testid="pencil-icon" />,
    Eye: () => <div data-testid="eye-icon" />,
    Check: () => <div data-testid="check-icon" />,
    ChevronDown: () => <div data-testid="chevron-icon" />,
    Settings: () => <div data-testid="settings-icon" />,
    FileText: () => <div data-testid="filetext-icon" />
}));

describe('EditableMathArea Component (Layer 1)', () => {
    const defaultProps = {
        value: 'Test Content',
        onChange: jest.fn(),
        placeholder: 'Enter content...'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initially render in read-only mode (rendered math)', () => {
        render(<EditableMathArea {...defaultProps} />);
        expect(screen.getByTestId('math-rendered')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
    });

    it('should switch to edit mode when clicking the pencil icon', () => {
        render(<EditableMathArea {...defaultProps} />);
        const editButton = screen.getByTestId('pencil-icon').closest('button');
        fireEvent.click(editButton!);
        
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.queryByTestId('math-rendered')).not.toBeInTheDocument();
        expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });

    it('should call onChange when typing in textarea', () => {
        render(<EditableMathArea {...defaultProps} />);
        // Switch to edit mode
        fireEvent.click(screen.getByTestId('pencil-icon').closest('button')!);
        
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'New Value' } });
        
        expect(defaultProps.onChange).toHaveBeenCalledWith('New Value');
    });

    it('should start in edit mode if initialEditMode is true', () => {
        render(<EditableMathArea {...defaultProps} initialEditMode={true} />);
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
});

/**
 * Notizzettel des Modells (`correctionNotes`).
 *
 * Er ging bis zum 24.08.2026 in `mapModelTask` verloren und war nie sichtbar.
 * Gezeigt wird er NUR bei Textaufgaben — bei Rechen- und Graphaufgaben liegt er
 * zwar ebenfalls vor, bleibt aber bewusst ungezeigt (Produktentscheidung: der
 * Engine-Beweis ist dort das Verlaesslichere, zwei Aufklapper ueberladen die Karte).
 */
describe('EditableMathArea — Notizen der KI', () => {
    const CALC_BLOCK = [
        '[📐 CalcTrace Engine - Mathematischer Abgleich]',
        'Beweis',
        '',
        '---',
        '',
        'Gut gemacht.'
    ].join('\n');

    it('zeigt die Notizen, wenn keine Engine gerechnet hat', () => {
        render(
            <EditableMathArea
                value="Sauber begruendet."
                onChange={jest.fn()}
                aiNotes="Kernmechanismus getroffen, weiterer Vorteil fehlt."
            />
        );
        expect(screen.getByText('Notizen der KI zur Punktevergabe einblenden')).toBeInTheDocument();
        expect(screen.getByText('Kernmechanismus getroffen, weiterer Vorteil fehlt.')).toBeInTheDocument();
    });

    it('zeigt sie NICHT, wenn ein Engine-Block vorliegt', () => {
        render(
            <EditableMathArea
                value={CALC_BLOCK}
                onChange={jest.fn()}
                aiNotes="Diese Notizen bleiben hier absichtlich verborgen."
            />
        );
        expect(screen.getByText('Technische Rechenketten-Detailanalyse einblenden')).toBeInTheDocument();
        expect(screen.queryByText('Notizen der KI zur Punktevergabe einblenden')).not.toBeInTheDocument();
        expect(screen.queryByText('Diese Notizen bleiben hier absichtlich verborgen.')).not.toBeInTheDocument();
    });

    it('nennt den Notizzettel nirgends "Begruendung"', () => {
        // Das Wort bezeichnet in dieser Oberflaeche die Aussage der LEHRKRAFT
        // (Fehlermeldung beim Anlernen, Feld im Kalibrierungs-Bildschirm) und
        // landet im Pruefungskontext potenziell in einer Akte.
        const { container } = render(
            <EditableMathArea value="Text." onChange={jest.fn()} aiNotes="Notiz." />
        );
        expect(container.textContent).not.toMatch(/Begr(ü|ue)ndung/i);
    });

    it('weist den Notizzettel als nicht schuelergerichtet aus', () => {
        render(<EditableMathArea value="Text." onChange={jest.fn()} aiNotes="Notiz." />);
        expect(screen.getByText(/nicht für Schüler bestimmt/)).toBeInTheDocument();
    });

    it('bleibt unveraendert, wenn keine Notizen vorliegen', () => {
        render(<EditableMathArea value="Nur Feedback." onChange={jest.fn()} />);
        expect(screen.queryByText('Notizen der KI zur Punktevergabe einblenden')).not.toBeInTheDocument();
    });
});

describe('EditableMathArea — Festgeschrieben (gesperrt)', () => {
    it('zeigt keinen Stift, wenn gesperrt', () => {
        render(<EditableMathArea value="Szenario." onChange={jest.fn()} gesperrt />);
        expect(screen.queryByTitle('Inhalt bearbeiten')).not.toBeInTheDocument();
    });

    it('zeigt den Stift, solange nicht gesperrt', () => {
        render(<EditableMathArea value="Szenario." onChange={jest.fn()} />);
        expect(screen.getByTitle('Inhalt bearbeiten')).toBeInTheDocument();
    });

    /**
     * Die Sperre muss den ZUSTAND schlagen, nicht nur den Schalter verstecken.
     *
     * Sonst bliebe ein Feld bearbeitbar, das waehrend des Tippens festgeschrieben
     * wurde: Der Stift verschwaende, das Eingabefeld bliebe stehen — und die
     * Musterloesung liesse sich weiter aendern, obwohl sie eingefroren ist.
     */
    it('faellt in den Lesemodus zurueck, wenn waehrend der Bearbeitung gesperrt wird', () => {
        const { rerender } = render(
            <EditableMathArea value="Szenario." onChange={jest.fn()} initialEditMode />
        );
        expect(screen.getByRole('textbox')).toBeInTheDocument();

        rerender(<EditableMathArea value="Szenario." onChange={jest.fn()} initialEditMode gesperrt />);
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByTestId('math-rendered')).toBeInTheDocument();
    });
});
