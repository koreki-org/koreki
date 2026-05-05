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
    Check: () => <div data-testid="check-icon" />
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
