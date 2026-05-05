import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PointInput } from '../../../src/components/ui/PointInput';

// Mock Lucide icons to avoid rendering complexities in unit tests
jest.mock('lucide-react', () => ({
  ChevronUp: () => <div data-testid="chevron-up" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
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
        const upButton = screen.getByTestId('chevron-up').parentElement;
        fireEvent.click(upButton!);
        expect(defaultProps.onChange).toHaveBeenCalledWith(2.5);
    });

    it('should call onChange with -0.5 when clicking decrement', () => {
        render(<PointInput {...defaultProps} />);
        const downButton = screen.getByTestId('chevron-down').parentElement;
        fireEvent.click(downButton!);
        expect(defaultProps.onChange).toHaveBeenCalledWith(1.5);
    });

    it('should not allow values below 0 via decrement', () => {
        render(<PointInput {...defaultProps} value={0} />);
        const downButton = screen.getByTestId('chevron-down').parentElement;
        fireEvent.click(downButton!);
        expect(defaultProps.onChange).toHaveBeenCalledWith(0);
    });

    it('should disable buttons when disabled prop is true', () => {
        render(<PointInput {...defaultProps} disabled={true} />);
        const upButton = screen.getByTestId('chevron-up').parentElement;
        const downButton = screen.getByTestId('chevron-down').parentElement;
        const input = screen.getByRole('spinbutton');

        expect(upButton).toBeDisabled();
        expect(downButton).toBeDisabled();
        expect(input).toBeDisabled();
    });

    it('should maintain the "arrows behind number" layout order', () => {
        const { container } = render(<PointInput {...defaultProps} />);
        const parent = container.firstChild as HTMLElement;
        const children = Array.from(parent.children);
        
        // Expected DOM Order: 
        // 1. Group containing Input + Buttons (order-1)
        // 2. Span (Label) (order-2)
        
        // Inside the Group (order-1):
        // 1. Input
        // 2. Buttons Div
        
        const group = children.find(c => c.classList.contains('order-1')) as HTMLElement;
        const span = children.find(c => c.classList.contains('order-2'));
        
        expect(group).toBeTruthy();
        expect(span).toBeTruthy();
        
        const groupChildren = Array.from(group.children);
        const inputIdx = groupChildren.findIndex(c => c.tagName === 'INPUT');
        const buttonsIdx = groupChildren.findIndex(c => c.classList.contains('flex-col'));
        
        expect(inputIdx).toBeLessThan(buttonsIdx);
    });
});
