import { Task, GradingMemoryCase } from '../../types';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { PromptLibraryEntry } from './prompt-library';

// Centralized Default Templates
import correctionSystemDefault from '../../prompts/core/default/correction/system.md';
import correctionUserDefault from '../../prompts/core/default/correction/user.md';
import studentSimulatorSystemDefault from '../../prompts/core/default/student-simulator/system.md';
import studentSimulatorUserDefault from '../../prompts/core/default/student-simulator/user.md';

import analyzeCleanSystemDefault from '../../prompts/core/default/analyze-and-clean/system.md';
import analyzeCleanUserDefault from '../../prompts/core/default/analyze-and-clean/user.md';

import analyzeMapSystemDefault from '../../prompts/core/default/analyze-and-map/system.md';
import analyzeMapUserDefault from '../../prompts/core/default/analyze-and-map/user.md';

import visionSystemDefault from '../../prompts/core/default/vision/system.md';
import visionUserDefault from '../../prompts/core/default/vision/user.md';

// Specialized Gemma4 Templates
import gemma4CorrectionSystem from '../../prompts/core/specialized/gemma4/correction/system.md';
import gemma4CorrectionUser from '../../prompts/core/specialized/gemma4/correction/user.md';
import gemma4AnalyzeCleanSystem from '../../prompts/core/specialized/gemma4/analyze-and-clean/system.md';
import gemma4AnalyzeCleanUser from '../../prompts/core/specialized/gemma4/analyze-and-clean/user.md';
import gemma4AnalyzeMapSystem from '../../prompts/core/specialized/gemma4/analyze-and-map/system.md';
import gemma4AnalyzeMapUser from '../../prompts/core/specialized/gemma4/analyze-and-map/user.md';

// Specialized Qwen 3.6 Templates
import qwenCorrectionSystem from '../../prompts/core/specialized/qwen3.6/correction/system.md';
import qwenCorrectionUser from '../../prompts/core/specialized/qwen3.6/correction/user.md';
import qwenAnalyzeCleanSystem from '../../prompts/core/specialized/qwen3.6/analyze-and-clean/system.md';
import qwenAnalyzeCleanUser from '../../prompts/core/specialized/qwen3.6/analyze-and-clean/user.md';
import qwenAnalyzeMapSystem from '../../prompts/core/specialized/qwen3.6/analyze-and-map/system.md';
import qwenAnalyzeMapUser from '../../prompts/core/specialized/qwen3.6/analyze-and-map/user.md';
import qwenVisionSystem from '../../prompts/core/specialized/qwen3.6/vision/system.md';
import qwenVisionUser from '../../prompts/core/specialized/qwen3.6/vision/user.md';

// Specialized Mistral-Small Templates
import mistralSmallCorrectionSystem from '../../prompts/core/specialized/mistral-small/correction/system.md';
import mistralSmallCorrectionUser from '../../prompts/core/specialized/mistral-small/correction/user.md';
import mistralSmallAnalyzeCleanSystem from '../../prompts/core/specialized/mistral-small/analyze-and-clean/system.md';
import mistralSmallAnalyzeCleanUser from '../../prompts/core/specialized/mistral-small/analyze-and-clean/user.md';
import mistralSmallAnalyzeMapSystem from '../../prompts/core/specialized/mistral-small/analyze-and-map/system.md';
import mistralSmallAnalyzeMapUser from '../../prompts/core/specialized/mistral-small/analyze-and-map/user.md';

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
    model?: string,
    gradingMemory?: GradingMemoryCase[] | null,
    activeSkillIds?: string[], // Symmetrisches Grading Skills Center
    customSkills?: Record<string, PromptLibraryEntry> // Custom user-defined skills mapping
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

    // Dynamic compilation and injection of active modular skills
    let skillsSection = '';
    if (activeSkillIds && activeSkillIds.length > 0) {
        skillsSection = '\n\n### AKTIVIERTE BEWERTUNGS-SKILLS (STRIKT BEFOLGEN):\n';
        activeSkillIds.forEach(id => {
            const skillEntry = SKILL_REGISTRY[id];
            if (skillEntry) {
                skillsSection += `\n--- [KORREKTUR-SKILL: ${skillEntry.metadata.name}] ---\n${skillEntry.promptSnippet.trim()}\n`;
            }
        });
        skillsSection += '\n--------------------------------------------\n';
    }

    if (system.includes('{{activeSkills}}')) {
        system = system.replace('{{activeSkills}}', skillsSection);
    } else {
        // Fallback: If template does not explicitly contain placeholder, append to system instructions safely
        system += skillsSection;
    }

    if (tasksLayout && Array.isArray(tasksLayout) && tasksLayout.length > 0) {
        const layoutText = tasksLayout.map(t => `- ${t.name} (Max: ${t.maxPoints} P)`).join('\n');
        system += `\n\nACHTUNG: Du MUSST dich strikt an diese Aufgabenliste halten.\n\nStruktur:\n${layoutText}`;
    }

    user = user.replace('{{modelSolution}}', modelSolution);
 
    let examplesText = '';
    if (gradingMemory && Array.isArray(gradingMemory) && gradingMemory.length > 0) {
        examplesText = '\n\n### WICHTIGER PÄDAGOGISCHER ERFAHRUNGSSCHATZ (BENOTUNGS-REFERENZ):\n';
        examplesText += 'Diese Beispiele zeigen dir, wie der Lehrer in der Vergangenheit bestimmte Typen von Fehlern bewertet hat. Sie dienen als qualitative Orientierung für deinen Bewertungsmaßstab (z. B. wie kulant oder streng du bei bestimmten Abweichungen sein sollst).\n\n';
        examplesText += 'ACHTUNG (Sicherheit vor Memory-Bleed - UNANTASTBAR):\n';
        examplesText += '- Kopiere NIEMALS blind die spezifischen Fehlerbeschreibungen, IP-Adressen, Ports, Zahlenwerte oder das Feedback aus den Beispielen für die aktuelle Schülerabgabe, es sei denn, die aktuelle Abgabe enthält exakt denselben Fehler mit exakt denselben Werten.\n';
        examplesText += '- Analysiere die aktuelle Schülerabgabe stets eigenständig und mathematisch präzise auf Basis der Musterlösung. Die Fallbeispiele sind reine Richtlinien zur Bewertungsmethodik (Kulanz-Niveau) und keine Schablonen zum Abschreiben.\n\n';
        
        gradingMemory.forEach((item, index) => {
            examplesText += `BEISPIEL ${index + 1}:\n`;
            examplesText += `[Schülerantwort]\n"${item.studentText}"\n\n`;
            examplesText += `[Erwartete Bewertung]\n`;
            examplesText += `- Vergebene Punkte: ${item.expectedCorrection.pointsObtained}\n`;
            examplesText += `- Begründung (correctionNotes): "${item.expectedCorrection.correctionNotes}"\n`;
            if (item.expectedCorrection.feedback) {
                examplesText += `- Feedback: "${item.expectedCorrection.feedback}"\n`;
            }
            examplesText += '\n-------------------\n\n';
        });
    }

    if (examplesText) {
        user = user.replace('SCHÜLERABGABE (ZU BEWERTEN):', `${examplesText}\n### JETZT AKTUELL ZU BEWERTENDE SCHÜLERABGABE (DIESE STRENG UND EIGENSTÄNDIG BEWERTEN):\n`);
    }

    user = user.replace('{{studentText}}', studentText);

    return { 
        system, 
        user,
        options: { temperature: 0.2, topP: 1.0 } // Pedagogical Flexibility
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

/**
 * Builds the prompt for the synthetic student simulator.
 */
export function buildStudentSimulatorPrompt(modelSolution: string, tasksLayout?: Task[], selectedTasks?: string[]): StructuredPrompt {
    let system = studentSimulatorSystemDefault;
    let user = studentSimulatorUserDefault;

    user = user.replace('{{modelSolution}}', modelSolution);

    const layoutString = tasksLayout && Array.isArray(tasksLayout)
        ? tasksLayout.map(t => `- ${t.name} (Max: ${t.maxPoints} P)`).join('\n')
        : 'Keine explizite Struktur vorhanden. Nimm Standardaufgaben an.';
    
    user = user.replace('{{tasksLayout}}', layoutString);

    if (selectedTasks && selectedTasks.length > 0) {
        const selectedList = selectedTasks.map((t, idx) => {
            const types = ['TYPO', 'MATH_STEP_MISSING', 'SEMANTIC_LENIENT'];
            const assignedType = types[idx % types.length];
            return `- Aufgabe: "${t}" -> Simuliere Schülertyp: "${assignedType}"`;
        }).join('\n');

        user += `\n\n### AUSGEWÄHLTE AUFGABEN FÜR DIE SIMULATION:\n${selectedList}\n\n`;
        user += `WICHTIG: Generiere genau ${selectedTasks.length} Schülerantwort(en). Für JEDE der oben aufgelisteten ausgewählten Aufgaben genau eine Schülerantwort im exakten Schülertyp. Halte dich exakt an diese Liste.`;
    }

    return {
        system,
        user,
        options: { temperature: 0.7, topP: 0.9 } // High creativity for diverse answers
    };
}

