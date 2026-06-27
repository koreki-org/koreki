import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

import { BatchFile } from '../types';
import { downloadFile } from './file-utils';

const customTwMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'font-size': ['text-xxs'],
        },
    },
});

export function cn(...inputs: ClassValue[]) {
    return customTwMerge(clsx(inputs));
}

/**
 * Exports the full session to a .koreki (JSON) file.
 * Excludes large binary data (previews, raw files) to keep it lightweight.
 */
export async function exportSessionToJson(
    batchFiles: BatchFile[],
    modelSolution: string,
    tasksLayout: any[],
    metadata?: {
        activeProfileId?: string;
        activeProfileName?: string;
        activeAiProfileId?: string;
        activeAiProfileName?: string;
        activeGradingMemoryId?: string;
        activeGradingMemoryName?: string;
        activeGradingMemoryCases?: any[];
    },
    isStudentSolution: boolean = false
) {
    const exportData: any = {
        version: '2.0',
        modelSolution,
        tasksLayout,
        batchFiles,
        timestamp: new Date().toISOString(),
        metadata: metadata || {}
    };

    const data = JSON.stringify(exportData, (key, value) => {
        // Exclude large binary data/previews to keep the file small
        if (key === 'previewDataUrls' || key === 'redactedDataUrls' || key === 'redactedDataUrl' || key === 'file' || key === 'files') {
            return undefined;
        }
        return value;
    }, 2);
    
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    const filename = isStudentSolution
        ? `koreki-sl-${yyyy}-${mm}-${dd}_${hh}${min}.koreki`
        : `koreki-session-${yyyy}-${mm}-${dd}.koreki`;

    await downloadFile(data, filename, 'application/json;charset=utf-8');
}


export function isValidRedirectUrl(url: string): boolean {
    if (!url) return false;
    // Allow relative URLs
    if (url.startsWith('/') && !url.startsWith('//')) return true;

    const allowedDomains = [
        process.env.NEXT_PUBLIC_BASE_URL,
        'https://checkout.stripe.com',
    ].filter(Boolean) as string[];

    try {
        const parsedUrl = new URL(url);
        return allowedDomains.some(domain => {
            const domainUrl = new URL(domain);
            return parsedUrl.origin === domainUrl.origin;
        });
    } catch {
        return false;
    }
}
