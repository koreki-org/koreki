import { create } from 'zustand';
import { BatchFile } from '../../types';
import type { ProtokollEintrag } from '../../lib/ai-protocol';

type Setter<T> = (val: T | ((prev: T) => T)) => void;

interface BatchStateStore {
    batchFiles: BatchFile[];
    setBatchFiles: Setter<BatchFile[]>;
    
    isImportedSession: boolean;
    setIsImportedSession: Setter<boolean>;
    
    currentProcessingIndex: number;
    setCurrentProcessingIndex: Setter<number>;
    
    isLoadingModel: boolean;
    setIsLoadingModel: Setter<boolean>;
    
    isLoadingBatch: boolean;
    setIsLoadingBatch: Setter<boolean>;
    
    pdfTypeQueue: { idx: number, fileName: string }[];
    setPdfTypeQueue: Setter<{ idx: number, fileName: string }[]>;
    
    splitIdx: number | null;
    setSplitIdx: Setter<number | null>;
    
    redactIdx: number | null;
    setRedactIdx: Setter<number | null>;
    
    ocrStrategy: 'standard' | 'handwriting';
    setOcrStrategy: Setter<'standard' | 'handwriting'>;
    
    /** Anhaengendes Protokoll der KI-Laeufe (Art. 12 KI-VO). Wird nie geaendert,
     *  nur ergaenzt — siehe lib/ai-protocol.ts. */
    protokoll: ProtokollEintrag[];
    protokollAnhaengen: (eintraege: ProtokollEintrag[]) => void;
    /** Beim Laden einer Sitzung: das Protokoll gehoert zu DIESEN Arbeiten.
     *  Anhaengen wuerde Eintraege mit fremder Schuelernummerierung mischen. */
    protokollErsetzen: (eintraege: ProtokollEintrag[]) => void;

    activeBatchController: AbortController | null;
    registerBatchController: (controller: AbortController) => void;
    abortBatch: () => void;
    clearBatchController: () => void;
}

// Helper to create React-style setter functions for Zustand
const createSetter = <K extends keyof BatchStateStore>(set: any, key: K) => 
    (val: any) => set((state: any) => ({
        [key]: typeof val === 'function' ? val(state[key]) : val
    }));

export const useBatchStore = create<BatchStateStore>((set) => ({
    batchFiles: [],
    setBatchFiles: createSetter(set, 'batchFiles'),
    
    isImportedSession: false,
    setIsImportedSession: createSetter(set, 'isImportedSession'),
    
    currentProcessingIndex: -1,
    setCurrentProcessingIndex: createSetter(set, 'currentProcessingIndex'),
    
    isLoadingModel: false,
    setIsLoadingModel: createSetter(set, 'isLoadingModel'),
    
    isLoadingBatch: false,
    setIsLoadingBatch: createSetter(set, 'isLoadingBatch'),
    
    pdfTypeQueue: [],
    setPdfTypeQueue: createSetter(set, 'pdfTypeQueue'),
    
    splitIdx: null,
    setSplitIdx: createSetter(set, 'splitIdx'),
    
    redactIdx: null,
    setRedactIdx: createSetter(set, 'redactIdx'),
    
    ocrStrategy: 'standard',
    setOcrStrategy: createSetter(set, 'ocrStrategy'),

    protokoll: [],
    protokollAnhaengen: (eintraege) => set((state) => ({ protokoll: [...state.protokoll, ...eintraege] })),
    protokollErsetzen: (eintraege) => set({ protokoll: eintraege }),

    activeBatchController: null,
    registerBatchController: (controller) => set({ activeBatchController: controller }),
    abortBatch: () => set((state) => {
        if (state.activeBatchController) {
            state.activeBatchController.abort();
        }
        return { activeBatchController: null };
    }),
    clearBatchController: () => set({ activeBatchController: null }),
}));
