import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ParameterSlider } from '../../../src/components/settings/ParameterSlider';

/**
 * Der Regler ersetzt acht gleichartige Bloecke in AiProfileModules. Weil jetzt
 * alle acht an einer Stelle haengen, gehoert das Verhalten geprueft — vor allem
 * die Unterscheidung zwischen Komma- und Ganzzahl-Werten, die vorher je Block
 * einzeln ausgeschrieben war.
 */
describe('ParameterSlider', () => {
    const props = {
        label: 'Temperatur (Kreativität)',
        tooltipTitle: 'Temperatur',
        tooltipContent: 'Steuert die Kreativität des Modells.',
        value: 0.7,
        onChange: jest.fn(),
        min: '0.0',
        max: '2.0',
        step: '0.1',
        decimals: 1,
        description: 'Ausgewogene Notengebung',
        defaultHint: '0.7'
    };

    beforeEach(() => jest.clearAllMocks());

    it('zeigt Beschriftung, Beschreibung und Empfehlung', () => {
        render(<ParameterSlider {...props} />);

        expect(screen.getByText('Temperatur (Kreativität)')).toBeInTheDocument();
        expect(screen.getByText('Ausgewogene Notengebung')).toBeInTheDocument();
        expect(screen.getByText(/Standard:/)).toHaveTextContent('Standard: 0.7');
    });

    it('stellt Kommawerte mit der geforderten Genauigkeit dar', () => {
        render(<ParameterSlider {...props} value={0.75} decimals={2} />);

        expect(screen.getByText('0.75')).toBeInTheDocument();
    });

    it('rundet auf die geforderten Nachkommastellen', () => {
        render(<ParameterSlider {...props} value={0.75} decimals={1} />);

        expect(screen.getByText('0.8')).toBeInTheDocument();
    });

    /**
     * Ohne `decimals` ist der Wert ganzzahlig — die Token-Regler brauchen das.
     * Wuerde hier `toFixed` greifen, stuende dort "32768.0" statt "32.768".
     */
    it('zeigt Ganzzahlen mit Tausendertrennung statt Nachkommastellen', () => {
        render(<ParameterSlider {...props} value={32768} decimals={undefined} min="2048" max="32768" step="1024" />);

        expect(screen.getByText((32768).toLocaleString())).toBeInTheDocument();
    });

    it('meldet Kommawerte als Zahl zurueck', () => {
        render(<ParameterSlider {...props} />);

        fireEvent.change(screen.getByRole('slider'), { target: { value: '1.3' } });

        expect(props.onChange).toHaveBeenCalledWith(1.3);
    });

    /**
     * Die Token-Regler erwarten eine Ganzzahl. Ginge hier parseFloat durch,
     * landete ein Kommawert im Profil und spaeter in der Anfrage an den
     * Anbieter.
     */
    it('meldet Ganzzahl-Regler ohne Nachkommastellen zurueck', () => {
        render(<ParameterSlider {...props} value={4096} decimals={undefined} min="2048" max="32768" step="1024" />);

        fireEvent.change(screen.getByRole('slider'), { target: { value: '8192' } });

        expect(props.onChange).toHaveBeenCalledWith(8192);
        expect(Number.isInteger(props.onChange.mock.calls[0][0])).toBe(true);
    });

    it('reicht Wertebereich und Schrittweite an den Regler durch', () => {
        render(<ParameterSlider {...props} />);
        const regler = screen.getByRole('slider');

        expect(regler).toHaveAttribute('min', '0.0');
        expect(regler).toHaveAttribute('max', '2.0');
        expect(regler).toHaveAttribute('step', '0.1');
    });
});
