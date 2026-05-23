/**
 * Koreki Prompt Library Utility
 * 🏮🛡️🏛️
 * Handles parsing of Markdown files with YAML Frontmatter for Identities and Skills.
 * Zero-Dependency approach for maximum performance and PURE mode compatibility.
 */

export interface PromptMetadata {
    id: string;
    name: string;
    description?: string;
    category?: string;
    isSystem?: boolean;
    [key: string]: any;
}

export interface PromptLibraryEntry {
    metadata: PromptMetadata;
    promptSnippet: string;
}

/**
 * Simple and robust Frontmatter parser.
 * Extracts YAML-like key-value pairs between triple dashes (---).
 */
export function parsePromptFile(raw: string): PromptLibraryEntry {
    const lines = raw.split('\n');
    const metadata: PromptMetadata = { id: 'unknown', name: 'Unknown' };
    let promptSnippet = '';
    let isFrontmatter = false;
    let frontmatterDone = false;

    if (lines[0]?.trim() === '---') {
        isFrontmatter = true;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '---') {
                isFrontmatter = false;
                frontmatterDone = true;
                promptSnippet = lines.slice(i + 1).join('\n').trim();
                break;
            }
            
            // Simple Key: Value parsing
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                
                // Type conversion for booleans
                if (value === 'true') (metadata as any)[key] = true;
                else if (value === 'false') (metadata as any)[key] = false;
                else metadata[key] = value;
            }
        }
    }

    if (!frontmatterDone) {
        promptSnippet = raw.trim();
    }

    return { metadata, promptSnippet };
}

/**
 * Splits a skill prompt snippet into correction and extraction guidelines.
 * Seeks for `### EXTRAKTIONSRICHTLINIEN` (case-insensitive) to perform the boundary split.
 */
export function splitSkillSnippet(snippet: string): { correctionSnippet: string; extractionSnippet: string } {
    const delimiterRegex = /###\s*EXTRAKTIONSRICHTLINIEN/i;
    const match = snippet.match(delimiterRegex);
    if (match && match.index !== undefined) {
        const index = match.index;
        const correctionSnippet = snippet.substring(0, index).trim();
        const extractionSnippet = snippet.substring(index).trim();
        return { correctionSnippet, extractionSnippet };
    }
    return { correctionSnippet: snippet, extractionSnippet: '' };
}

