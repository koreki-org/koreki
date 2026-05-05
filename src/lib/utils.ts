import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { BatchFile } from '../types';
import { downloadFile } from './file-utils';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Exports the full session to a .koreki (JSON) file.
 * Excludes large binary data (previews, raw files) to keep it lightweight.
 */
export async function exportSessionToJson(
    batchFiles: BatchFile[],
    modelSolution: string,
    tasksLayout: any[]
) {
    const exportData: any = {
        version: '2.0',
        modelSolution,
        tasksLayout,
        batchFiles,
        timestamp: new Date().toISOString()
    };

    const data = JSON.stringify(exportData, (key, value) => {
        // Exclude large binary data/previews to keep the file small
        if (key === 'previewDataUrls' || key === 'redactedDataUrl' || key === 'file' || key === 'files') {
            return undefined;
        }
        return value;
    }, 2);
    
    await downloadFile(data, `koreki-session-${new Date().toISOString().split('T')[0]}.koreki`, 'application/json');
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
