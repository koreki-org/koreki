import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MathMarkdown, formatSquashedTables } from '../../../src/components/ui/MathMarkdown';

// Mock needed libraries that might fail in JSDOM
jest.mock('react-markdown', () => (props: any) => <div data-testid="markdown">{props.children}</div>);
jest.mock('remark-math', () => ({}));
jest.mock('remark-gfm', () => ({}));
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

    describe('formatSquashedTables Utility', () => {
        it('should leave normal non-table text completely untouched', () => {
            const input = "Standard text with some | characters but no alignment row.";
            expect(formatSquashedTables(input)).toBe(input);
        });

        it('should leave already properly formatted tables untouched', () => {
            const input = "| Col A | Col B |\n| --- | --- |\n| Val 1 | Val 2 |";
            expect(formatSquashedTables(input)).toBe(input);
        });

        it('should reconstruct a squashed single-line table into a formatted multi-line markdown table', () => {
            const squashed = "| Bereich | Anzahl Adressen | Netzadresse | Netzmaske | Erste IP | Gateway | Broadcast | | --- | --- | --- | --- | --- | --- | --- | | Messebesucher | 500 | 172.16.0.0 | /22 | 172.16.0.1 | 172.16.3.254 | 172.16.3.255 | | Aussteller | 100 | 172.16.4.0 | /25 | 172.16.4.1 | 172.16.4.126 | 172.16.4.127 |";
            const formatted = formatSquashedTables(squashed);
            
            // Should contain newlines
            expect(formatted).toContain('\n');
            
            const rows = formatted.split('\n');
            expect(rows.length).toBe(4); // Header, Alignment, Row 1, Row 2
            
            expect(rows[0]).toBe("| Bereich | Anzahl Adressen | Netzadresse | Netzmaske | Erste IP | Gateway | Broadcast |");
            expect(rows[1]).toBe("| --- | --- | --- | --- | --- | --- | --- |");
            expect(rows[2]).toBe("| Messebesucher | 500 | 172.16.0.0 | /22 | 172.16.0.1 | 172.16.3.254 | 172.16.3.255 |");
            expect(rows[3]).toBe("| Aussteller | 100 | 172.16.4.0 | /25 | 172.16.4.1 | 172.16.4.126 | 172.16.4.127 |");
        });
    });
});
