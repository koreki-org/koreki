import { getLatestLegalDocument } from '../lib/legal';

/**
 * Koreki Industrial Legal Registry ⚖️🛡️
 * Central configuration for all legal documents and their versions.
 * Refactored to dynamically discover documents from /src/legal/
 */

export interface LegalDocumentVersion {
    version: string;
    path: string;
    content: string;
    hash: string;
    effectiveDate: string;
    active: boolean;
    description: string;
}

/**
 * Utility to get the current AVV metadata dynamically
 */
export const getCurrentAVV = (): LegalDocumentVersion | null => {
    const doc = getLatestLegalDocument('avv');
    if (!doc) return null;

    return {
        version: doc.version,
        path: `/src/legal/${doc.filename}`,
        content: doc.content,
        hash: doc.hash,
        effectiveDate: new Date().toISOString().split('T')[0], // Fallback or extracted from content
        active: true,
        description: `Koreki AVV v${doc.version} (Dynamically discovered)`
    };
};

export const CURRENT_AVV_VERSION = getCurrentAVV()?.version || '0.0';

/**
 * Utility to get a specific AVV version (Future enhancement: implement lookup if needed)
 */
export const getAVVByVersion = (version: string) => {
    return getCurrentAVV(); // For now, return latest
};
