import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Slider } from '../../../src/components/ui/Slider';

/**
 * Der Regler des UI-Kits. Er schliesst die Luecke, die den Style Guide fuer
 * Schieberegler bisher unerfuellbar machte — es gab schlicht keine
 * Entsprechung in @/components/ui/.
 */
describe('Slider', () => {
    const props = {
        value: 0.7,
        onValueChange: jest.fn(),
        min: '0.0',
        max: '2.0',
        step: '0.1'
    };

    beforeEach(() => jest.clearAllMocks());

    it('reicht Wertebereich und Schrittweite durch', () => {
        render(<Slider {...props} />);
        const regler = screen.getByRole('slider');

        expect(regler).toHaveAttribute('min', '0.0');
        expect(regler).toHaveAttribute('max', '2.0');
        expect(regler).toHaveAttribute('step', '0.1');
    });

    it('meldet den gelesenen Zahlenwert, nicht das Ereignis', () => {
        render(<Slider {...props} />);

        fireEvent.change(screen.getByRole('slider'), { target: { value: '1.4' } });

        expect(props.onValueChange).toHaveBeenCalledWith(1.4);
    });

    /**
     * Der Grund, warum die Zahlenart im Kit sitzt und nicht beim Aufrufer:
     * ein Regler fuer Token-Anzahlen MUSS eine Ganzzahl liefern. Ein
     * Kommawert, der durchrutscht, landet im Profil und spaeter in der
     * Anfrage an den Anbieter.
     */
    it('liest ganzzahlig, wenn `integer` gesetzt ist', () => {
        render(<Slider {...props} value={4096} integer min="2048" max="32768" step="1024" />);

        fireEvent.change(screen.getByRole('slider'), { target: { value: '8192' } });

        expect(props.onValueChange).toHaveBeenCalledWith(8192);
        expect(Number.isInteger(props.onValueChange.mock.calls[0][0])).toBe(true);
    });

    it('schneidet Nachkommastellen ab, statt sie zu runden', () => {
        // Wichtig fuer Schrittweiten, die nicht glatt aufgehen: der Wert bleibt
        // auf dem zuletzt erreichten Schritt, statt nach oben zu springen.
        render(<Slider {...props} value={4096} integer min="2048" max="32768" step="1024" />);

        fireEvent.change(screen.getByRole('slider'), { target: { value: '8192.9' } });

        expect(props.onValueChange).toHaveBeenCalledWith(8192);
    });

    it('behaelt die eigenen Klassen und ergaenzt uebergebene', () => {
        const { container } = render(<Slider {...props} className="mt-4" />);
        const regler = container.querySelector('input[type="range"]');

        expect(regler).toHaveClass('accent-primary');
        expect(regler).toHaveClass('mt-4');
    });

    it('laesst sich deaktivieren', () => {
        render(<Slider {...props} disabled />);

        expect(screen.getByRole('slider')).toBeDisabled();
    });
});
