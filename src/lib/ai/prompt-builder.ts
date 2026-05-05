import { Task } from '../../types';

// Centralized Default Templates
import correctionSystemDefault from '../../prompts/default/correction/system.md';
import correctionUserDefault from '../../prompts/default/correction/user.md';

import analyzeCleanSystemDefault from '../../prompts/default/analyze-and-clean/system.md';
import analyzeCleanUserDefault from '../../prompts/default/analyze-and-clean/user.md';

import analyzeMapSystemDefault from '../../prompts/default/analyze-and-map/system.md';
import analyzeMapUserDefault from '../../prompts/default/analyze-and-map/user.md';

import visionSystemDefault from '../../prompts/default/vision/system.md';
import visionUserDefault from '../../prompts/default/vision/user.md';

// Specialized Gemma4 Templates
import gemma4CorrectionSystem from '../../prompts/specialized/gemma4/correction/system.md';
import gemma4CorrectionUser from '../../prompts/specialized/gemma4/correction/user.md';
import gemma4AnalyzeCleanSystem from '../../prompts/specialized/gemma4/analyze-and-clean/system.md';
import gemma4AnalyzeCleanUser from '../../prompts/specialized/gemma4/analyze-and-clean/user.md';
import gemma4AnalyzeMapSystem from '../../prompts/specialized/gemma4/analyze-and-map/system.md';
import gemma4AnalyzeMapUser from '../../prompts/specialized/gemma4/analyze-and-map/user.md';

// Specialized Qwen 3.6 Templates
import qwenCorrectionSystem from '../../prompts/specialized/qwen3.6/correction/system.md';
import qwenCorrectionUser from '../../prompts/specialized/qwen3.6/correction/user.md';
import qwenAnalyzeCleanSystem from '../../prompts/specialized/qwen3.6/analyze-and-clean/system.md';
import qwenAnalyzeCleanUser from '../../prompts/specialized/qwen3.6/analyze-and-clean/user.md';
import qwenAnalyzeMapSystem from '../../prompts/specialized/qwen3.6/analyze-and-map/system.md';
import qwenAnalyzeMapUser from '../../prompts/specialized/qwen3.6/analyze-and-map/user.md';
import qwenVisionSystem from '../../prompts/specialized/qwen3.6/vision/system.md';
import qwenVisionUser from '../../prompts/specialized/qwen3.6/vision/user.md';

// Specialized Mistral-Small Templates
import mistralSmallCorrectionSystem from '../../prompts/specialized/mistral-small/correction/system.md';
import mistralSmallCorrectionUser from '../../prompts/specialized/mistral-small/correction/user.md';
import mistralSmallAnalyzeCleanSystem from '../../prompts/specialized/mistral-small/analyze-and-clean/system.md';
import mistralSmallAnalyzeCleanUser from '../../prompts/specialized/mistral-small/analyze-and-clean/user.md';
import mistralSmallAnalyzeMapSystem from '../../prompts/specialized/mistral-small/analyze-and-map/system.md';
import mistralSmallAnalyzeMapUser from '../../prompts/specialized/mistral-small/analyze-and-map/user.md';

export interface StructuredPrompt {
    system: string;
    user: string;
    options?: {
        temperature: number;
        topP: number;
    }
}

/**
 * Builds the correction prompt for pedagogical grading.
 * Separates strict mathematical/pedagogical rules (System) from the actual content (User).
 */
export function buildCorrectionPrompt(
    modelSolution: string, 
    studentText: string, 
    tasksLayout?: Task[] | null, 
    customPrompt?: string, 
    model?: string
): StructuredPrompt {
    let system = correctionSystemDefault;
    let user = correctionUserDefault;

    if (model?.toLowerCase().includes('qwen')) {
        system = qwenCorrectionSystem;
        user = qwenCorrectionUser;
    } else if (model?.toLowerCase().includes('gemma')) {
        system = gemma4CorrectionSystem;
        user = gemma4CorrectionUser;
    } else if (model?.toLowerCase().includes('mistral-small')) {
        system = mistralSmallCorrectionSystem;
        user = mistralSmallCorrectionUser;
    }
    
    // MIGRATION: Ignore legacy huge default prompts if stuck in DB
    let cleanCustom = customPrompt?.trim();
    if (cleanCustom && cleanCustom.startsWith('Du bist ein erfahrener Lehrer')) {
        cleanCustom = ''; 
    }

    const expertText = cleanCustom ? `\n\nPÄDAGOGISCHE SPEZIALISIERUNG DES LEHRERS (ERGÄNZUNG):\n${cleanCustom}\n\n` : '';
    system = system.replace('{{expertInstructions}}', expertText);

    if (tasksLayout && Array.isArray(tasksLayout) && tasksLayout.length > 0) {
        const layoutText = tasksLayout.map(t => `- ${t.name} (Max: ${t.maxPoints} P)`).join('\n');
        system += `\n\nACHTUNG: Du MUSST dich strikt an diese Aufgabenliste halten.\n\nStruktur:\n${layoutText}`;
    }

    user = user.replace('{{modelSolution}}', modelSolution);
    user = user.replace('{{studentText}}', studentText);

    return { 
        system, 
        user,
        options: { temperature: 0.7, topP: 1.0 } // Pedagogical Flexibility
    };
}

/**
 * Builds the prompt for model solution analysis (Cleaning & Structuring).
 */
export function buildCleanAndAnalyzePrompt(modelSolution: string, model?: string): StructuredPrompt {
    let system = analyzeCleanSystemDefault;
    let user = analyzeCleanUserDefault;

    if (model?.toLowerCase().includes('qwen')) {
        system = qwenAnalyzeCleanSystem;
        user = qwenAnalyzeCleanUser;
    } else if (model?.toLowerCase().includes('gemma')) {
        system = gemma4AnalyzeCleanSystem;
        user = gemma4AnalyzeCleanUser;
    } else if (model?.toLowerCase().includes('mistral-small')) {
        system = mistralSmallAnalyzeCleanSystem;
        user = mistralSmallAnalyzeCleanUser;
    }

    user = user.replace('{{modelSolution}}', modelSolution);
    
    return { 
        system, 
        user,
        options: { temperature: 0.0, topP: 1.0 } // Verbatim Integrity
    };
}

/**
 * Builds the prompt for cleaning raw student text (digital PDFs).
 */
export function buildCleanAndMapPrompt(studentText: string, tasksLayout?: Task[], model?: string): StructuredPrompt {
    let system = analyzeMapSystemDefault;
    let user = analyzeMapUserDefault;

    if (model?.toLowerCase().includes('qwen')) {
        system = qwenAnalyzeMapSystem;
        user = qwenAnalyzeMapUser;
    } else if (model?.toLowerCase().includes('gemma')) {
        system = gemma4AnalyzeMapSystem;
        user = gemma4AnalyzeMapUser;
    } else if (model?.toLowerCase().includes('mistral-small')) {
        system = mistralSmallAnalyzeMapSystem;
        user = mistralSmallAnalyzeMapUser;
    }

    const layoutString = tasksLayout 
        ? tasksLayout.map(t => `- ${t.name} (${t.maxPoints} P)`).join('\n')
        : '';
    
    user = user.replace('{{tasksLayout}}', layoutString);
    user = user.replace('{{studentText}}', studentText);

    return { 
        system, 
        user,
        options: { temperature: 0.0, topP: 0.1 } // Structural Integrity (mild fuzziness allowed for misaligned bullet-points)
    };
}

/**
 * Builds the generic or specialized vision prompt.
 */
export function buildVisionPrompt(model?: string): StructuredPrompt {
    let system = visionSystemDefault;
    let user = visionUserDefault;

    if (model?.toLowerCase().includes('qwen')) {
        system = qwenVisionSystem;
        user = qwenVisionUser;
    }

    return {
        system,
        user,
        options: { temperature: 0.0, topP: 1.0 } // Absolute Strictness / Greedy Mode
    };
}
