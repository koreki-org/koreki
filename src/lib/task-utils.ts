import { Task } from '../types';

/**
 * Groups tasks by their main identifier (e.g., "Aufgabe 1a", "Aufgabe 1b" -> "Aufgabe 1").
 * Handles various formats like "A 1", "1.1", "Task 1", etc.
 */
export function groupTasksByMain(tasks: Task[]): Record<string, Task[]> {
    const groups: Record<string, Task[]> = {};

    tasks.forEach(task => {
        // Look for the "base" name. 
        // Logic: Match everything up to the first number, plus the number, but ignore trailing letters for the group key.
        // Example: "Aufgabe 1a" -> Match "Aufgabe 1"
        // Example: "1.1" -> Match "1"
        // Example: "A 1.1" -> Match "A 1"
        
        // Simple but effective regex: Match start until the first number group.
        // Example: "Aufgabe 1a" -> Match "Aufgabe 1"
        // Example: "1.1" -> Match "1"
        // Example: "A 3.1" -> Match "A 3"
        const match = task.name.match(/^(.*?\d+)/);
        const baseName = match ? match[1].trim() : task.name;

        if (!groups[baseName]) groups[baseName] = [];
        groups[baseName].push(task);
    });

    return groups;
}

/**
 * Checks if a block of text contains OCR uncertainty markers "(?)".
 */
export function hasOcrWarnings(text: string): boolean {
    return text.includes('(?)');
}

/**
 * Splits a full text into sections based on provided tasks.
 * 
 * @deprecated 🏮 INDUSTRIAL RED ALERT: 
 * This is a LEGACY FALLBACK. Since Stage 16.51, the UI prioritizes 
 * AI-partitioned content (task.content) directly from the extraction response.
 * Use this only as a degraded safety net if task.content is missing.
 * 
 * Strategy:
 * 1. Try Markers (=== TASK: name ===)
 * 2. Fallback to brittle regex-based name matching.
 */
export function splitTextByTasks(text: string, tasks: Task[]): string[] {
    if (!tasks.length) return [];
    
    if (!text) return new Array(tasks.length).fill('');

    // 2. Try Markers
    const markerRegex = /===\s*TASK[E]?:?\s*(.+?)\s*===/gi;
    const matches = Array.from(text.matchAll(markerRegex));

    if (matches.length > 0 && matches.some(m => tasks.some(t => t.name.toLowerCase() === m[1].trim().toLowerCase()))) {
        return tasks.map(task => {
            const matchIndex = matches.findIndex(m => m[1].trim().toLowerCase() === task.name.trim().toLowerCase());
            if (matchIndex === -1) return "";

            const contentStart = matches[matchIndex].index! + matches[matchIndex][0].length;
            const nextMatch = matches.find(m => m.index! > matches[matchIndex].index!);
            const contentEnd = nextMatch ? nextMatch.index! : text.length;

            return text.substring(contentStart, contentEnd).trim();
        });
    }

    // 3. Fallback: Regex Search for task names
    const taskNames = tasks.map(t => t.name);
    // Sort names by length descending to match full names before prefixes (e.g. "Aufgabe 1a" before "Aufgabe 1")
    const sortedNames = [...taskNames].sort((a, b) => b.length - a.length);
    const escapedNames = sortedNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`(${escapedNames.join('|')})`, 'gi');
    
    const parts = text.split(pattern);
    const sections: Record<string, string> = {};
    
    let currentTask = '';
    for (const part of parts) {
        const foundName = sortedNames.find(n => n.toLowerCase() === part.toLowerCase());
        if (foundName) {
            currentTask = foundName;
        } else if (currentTask) {
            sections[currentTask] = (sections[currentTask] || '') + part;
        }
    }
    
    return taskNames.map(name => sections[name]?.trim() || "");
}

/**
 * Joins task sections into a single string with human-readable headers.
 */
export function joinTaskSections(sections: string[], tasks: Task[]): string {
    return sections.map((s, i) => `### ${tasks[i].name} ###\n${s}`).join('\n\n');
}
