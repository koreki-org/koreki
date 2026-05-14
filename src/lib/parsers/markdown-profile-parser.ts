/**
 * Industrial Markdown Profile Parser (KEP-MD-1)
 * 🏮🛡️🏛️
 * Parses Koreki Exchange Profile Markdown format.
 * No external dependencies, strictly resilient.
 */

export interface ParsedProfile {
    metadata: Record<string, any>;
    correctionPrompt: string;
}

export function parseMarkdownProfile(content: string): ParsedProfile {
    // Resilience: Trim leading whitespace before matching
    const trimmed = content.trimStart();
    const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    
    if (!match) {
        // Fallback: No metadata found, treat entire file as prompt
        return {
            metadata: { name: "Importierter Prompt" },
            correctionPrompt: content.trim()
        };
    }
    
    const yamlBlock = match[1];
    const promptContent = match[2].trim();
    
    // Key-Value Parser for YAML Frontmatter
    const metadata: Record<string, any> = {};
    yamlBlock.split(/\r?\n/).forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
            const key = line.slice(0, colonIdx).trim();
            let val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            
            // Automatic type conversion
            if (val === 'true') metadata[key] = true;
            else if (val === 'false') metadata[key] = false;
            else if (val !== '' && !isNaN(Number(val))) metadata[key] = Number(val);
            // Array parsing like ["Physik", "Sek II"]
            else if (val.startsWith('[') && val.endsWith(']')) {
                try {
                    metadata[key] = JSON.parse(val.replace(/'/g, '"'));
                } catch {
                    metadata[key] = val; // fallback to raw string if parsing fails
                }
            } else {
                metadata[key] = val;
            }
        }
    });
    
    return {
        metadata,
        correctionPrompt: promptContent
    };
}
