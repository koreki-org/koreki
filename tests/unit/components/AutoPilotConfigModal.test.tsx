import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AutoPilotConfigModal } from '../../../src/components/upload/AutoPilotConfigModal';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Sparkles: () => <div data-testid="sparkles-icon" />,
    X: () => <div data-testid="x-icon" />,
    ShieldCheck: () => <div data-testid="shieldcheck-icon" />,
    Cpu: () => <div data-testid="cpu-icon" />
}));

// Mock Button component
jest.mock('../../../src/components/ui/Button', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    )
}));

// Mock Checkbox component
jest.mock('../../../src/components/ui/Checkbox', () => ({
    Checkbox: ({ checked, onChange, id }: any) => (
        <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => onChange({ target: { checked: e.target.checked } })}
            data-testid={id}
        />
    )
}));

describe('AutoPilotConfigModal (Unit)', () => {
    const mockTasks = [
        { name: 'Aufgabe A', maxPoints: 5, suggestGraph: true, predictedPluginDomain: 'default' },
        { name: 'Aufgabe B', maxPoints: 2, suggestGraph: true, predictedPluginDomain: 'computer-science-networking' }
    ];

    it('should initialize and sync standard and vlsm defaults correctly', () => {
        const onConfirmMock = jest.fn();
        const onCloseMock = jest.fn();

        render(
            <AutoPilotConfigModal 
                isOpen={true}
                onClose={onCloseMock}
                onConfirm={onConfirmMock}
                eligibleTaskIndices={[0, 1]}
                tasksLayout={mockTasks}
            />
        );

        // 1. Task names should be rendered
        expect(screen.getByText('Aufgabe A')).toBeInTheDocument();
        expect(screen.getByText('Aufgabe B')).toBeInTheDocument();

        // 2. Standard task (index 0) should default to MINT-Standard and Hybrid Checkbox checked (true)
        const select0 = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
        expect(select0.value).toBe('standard');
        
        const checkbox0 = screen.getByTestId('hybrid-checkbox-0') as HTMLInputElement;
        expect(checkbox0.checked).toBe(true);

        // 3. VLSM task (index 1) should default to Netzwerk (VLSM) and Hybrid Checkbox unchecked (false)
        const select1 = screen.getAllByRole('combobox')[1] as HTMLSelectElement;
        expect(select1.value).toBe('vlsm');
        
        const checkbox1 = screen.getByTestId('hybrid-checkbox-1') as HTMLInputElement;
        expect(checkbox1.checked).toBe(false);
    });

    it('should trigger dynamic sync rules when changing discipline', () => {
        const onConfirmMock = jest.fn();
        render(
            <AutoPilotConfigModal 
                isOpen={true}
                onClose={jest.fn()}
                onConfirm={onConfirmMock}
                eligibleTaskIndices={[0]}
                tasksLayout={mockTasks}
            />
        );

        const select = screen.getByRole('combobox') as HTMLSelectElement;
        const checkbox = screen.getByTestId('hybrid-checkbox-0') as HTMLInputElement;

        // Verify initial: standard -> disablePoints = true
        expect(select.value).toBe('standard');
        expect(checkbox.checked).toBe(true);

        // Change standard to vlsm
        fireEvent.change(select, { target: { value: 'vlsm' } });
        // Changing to vlsm must automatically set disablePoints = false
        expect(checkbox.checked).toBe(false);

        // Change back to standard
        fireEvent.change(select, { target: { value: 'standard' } });
        // Changing to standard must automatically set disablePoints = true
        expect(checkbox.checked).toBe(true);
    });

    it('should support manual override on hybrid grading checkbox', () => {
        const onConfirmMock = jest.fn();
        render(
            <AutoPilotConfigModal 
                isOpen={true}
                onClose={jest.fn()}
                onConfirm={onConfirmMock}
                eligibleTaskIndices={[0]}
                tasksLayout={mockTasks}
            />
        );

        const checkbox = screen.getByTestId('hybrid-checkbox-0') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);

        // Manually uncheck
        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(false);
    });

    it('should submit correct configuration map on confirm click', () => {
        const onConfirmMock = jest.fn();
        render(
            <AutoPilotConfigModal 
                isOpen={true}
                onClose={jest.fn()}
                onConfirm={onConfirmMock}
                eligibleTaskIndices={[0, 1]}
                tasksLayout={mockTasks}
            />
        );

        const confirmBtn = screen.getByText('Auto-Pilot starten');
        fireEvent.click(confirmBtn);

        expect(onConfirmMock).toHaveBeenCalledTimes(1);
        expect(onConfirmMock).toHaveBeenCalledWith({
            0: { discipline: 'standard', disablePoints: true },
            1: { discipline: 'vlsm', disablePoints: false }
        });
    });
});
