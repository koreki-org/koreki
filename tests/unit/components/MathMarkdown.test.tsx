import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MathMarkdown } from '../../../src/components/ui/MathMarkdown';

// Mock needed libraries that might fail in JSDOM
jest.mock('react-markdown', () => (props: any) => <div data-testid="markdown">{props.children}</div>);
jest.mock('remark-math', () => ({}));
jest.mock('rehype-katex', () => ({}));
jest.mock('rehype-raw', () => ({}));

describe('MathMarkdown Component (Layer 1)', () => {
    it('should render standard text correctly', () => {
        const content = "Hello World";
        render(<MathMarkdown content={content} />);
        expect(screen.getByTestId('markdown')).toHaveTextContent('Hello World');
    });

    it('should wrap OCR uncertainty (?) in a highlight span', () => {
        const content = "Unsicher (?) Wort und Wort(?)";
        render(<MathMarkdown content={content} />);
        
        const markdownContainer = screen.getByTestId('markdown');
        expect(markdownContainer.innerHTML).toContain('bg-orange-100');
        expect(markdownContainer.innerHTML).toContain('animate-pulse');
        expect(markdownContainer.innerHTML).toContain('Unsicher (?)');
        expect(markdownContainer.innerHTML).toContain('Wort(?)');
    });

    it('should handle multi-line content correctly', () => {
        const content = "Line 1\nLine 2";
        render(<MathMarkdown content={content} />);
        expect(screen.getByTestId('markdown')).toHaveTextContent(/Line 1\s+Line 2/); 
    });
});
