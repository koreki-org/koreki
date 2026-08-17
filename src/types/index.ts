import { Task } from '../lib/logic';
import { Analysis } from '../lib/excel';
import type { PromptLibraryEntry, PromptMetadata } from '../lib/ai/prompt-library';
import type { GradingGraph } from '../lib/grading/types';
import type { TargetGoal, CalcTraceTemplate } from '../lib/grading/calc-trace-types';

export interface AiStatus {
    ocrCost: number;
    correctionCost: number;
    ocrBudget: number;
    correctionBudget: number;
    ocrBrakeActive: boolean;
    correctionBrakeActive: boolean;
    message: string | null;
}

/**
 * Ein selbst angelegter Bewertungs-Skill. Die Felder standen vorher nur in der
 * Index-Signatur — `skill.category` war `any`, obwohl sechsmal gelesen. Die
 * Signatur bleibt fuer Felder aus importierten Dateien.
 */
export interface CustomSkillDefinition {
    metadata?: PromptMetadata;
    promptSnippet?: string;
    prompt?: string; // aeltere Schreibweise aus importierten Dateien
    id?: string;
    name?: string;
    description?: string;
    category?: string;
    discipline?: string;
    taskText?: string; // Aufgabentext, aus dem Graph/Rechenkette erzeugt wurden
    isCustom?: boolean;
    /** Zusammen noetig bzw. sich ausschliessend. Kommagetrennt, wenn aus
     *  einem importierten Markdown-Profil. */
    requires?: string | string[];
    conflictsWith?: string | string[];
    isCalcTrace?: boolean;
    /**
     * Musterrechnung. Zwei Formen, historisch gewachsen: die Vorlage aus dem
     * Skill-Editor oder ein `TargetGoal`, das CalcTraceModal zurueckschreibt.
     * Das Modal unterscheidet an `'targetValue' in ...`.
     */
    calcTrace?: CalcTraceTemplate | TargetGoal;
    gradingGraph?: GradingGraph;
    isGraphBased?: boolean;
    targetGoal?: TargetGoal;
    [key: string]: unknown;
}

export interface WorkspaceMembership {
    id?: string;
    workspaceId?: string;
    userId?: string;
    workspace?: Workspace;
    role: string;
}

export interface Workspace {
    id: string;
    name: string;
    type: 'PERSONAL' | 'ORGANIZATION';
    credits: number;
    memberships?: WorkspaceMembership[];
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
    activeAiProfileId?: string;
    activeGradingMemoryId?: string;
    activeSkillProfileId?: string;
    activeSkillIds?: string[];
    customSkills?: Record<string, CustomSkillDefinition>;
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
    activeAiProfileId?: string;
    activeGradingMemoryId?: string;
    activeSkillProfileId?: string;
    activeSkillIds?: string[];
    customSkills?: Record<string, CustomSkillDefinition>;
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
    ollamaNumCtx?: number;
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
    activePromptProfileId?: string;
    activeGradingMemoryId?: string;
    activeSkillProfileId?: string;
    activeSkillIds?: string[];
    customSkills?: Record<string, CustomSkillDefinition>;
}

export interface BatchFile {
    file?: File;
    files?: File[];
    name: string;
    originalName?: string;
    studentFirstName?: string;
    studentLastName?: string;
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

/**
 * Ein Skill-Set — die Auswahl aktiver Bewertungs-Skills samt eigener Skills.
 *
 * Stand bisher nur als `any` in den Hooks und als nicht exportierte
 * `StoredSkillProfile` im local-profile-service. Die Gegenstuecke `AiProfile`
 * und `GradingMemory` sind hier schon lange ausgeschrieben.
 */
export interface SkillProfile {
    id: string;
    name: string;
    activeSkillIds: string[];
    customSkills?: Record<string, CustomSkillDefinition>;
    /** Vorlage aus der Registry. Wird nie veraendert, sondern kopiert. */
    isSystem?: boolean;
    userId?: string | null;
    createdAt?: string;
}

/**
 * Ein Prompt-Profil (Expertise). Das fehlende Geschwister zu [AiProfile],
 * [SkillProfile] und [GradingMemory] — die drei standen hier laengst
 * ausgeschrieben, dieses lief ueberall als `any[]` mit.
 */
export interface PromptProfile {
    id: string;
    name: string;
    correctionPrompt: string;
    /** Vorlage aus der Registry. Wird nie veraendert, sondern kopiert. */
    isSystem?: boolean;
    userId?: string | null;
    createdAt?: string;
}

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

    ollamaNumCtx?: number;

    userId?: string | null;
    createdAt?: string;
}

export interface GradingMemoryCase {
    id: string;
    studentText: string;
    taskName?: string;
    expectedCorrection: {
        pointsObtained: number;
        maxPoints?: number;
        correctionNotes: string;
        feedback?: string;
    };
}

export interface GradingMemory {
    id: string;
    name: string;
    cases: GradingMemoryCase[];
    userId?: string | null;
    createdAt?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface SecondOpinionRequestPayload {
    taskName: string;
    taskInstructions?: string;
    sampleSolution?: string;
    maxPoints: number;
    studentText: string;
    currentPoints: number;
    currentFeedback: string;
    teacherDoubt?: string;
    chatHistory?: ChatMessage[];
}

export interface SecondOpinionResponse {
    response: string;
}

export interface AITask {
    name: string;
    pointsObtained: number;
    maxPoints?: number;
    feedback?: string;
    correctionNotes?: string;
    /** Punktzahl je Bewertungskriterium. Strukturierter Kanal — die correctionNotes sind
     *  Freitext und werden von aktiven Skills überschrieben, taugen also nicht als Datenquelle. */
    criteriaScores?: { id: string; points: number }[];
    confidence?: number;
    content?: string;
    /** Set to true by parseCorrectionResult when the mathematical sandbox (CalcTrace) was bypassed
     * (e.g. AST extraction failed or produced an empty AST). The client uses this flag to render
     * a manual-review warning banner in the UI. */
    sandboxBypassed?: boolean;
}

export interface AIAnalysisResult {
    tasks: AITask[];
    overallMatchPercentage?: number;
    confidence?: number;
    expertProfile?: string;
    overallFeedback?: string;
}
