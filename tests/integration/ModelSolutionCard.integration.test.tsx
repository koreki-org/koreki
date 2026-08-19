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
    Check: () => <div data-testid="check-icon" />,
    Sparkles: () => <div data-testid="sparkles-icon" />,
    Loader2: () => <div data-testid="loader2-icon" />,
    // Neutrales Schild fuer "nicht durchgerechnet" (19.08.2026) — der gruene
    // ShieldCheck steht nur noch fuer einen tatsaechlich bestandenen Dry-Run.
    Shield: () => <div data-testid="shield-icon" />,
    Layers: () => <div data-testid="layers-icon" />,
    Link2Off: () => <div data-testid="link2off-icon" />,
    AlertCircle: () => <div data-testid="alertcircle-icon" />,
    ShieldCheck: () => <div data-testid="shieldcheck-icon" />,
    ShieldAlert: () => <div data-testid="shieldalert-icon" />,
    Clock: () => <div data-testid="clock-icon" />,
    ToggleLeft: () => <div data-testid="toggleleft-icon" />,
    ToggleRight: () => <div data-testid="toggleright-icon" />,
    Download: () => <div data-testid="download-icon" />,
    ChevronDown: () => <div data-testid="chevron-down-icon" />,
    ChevronUp: () => <div data-testid="chevron-up-icon" />
}));

// Mock MathMarkdown to avoid ESM import issues with remark-gfm
jest.mock('../../src/components/ui/MathMarkdown', () => ({
    MathMarkdown: ({ content }: any) => <div data-testid="math-markdown">{content}</div>
}));

// Mock GradingGraphModal to intercept and trigger custom skill save actions in tests
jest.mock('../../src/components/batch/GradingGraphModal', () => ({
    GradingGraphModal: ({ isOpen, onSaveCustomSkill }: any) => {
        if (!isOpen) return null;
        return (
            <div data-testid="mock-grading-graph-modal">
                <button 
                    data-testid="mock-save-custom-skill-btn"
                    onClick={() => onSaveCustomSkill('Test Custom Graph Skill', { taskId: 'test-id', variables: [] })}
                >
                    Save Custom Skill
                </button>
            </div>
        );
    }
}));


// Mock UI components that might use complex shadcn/radix logic
jest.mock('../../src/components/ui/Card', () => ({
    Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <div>{children}</div>,
    // Forward className/aria-* so collapse-state assertions (aria-hidden, max-h-0) can inspect the real markup.
    CardContent: ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>,
}));

jest.mock('../../src/components/ui/Button', () => ({
    // Forward aria-*/style/title so the collapse-toggle assertions (label flip, rotation) can inspect real markup.
    Button: ({ children, onClick, className, disabled, ...rest }: any) => (
        <button onClick={onClick} className={className} disabled={disabled} {...rest}>{children}</button>
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
        const textarea = screen.getByPlaceholderText('Musterlösung hier eingeben...');
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
        const textarea = screen.getByPlaceholderText('Musterlösung hier eingeben...');
        fireEvent.change(textarea, { target: { value: 'Updated' } });

        // 3. Switch back to view
        fireEvent.click(screen.getByTestId('eye-icon').closest('button')!);

        // 4. Value should still be in the DOM (rendered)
        expect(screen.getByText('Updated')).toBeInTheDocument();
    });

    it('should save custom skills under the graph-skills category', async () => {
        render(<TestWrapper initialModelSolution="Initial" initialTasks={[{ name: 'Task', maxPoints: 5, gradingGraph: { taskId: 'task-1', variables: [] } }]} />);

        // 1. Click the sparkles button to open the graph modal
        const sparklesBtn = screen.getByTestId('sparkles-icon').closest('button');
        fireEvent.click(sparklesBtn!);

        // 2. Verify mock modal is rendered and click save custom skill
        expect(screen.getByTestId('mock-grading-graph-modal')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('mock-save-custom-skill-btn'));

        // 3. Check localStorage or store to verify category is 'graph-skills'
        const stored = localStorage.getItem('koreki_custom_skills');
        expect(stored).toBeDefined();
        const customSkills = JSON.parse(stored!);
        const skillId = Object.keys(customSkills).find(key => customSkills[key].name === 'Test Custom Graph Skill');
        expect(skillId).toBeDefined();
        expect(customSkills[skillId!].category).toBe('graph-skills');
        expect(customSkills[skillId!].isGraphBased).toBe(true);
    });
});

describe('ModelSolutionCard Collapse Behavior (Auto-Collapse Feature)', () => {
    const CollapseWrapper = () => {
        const [collapsed, setCollapsed] = React.useState(true);
        return (
            <ModelSolutionCard
                modelSolution="Musterlösungstext"
                tasksLayout={[{ name: 'Aufgabe 1', maxPoints: 5, content: 'Musterlösungstext' }]}
                extractingLayout={false}
                onModelUpload={jest.fn()}
                onModelSolutionChange={jest.fn()}
                onTasksChange={jest.fn()}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed((c) => !c)}
            />
        );
    };

    it('renders without collapse props with safe defaults (no chevron, content visible)', () => {
        render(
            <ModelSolutionCard
                modelSolution="Musterlösungstext"
                tasksLayout={[{ name: 'Aufgabe 1', maxPoints: 5, content: 'Musterlösungstext' }]}
                extractingLayout={false}
                onModelUpload={jest.fn()}
                onModelSolutionChange={jest.fn()}
                onTasksChange={jest.fn()}
            />
        );

        // No onToggleCollapse -> no chevron rendered at all
        expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('chevron-up-icon')).not.toBeInTheDocument();

        // Content must not be aria-hidden by default
        expect(document.querySelectorAll('[aria-hidden="true"]').length).toBe(0);
    });

    it('hides the content while collapsed and reveals it again via the chevron toggle', () => {
        render(<CollapseWrapper />);

        // Collapsed initially: content wrapper is aria-hidden, chevron button reads "ausklappen"
        expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
        const chevronBtn = screen.getByTestId('chevron-down-icon').closest('button');
        expect(chevronBtn).toBeInTheDocument();
        expect(chevronBtn).toHaveAttribute('aria-label', expect.stringContaining('ausklappen'));
        expect(chevronBtn).toHaveAttribute('aria-expanded', 'false');

        // Click chevron -> parent flips `collapsed` to false
        fireEvent.click(chevronBtn!);

        // Expanded: no aria-hidden content anymore, same chevron icon rotates and label flips to "einklappen"
        expect(document.querySelectorAll('[aria-hidden="true"]').length).toBe(0);
        expect(chevronBtn).toHaveAttribute('aria-label', expect.stringContaining('einklappen'));
        expect(chevronBtn).toHaveAttribute('aria-expanded', 'true');
    });
});
