import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';

export interface LegalDocument {
    version: string;
    filename: string;
    content: string;
    hash: string;
}

/**
 * Discovers a legal document in src/legal/
 * If version is provided, it attempts to find that specific version.
 * If version is null/undefined, it returns the latest version.
 * Pattern: [type]_v[version].md
 */
export function getLegalDocument(type: 'avv' | 'tom' | 'betriebsanleitung'| 'agb', version?: string | null): LegalDocument | null {
    const legalDir = path.join(process.cwd(), 'src/legal');
    
    try {
        if (!fs.existsSync(legalDir)) return null;
        
        const files = fs.readdirSync(legalDir);
        
        // 1. Get all files for this type
        const filtered = files
            .filter(f => f.startsWith(`${type}_v`) && f.endsWith('.md'))
            .map(f => {
                const versionMatch = f.match(/_v([\d.]+)\.md/);
                return {
                    filename: f,
                    version: versionMatch ? versionMatch[1] : '0.0',
                };
            });

        if (filtered.length === 0) return null;

        let target: { filename: string; version: string } | undefined;

        if (version) {
            // Find specific version
            target = filtered.find(f => f.version === version);
        }

        if (!target) {
            // If No version or version not found, get latest
            filtered.sort((a, b) => {
                const partsA = a.version.split('.').map(Number);
                const partsB = b.version.split('.').map(Number);
                for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                    const valA = partsA[i] || 0;
                    const valB = partsB[i] || 0;
                    if (valA !== valB) return valB - valA;
                }
                return 0;
            });
            target = filtered[0];
        }

        const content = fs.readFileSync(path.join(legalDir, target.filename), 'utf8');
        const hash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();

        return {
            version: target.version,
            filename: target.filename,
            content,
            hash
        };
    } catch (error) {
        logger.error(`Error discovering ${type}${version ? ` (v${version})` : ''}`, error);
        return null;
    }
}

// Keeping getLatestLegalDocument for compatibility
export function getLatestLegalDocument(type: 'avv' | 'tom' | 'betriebsanleitung'| 'agb'): LegalDocument | null {
    return getLegalDocument(type);
}
