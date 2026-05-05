import { create } from 'zustand';
import { Task, AppSettings } from '../../types';
import { isLocalInstance } from '../../lib/env-context';
import { vaultService } from '@/lib/ai/vault-service';

type Setter<T> = (val: T | ((prev: T) => T)) => void;

interface DashboardStateStore {
    modelSolution: string;
    setModelSolution: Setter<string>;
    
    tasksLayout: Task[];
    setTasksLayout: Setter<Task[]>;
    
    aiSettings: AppSettings;
    isHydrated: boolean;
    setAiSettings: (val: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
    hydrateAiSettings: () => void;
    
    upgrading: boolean;
    setUpgrading: Setter<boolean>;
    
    pendingModelFile: File | null;
    setPendingModelFile: Setter<File | null>;

    modelSolutionPageCount: number;
    setModelSolutionPageCount: Setter<number>;
}

const createSetter = <K extends keyof DashboardStateStore>(set: any, key: K) => 
    (val: any) => set((state: any) => ({
        [key]: typeof val === 'function' ? val(state[key]) : val
    }));

export const useDashboardStore = create<DashboardStateStore>((set, get) => ({
    modelSolution: '',
    setModelSolution: createSetter(set, 'modelSolution'),
    
    tasksLayout: [],
    setTasksLayout: createSetter(set, 'tasksLayout'),
    
    aiSettings: {
        provider: 'mistral',
        mistralKey: ''
    },
    isHydrated: false,
    setAiSettings: (val: any) => set((state: any) => {
        const next = typeof val === 'function' ? val(state.aiSettings) : val;
        
        // Atomic Persistence Layer (Desktop only)
        // SECURITY: Sensitive keys (mistralKey, openaiKey) are NOT saved to localStorage.
        // They are handled by vaultService in the components.
        if (typeof window !== 'undefined' && isLocalInstance()) {
            if (next.provider) localStorage.setItem('koreki_desktop_provider', next.provider);
            if (next.ollamaUrl) localStorage.setItem('koreki_ollama_url', next.ollamaUrl);
            if (next.ollamaModel) localStorage.setItem('koreki_ollama_model', next.ollamaModel);
            if (next.customOllamaModel) localStorage.setItem('koreki_ollama_custom_model', next.customOllamaModel);
        }
        
        return { aiSettings: next };
    }),
    
    hydrateAiSettings: async () => {
        if (typeof window === 'undefined') return;
        if (get().isHydrated) return;
        
        const isDesktop = isLocalInstance();
        if (isDesktop) {
            const savedProvider = localStorage.getItem('koreki_desktop_provider') as any;
            if (savedProvider) {
                // SECURITY: Load sensitive keys from Vault, not localStorage
                const mistralKey = await vaultService.getSecret('koreki-mistral-key');
                const openaiKey = await vaultService.getSecret('koreki-openai-key');

                let url = localStorage.getItem('koreki_ollama_url') || undefined;
                // ... (rest of the logic remains same)
                if (url && url.includes('http') && url.lastIndexOf('http') > 0) {
                    url = url.substring(0, url.indexOf('http', 1)).trim();
                    localStorage.setItem('koreki_ollama_url', url);
                }

                let model = localStorage.getItem('koreki_ollama_model') || undefined;
                let customModel = localStorage.getItem('koreki_ollama_custom_model') || undefined;

                const garbage = (val: string | undefined) => val && (val.includes('cutest') || val.length > 50);
                if (garbage(model)) {
                    model = undefined;
                    localStorage.removeItem('koreki_ollama_model');
                }
                if (garbage(customModel)) {
                    customModel = undefined;
                    localStorage.removeItem('koreki_ollama_custom_model');
                }
                
                set((state) => ({
                    isHydrated: true,
                    aiSettings: {
                        ...state.aiSettings,
                        provider: savedProvider,
                        mistralKey: mistralKey,
                        openaiKey: openaiKey,
                        ollamaUrl: url,
                        ollamaModel: model,
                        customOllamaModel: customModel
                    }
                }));
            } else {
                set({ isHydrated: true });
            }
        } else {
            set({ isHydrated: true });
        }
    },
    
    upgrading: false,
    setUpgrading: createSetter(set, 'upgrading'),
    
    pendingModelFile: null,
    setPendingModelFile: createSetter(set, 'pendingModelFile'),

    modelSolutionPageCount: 1,
    setModelSolutionPageCount: createSetter(set, 'modelSolutionPageCount'),
}));
