import { parsePromptFile, PromptLibraryEntry } from '@/lib/ai/prompt-library';

// Import raw Markdown files
import standardRaw from './standard.md';
import matheLogikRaw from './mathe-logik.md';
import informatikRaw from './informatik.md';
import wirtschaftskundeRaw from './wirtschaftskunde.md';
import ethikRaw from './ethik.md';
import geschichteRaw from './geschichte.md';
import gemeinschaftskundeRaw from './gemeinschaftskunde.md';

/**
 * Registry of all available Pedagogical Expert Profiles.
 * 🏮🛡️🏛️
 */
export const EXPERT_REGISTRY: Record<string, PromptLibraryEntry> = {
    'id-standard': parsePromptFile(standardRaw),
    'id-math-logic': parsePromptFile(matheLogikRaw),
    'id-informatik': parsePromptFile(informatikRaw),
    'id-wirtschaftskunde': parsePromptFile(wirtschaftskundeRaw),
    'id-ethik': parsePromptFile(ethikRaw),
    'id-geschichte': parsePromptFile(geschichteRaw),
    'id-gemeinschaftskunde': parsePromptFile(gemeinschaftskundeRaw)
};

/**
 * Returns all experts as a flat array (for UI selectors).
 */
export const getAllExperts = () => Object.values(EXPERT_REGISTRY);
