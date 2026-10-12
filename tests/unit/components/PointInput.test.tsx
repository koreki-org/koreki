import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PointInput } from '../../../src/components/ui/PointInput';

// Mock Lucide icons to avoid rendering complexities in unit tests
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus" />,
  Minus: () => <div data-testid="minus" />,
}));

describe('PointInput Component (Layer 1)', () => {
    const defaultProps = {
        value: 2,
        onChange: jest.fn(),
        maxPoints: 5,
        showMaxPoints: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the initial value and max points correctly', () => {
        render(<PointInput {...defaultProps} />);
        const input = screen.getByRole('spinbutton') as HTMLInputElement;
        expect(input.value).toBe('2');
        expect(screen.getByText('/ 5 P')).toBeInTheDocument();
    });

    it('should call onChange with +0.5 when clicking increment', () => {
        render(<PointInput {...defaultProps} />);
        const upButton = screen.getByRole('button', { name: 'Einen halben Punkt mehr' });
        fireEvent.click(upButton!);
        expect(defaultProps.onChange).toHaveBeenCalledWith(2.5);
    });

    it('should call onChange with -0.5 when clicking decrement', () => {
        render(<PointInput {...defaultProps} />);
        const downButton = screen.getByRole('button', { name: 'Einen halben Punkt weniger' });
        fireEvent.click(downButton!);
        expect(defaultProps.onChange).toHaveBeenCalledWith(1.5);
    });

    it('should not allow values below 0 via decrement', () => {
        render(<PointInput {...defaultProps} value={0} />);
        const downButton = screen.getByRole('button', { name: 'Einen halben Punkt weniger' });
        fireEvent.click(downButton!);
        expect(defaultProps.onChange).toHaveBeenCalledWith(0);
    });

    it('should disable buttons when disabled prop is true', () => {
        render(<PointInput {...defaultProps} disabled={true} />);
        const upButton = screen.getByRole('button', { name: 'Einen halben Punkt mehr' });
        const downButton = screen.getByRole('button', { name: 'Einen halben Punkt weniger' });
        const input = screen.getByRole('spinbutton');

        expect(upButton).toBeDisabled();
        expect(downButton).toBeDisabled();
        expect(input).toBeDisabled();
    });

    it('keeps the order "minus · value · plus", then the max points', () => {
        const { container } = render(<PointInput {...defaultProps} />);
        const outer = container.firstChild as HTMLElement;
        const [control, label] = Array.from(outer.children) as HTMLElement[];

        const order = Array.from(control.children).map(c =>
            c.tagName === 'INPUT' ? 'wert' : c.getAttribute('aria-label'));
        expect(order).toEqual(['Einen halben Punkt weniger', 'wert', 'Einen halben Punkt mehr']);
        expect(label.textContent).toBe('/ 5 P');
    });
});
