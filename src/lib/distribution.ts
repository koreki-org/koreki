/**
 * File: src/lib/distribution.ts
 * Description: Logic for client-side feedback distribution via compressed QR codes.
 * 🏮🛡️🏛️ Zero-Knowledge / No-Server Architecture.
 */

import LZString from 'lz-string';

export interface FeedbackTask {
    id: string;
    feedback: string;
    points?: number;
    maxPoints?: number;
    status?: 'r' | 'f' | 'Ff' | string;
}

export interface FeedbackData {
    studentName: string;
    date: string;
    overallFeedback: string;
    tasks: FeedbackTask[];
    pin?: string;
    points?: number;
    maxPoints?: number;
}

/**
 * Encodes feedback data into a compressed, URL-safe string.
 */
export function encodeFeedback(data: FeedbackData): string {
    const json = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decodes a compressed string back into feedback data.
 */
export function decodeFeedback(encoded: string): FeedbackData | null {
    if (!encoded) return null;
    try {
        const json = LZString.decompressFromEncodedURIComponent(encoded);
        if (!json) return null;
        return JSON.parse(json);
    } catch (e) {
        console.error('Failed to decode feedback:', e);
        return null;
    }
}

/**
 * Parses status tags like [r], [f], [Ff] from a string.
 */
export function parseStatus(text: string): { status?: 'r' | 'f' | 'Ff'; cleanText: string } {
    if (text.includes('[r]')) return { status: 'r', cleanText: text.replace('[r]', '').trim() };
    if (text.includes('[f]')) return { status: 'f', cleanText: text.replace('[f]', '').trim() };
    if (text.includes('[Ff]')) return { status: 'Ff', cleanText: text.replace('[Ff]', '').trim() };
    return { cleanText: text };
}
