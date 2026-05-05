import { create } from 'zustand';
import { BatchFile } from '../../types';

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
}));
