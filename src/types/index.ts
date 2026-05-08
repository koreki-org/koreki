import { Task } from '../lib/logic';
import { Analysis } from '../lib/excel';

export interface AiStatus {
    ocrCost: number;
    correctionCost: number;
    ocrBudget: number;
    correctionBudget: number;
    ocrBrakeActive: boolean;
    correctionBrakeActive: boolean;
    message: string | null;
}

export interface Workspace {
    id: string;
    name: string;
    type: 'PERSONAL' | 'ORGANIZATION';
    credits: number;
    memberships?: any[];
    inviteCode?: string;
}

export interface DbUser {
    id: string;
    username: string;
    email?: string;
    role: string;
    hasProAccess: boolean;
    credits: number;
    totalCreditsPurchased: number;
    ocrInputTokens: number;
    ocrOutputTokens: number;
    correctionInputTokens: number;
    correctionOutputTokens: number;
    appMode: string;
    avvAccepted: boolean;
    createdAt: string;
    memberships: { workspace: Workspace, role: string }[];
    activeWorkspaceId?: string;
    activePromptProfileId?: string;
}

export interface User {
    id: string;
    logtoId: string;
    username: string;
    credits: number;
    appMode: 'STANDARD' | 'PURE' | 'TRIAL' | 'UNSET';
    avvAccepted: boolean;
    role?: 'ADMIN' | 'USER' | 'EXPERTE';
    hasProAccess?: boolean;
    activeWorkspaceId?: string;
    activePromptProfileId?: string;
    activeWorkspaceName?: string;
    activeWorkspaceType?: 'PERSONAL' | 'ORGANIZATION';
    activeMembershipRole?: 'OWNER' | 'ADMIN' | 'MEMBER';
    canEditPrompts?: boolean;
    canBuyCredits?: boolean;
    onboardingDone?: boolean;
    hasGlobalAiKey?: boolean;
}

export interface AppSettings {
    provider?: 'mistral' | 'ollama' | 'openai-compatible';
    mistralKey?: string;
    ollamaUrl?: string;
    ollamaModel?: string;
    customOllamaModel?: string;
    openaiUrl?: string;
    openaiKey?: string;
    openaiModel?: string;
    enableThinking?: boolean;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    presencePenalty?: number;
    visionTemperature?: number;
    visionTopP?: number;
    visionMaxTokens?: number;
    visionPresencePenalty?: number;
    model?: string;
    ocrCostPerMillion?: number;
    ocrInputCostPerMillion?: number;
    ocrOutputCostPerMillion?: number;
    correctionCostPerMillion?: number;
    correctionInputCostPerMillion?: number;
    correctionOutputCostPerMillion?: number;
    ocrBudget?: number;
    correctionBudget?: number;
    correctionPrompt?: string;
    activeAiProfileId?: string;
}

export interface BatchFile {
    file?: File;
    files?: File[];
    name: string;
    originalName?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    result: Analysis | null;
    error: string | null;
    grade?: string;
    documentType?: 'typed' | 'scanned' | 'unknown';
    estimatedCredits?: number;
    fileText?: string;
    ocrDone?: boolean;
    selected?: boolean;
    pageCount?: number;
    pageRange?: [number, number]; // [startPage, endPage] 1-indexed for clarity or 0-indexed for logic
    isRedacted?: boolean;
    redactedDataUrls?: string[]; // Array of Base64 strings (one per page)
    redactionRects?: Record<number, { x: number, y: number, w: number, h: number }[]>;
    hasLowConfidenceOcr?: boolean;
    tasks?: Task[];
    previewDataUrls?: string[]; // Multiple preview images for PDFs or original images
    splitInfo?: {
        originalIdx: number;
        originalName: string;
        sourceFileName?: string;
    };
    inferenceDuration?: number;
}

export interface KorekiExport {
    version: string;
    modelSolution: string;
    tasksLayout: Task[];
    batchFiles: BatchFile[];
    timestamp: string;
}

export type { Task, Analysis };

export interface AiProfile {
    id: string;
    name: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    presencePenalty: number;
    enableThinking: boolean;

    // --- Vision/OCR-Parameter ---
    visionTemperature: number;
    visionTopP: number;
    visionMaxTokens: number;
    visionPresencePenalty: number;

    userId?: string | null;
    createdAt?: string;
}
