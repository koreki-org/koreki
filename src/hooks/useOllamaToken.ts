import { useEffect, useState } from 'react';
import { isDesktopTarget } from '@/lib/env-context';

/**
 * Industrial Hook for AI Token Streaming (Desktop Only)
 * 🏮🛡️🏛️
 * Scoped to requestId to prevent cross-talk in multi-batch processing.
 */
export function useOllamaToken(isActive: boolean, requestId: string | number) {
    const [streamedText, setStreamedText] = useState('');
    const eventName = `ollama-token-${requestId}`;

    useEffect(() => {
        if (!isActive || !isDesktopTarget()) {
            setStreamedText('');
            return;
        }

        let unlisten: (() => void) | null = null;

        async function setupListener() {
            try {
                const { listen } = await import('@tauri-apps/api/event');
                unlisten = await listen<string>(eventName, (event) => {
                    const rawLine = event.payload;
                    try {
                        const json = JSON.parse(rawLine);
                        const content = json.message?.content || '';
                        if (content) {
                            setStreamedText(prev => prev + content);
                        }
                    } catch (e) {
                        // Skip malformed chunks
                    }
                });
            } catch (e) {
                console.error(`Failed to setup Ollama token listener for ${eventName}:`, e);
            }
        }

        setupListener();

        return () => {
            if (unlisten) unlisten();
        };
    }, [isActive, eventName]);

    return { 
        streamedText,
        resetStream: () => setStreamedText('')
    };
}
