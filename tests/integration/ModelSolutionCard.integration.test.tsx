import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelSolutionCard } from '../../src/components/upload/ModelSolutionCard';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    FileText: () => <div data-testid="file-text" />,
    FileUp: () => <div data-testid="file-up" />,
    HelpCircle: () => <div data-testid="help-circle" />,
    RefreshCw: () => <div data-testid="refresh-cw" />,
    Pencil: () => <div data-testid="pencil-icon" />,
    Eye: () => <div data-testid="eye-icon" />,
    PlusCircle: () => <div data-testid="plus-circle" />,
    Trash2: () => <div data-testid="trash-icon" />,
    Check: () => <div data-testid="check-icon" />
}));

// Mock UI components that might use complex shadcn/radix logic
jest.mock('../../src/components/ui/Card', () => ({
    Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../src/components/ui/Button', () => ({
    Button: ({ children, onClick, className, disabled }: any) => (
        <button onClick={onClick} className={className} disabled={disabled}>{children}</button>
    ),
}));

jest.mock('../../src/components/ui/Badge', () => ({
    Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('../../src/components/ui/Textarea', () => ({
    Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock('../../src/components/ui/PointInput', () => ({
    PointInput: () => <div data-testid="point-input" />,
}));

describe('ModelSolutionCard Integration (Layer 2)', () => {
    const TestWrapper = ({ initialModelSolution, initialTasks }: any) => {
        const [modelSolution, setModelSolution] = React.useState(initialModelSolution);
        const [tasks, setTasks] = React.useState(initialTasks);
        
        return (
            <ModelSolutionCard 
                modelSolution={modelSolution}
                tasksLayout={tasks}
                extractingLayout={false}
                onModelUpload={jest.fn()}
                onModelSolutionChange={setModelSolution}
                onTasksChange={setTasks}
            />
        );
    };

    it('should propagate text changes from EditableMathArea back to ModelSolutionCard state', () => {
        render(<TestWrapper initialModelSolution="SectionContent: 1+1=2" initialTasks={[{ name: 'UniqueTaskName', content: 'SectionContent: 1+1=2', maxPoints: 5 }]} />);

        // 1. Find the task section (Badge) - using getAllByText as it might appear in multiple places
        const taskBadges = screen.getAllByText('UniqueTaskName');
        expect(taskBadges[0]).toBeInTheDocument();

        // 2. Switch EditableMathArea to Edit Mode
        const pencil = screen.getByTestId('pencil-icon').closest('button');
        fireEvent.click(pencil!);

        // 3. Type in the Textarea
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Aufgabe 1: New LaTeX $x^2$' } });

        // 4. Switch back to view mode to see the update
        fireEvent.click(screen.getByTestId('eye-icon').closest('button')!);

        // 5. Verifying that the change is rendered
        expect(screen.getByText('Aufgabe 1: New LaTeX $x^2$')).toBeInTheDocument();
    });

    it('should maintain content when toggling preview', () => {
        render(<TestWrapper initialModelSolution="Initial" initialTasks={[{ name: 'Task', maxPoints: 5 }]} />);

        // 1. Switch to edit
        fireEvent.click(screen.getByTestId('pencil-icon').closest('button')!);
        
        // 2. Change text
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Updated' } });

        // 3. Switch back to view
        fireEvent.click(screen.getByTestId('eye-icon').closest('button')!);

        // 4. Value should still be in the DOM (rendered)
        expect(screen.getByText('Updated')).toBeInTheDocument();
    });
});
