import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DigitalSlipsModal } from '../../../src/components/batch/DigitalSlipsModal';
import { BatchFile } from '../../../src/types';

// Mock window.print
window.print = jest.fn();

describe('DigitalSlipsModal (Layer 2)', () => {
    const mockFiles: BatchFile[] = [
        {
            name: 'Max Mustermann',
            status: 'done',
            result: {
                overallFeedback: 'Tolle Leistung',
                tasks: [
                    { name: 'A1', pointsObtained: 5, maxPoints: 5, feedback: '[r] Gut' }
                ]
            },
            error: null
        }
    ];

    test('renders correctly when open', () => {
        render(
            <DigitalSlipsModal 
                isOpen={true} 
                onClose={() => {}} 
                batchFiles={mockFiles} 
            />
        );

        expect(screen.getByText('Digitale Rückgabe-Slips')).toBeInTheDocument();
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
        expect(screen.getByText(/PIN:/)).toBeInTheDocument();
    });

    test('calls window.print when print button is clicked', () => {
        render(
            <DigitalSlipsModal 
                isOpen={true} 
                onClose={() => {}} 
                batchFiles={mockFiles} 
            />
        );

        const printButton = screen.getByText('Drucken');
        fireEvent.click(printButton);
        expect(window.print).toHaveBeenCalled();
    });

    test('generates a stable PIN for the same student name', () => {
        const { rerender } = render(
            <DigitalSlipsModal 
                isOpen={true} 
                onClose={() => {}} 
                batchFiles={mockFiles} 
            />
        );

        const firstPin = screen.getByText(/[0-9]{4}/).textContent;

        // Rerender with same data
        rerender(
            <DigitalSlipsModal 
                isOpen={true} 
                onClose={() => {}} 
                batchFiles={[...mockFiles]} 
            />
        );

        const secondPin = screen.getByText(/[0-9]{4}/).textContent;
        expect(firstPin).toBe(secondPin);
    });

    test('renders nothing when closed', () => {
        const { container } = render(
            <DigitalSlipsModal 
                isOpen={false} 
                onClose={() => {}} 
                batchFiles={mockFiles} 
            />
        );
        expect(container.firstChild).toBeNull();
    });
});
