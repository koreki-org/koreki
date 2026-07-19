import { parsePromptFile, PromptLibraryEntry } from '@/lib/ai/prompt-library';

// Import raw Markdown files
import consecutiveErrorsRaw from './math-consecutive-errors.md';
import mathEquivalenceRaw from './math-formula-concept.md';
import mathIsolatedGradingRaw from './math-substitution-units.md';
import mathScratchpadRaw from './math-points-addition.md';
import marksBayernRaw from './marks-bayern.md';
import marksNrwRaw from './marks-nrw.md';
import marksClassicRaw from './marks-classic.md';
import feedbackSandwichRaw from './feedback-sandwich.md';
import feedbackGeneralRaw from './feedback-general.md';
import orthographyLenientRaw from './orthography-lenient.md';
import calcVlsmRaw from './calc-vlsm.md';

/**
 * Registry of all available Modular Correction Skills.
 * 🏮🛡️🏛️
 */
export const SKILL_REGISTRY: Record<string, PromptLibraryEntry> = {
    'skill-consecutive-errors': parsePromptFile(consecutiveErrorsRaw),
    'skill-math-equivalence': parsePromptFile(mathEquivalenceRaw),
    'skill-math-isolated-grading': parsePromptFile(mathIsolatedGradingRaw),
    'skill-math-scratchpad': parsePromptFile(mathScratchpadRaw),
    'skill-marks-bayern': parsePromptFile(marksBayernRaw),
    'skill-marks-nrw': parsePromptFile(marksNrwRaw),
    'skill-marks-classic': parsePromptFile(marksClassicRaw),
    'skill-feedback-sandwich': parsePromptFile(feedbackSandwichRaw),
    'skill-feedback-general': parsePromptFile(feedbackGeneralRaw),
    'skill-orthography-lenient': parsePromptFile(orthographyLenientRaw),
    'skill-calc-vlsm': parsePromptFile(calcVlsmRaw)
};

/**
 * Returns all skills as a flat array.
 */
export const getAllSkills = () => Object.values(SKILL_REGISTRY);
