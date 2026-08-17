import { useCallback } from 'react';
import type { AppSettings, User, Task } from '@/types';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { alsAnfrageModus } from '@/lib/ai/app-mode';
import { isRateLimitError, isAbortError, toErrorMessage } from '@/lib/error-message';
import { useBatchStore } from '@/hooks/store/useBatchStore';

/**
 * Die Aufgabenstruktur aus der Musterloesung lesen.
 * 📐
 *
 * Die KI zerlegt den Text in benannte Aufgaben mit Punktzahlen — daran haengt
 * anschliessend die ganze Bewertung. Betrifft die MUSTERLOESUNG, nicht die
 * Schuelerabgaben; deshalb liegt es neben der Verarbeitungs-Pipeline und nicht
 * darin.
 */

export interface UseLayoutExtractionParams {
    userData: User | null;
    setIsLoadingModel: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useLayoutExtraction({ userData, setIsLoadingModel }: UseLayoutExtractionParams) {
    const cleanAndExtractLayout = useCallback(async (solution: string, currentSettings: AppSettings, pageCount: number = 1, isScan: boolean = false) => {
        if (!solution) return null;
        setIsLoadingModel(true);
        const controller = new AbortController();
        useBatchStore.getState().registerBatchController(controller);
        const signal = controller.signal;

        try {
            const data = await performAIRequest('clean-and-analyze', {
                modelSolution: solution,
                isInclusive: false,
                pageCount,
                isScan,
                requestId: 'model-solution' // Unique scope for model solution
            }, alsAnfrageModus(userData?.appMode), currentSettings, signal);

            if (data && Array.isArray(data.tasks)) {
                data.tasks = data.tasks.map((task: Task) => ({
                    ...task,
                    taskType: task.predictedPluginDomain === 'math' ? 'calc-trace' : 'default',
                    gradingGraph: undefined
                }));
            }

            return data;
        } catch (err) {
            if (isAbortError(err) || signal.aborted) {
                console.log("Layout extraction aborted by user");
                return null;
            }
            console.error("Layout extraction error:", err);
            throw err;
        } finally {
            setIsLoadingModel(false);
            useBatchStore.getState().clearBatchController();
        }
    }, [userData?.appMode, setIsLoadingModel]);

    return { cleanAndExtractLayout };
}
