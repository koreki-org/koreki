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
            if (next.openaiUrl) localStorage.setItem('koreki_openai_url', next.openaiUrl);
            if (next.openaiModel) localStorage.setItem('koreki_openai_model', next.openaiModel);
            if (next.enableThinking !== undefined) localStorage.setItem('koreki_openai_thinking', String(next.enableThinking));
            if (next.temperature !== undefined) localStorage.setItem('koreki_openai_temperature', String(next.temperature));
            if (next.topP !== undefined) localStorage.setItem('koreki_openai_topp', String(next.topP));
            if (next.maxTokens !== undefined) localStorage.setItem('koreki_openai_maxtokens', String(next.maxTokens));
            if (next.presencePenalty !== undefined) localStorage.setItem('koreki_openai_presencepenalty', String(next.presencePenalty));
            if (next.visionTemperature !== undefined) localStorage.setItem('koreki_openai_vision_temperature', String(next.visionTemperature));
            if (next.visionTopP !== undefined) localStorage.setItem('koreki_openai_vision_topp', String(next.visionTopP));
            if (next.visionMaxTokens !== undefined) localStorage.setItem('koreki_openai_vision_maxtokens', String(next.visionMaxTokens));
            if (next.visionPresencePenalty !== undefined) localStorage.setItem('koreki_openai_vision_presencepenalty', String(next.visionPresencePenalty));
            
            if (next.activeAiProfileId !== undefined) {
                if (next.activeAiProfileId) {
                    localStorage.setItem('koreki_active_ai_profile_id', next.activeAiProfileId);
                } else {
                    localStorage.removeItem('koreki_active_ai_profile_id');
                }
            }
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
                if (url && url.includes('http') && url.lastIndexOf('http') > 0) {
                    url = url.substring(0, url.indexOf('http', 1)).trim();
                    localStorage.setItem('koreki_ollama_url', url);
                }
 
                let model = localStorage.getItem('koreki_ollama_model') || undefined;
                let customModel = localStorage.getItem('koreki_ollama_custom_model') || undefined;
                const openaiUrl = localStorage.getItem('koreki_openai_url') || undefined;
                const openaiModel = localStorage.getItem('koreki_openai_model') || undefined;
                const enableThinking = localStorage.getItem('koreki_openai_thinking') !== 'false';
                
                const temperature = localStorage.getItem('koreki_openai_temperature') ? Number(localStorage.getItem('koreki_openai_temperature')) : undefined;
                const topP = localStorage.getItem('koreki_openai_topp') ? Number(localStorage.getItem('koreki_openai_topp')) : undefined;
                const maxTokens = localStorage.getItem('koreki_openai_maxtokens') ? Number(localStorage.getItem('koreki_openai_maxtokens')) : undefined;
                const presencePenalty = localStorage.getItem('koreki_openai_presencepenalty') ? Number(localStorage.getItem('koreki_openai_presencepenalty')) : undefined;
                
                const visionTemperature = localStorage.getItem('koreki_openai_vision_temperature') ? Number(localStorage.getItem('koreki_openai_vision_temperature')) : undefined;
                const visionTopP = localStorage.getItem('koreki_openai_vision_topp') ? Number(localStorage.getItem('koreki_openai_vision_topp')) : undefined;
                const visionMaxTokens = localStorage.getItem('koreki_openai_vision_maxtokens') ? Number(localStorage.getItem('koreki_openai_vision_maxtokens')) : undefined;
                const visionPresencePenalty = localStorage.getItem('koreki_openai_vision_presencepenalty') ? Number(localStorage.getItem('koreki_openai_vision_presencepenalty')) : undefined;
                const activeAiProfileId = localStorage.getItem('koreki_active_ai_profile_id') || undefined;
 
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
                        customOllamaModel: customModel,
                        openaiUrl: openaiUrl,
                        openaiModel: openaiModel,
                        enableThinking: enableThinking,
                        temperature: temperature,
                        topP: topP,
                        maxTokens: maxTokens,
                        presencePenalty: presencePenalty,
                        visionTemperature: visionTemperature,
                        visionTopP: visionTopP,
                        visionMaxTokens: visionMaxTokens,
                        visionPresencePenalty: visionPresencePenalty,
                        activeAiProfileId: activeAiProfileId
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
