import { useState, useRef } from 'react';
import type { GradingMemory } from '@/types';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget } from '@/lib/env-context';
import { downloadFile } from '@/lib/file-utils';
import { exportGradingMemoryToMarkdown, parseMarkdownGradingMemory } from '@/lib/parsers/markdown-grading-memory-parser';
import { findNameCollision } from '@/lib/local-vault';
import { nameTakenMessage } from '@/lib/services/profile-naming';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Die Sammlung der Erfahrungsschätze verwalten.
 * 📚
 *
 * Ein-, Ausführen und Umbenennen — alles, was die LISTE betrifft, nicht den
 * Inhalt eines einzelnen Schatzes. Beide Betriebsarten kommen vor: Desktop
 * schreibt in den lokalen Speicher, SaaS und Community in die Datenbank.
 */

export interface UseGradingMemoryLibraryParams {
    /** Nimmt einen frisch importierten Schatz in die Liste auf. */
    addLocalMemory: (memory: GradingMemory) => void;
    refreshMemories: () => void;
}

export function useGradingMemoryLibrary({ addLocalMemory, refreshMemories }: UseGradingMemoryLibraryParams) {
    const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    /**
     * Liest eine Erfahrungsschatz-Datei ein.
     *
     * Nimmt bewusst eine Datei statt eines Eingabe-Ereignisses, damit sowohl
     * die Dateiauswahl als auch das Ablegen per Drag-and-Drop denselben Weg
     * nehmen — wie in den drei Profil-Seitenleisten.
     */
    const importMemoryFile = async (file: File) => {
        try {
            const text = await file.text();
            const parsed = parseMarkdownGradingMemory(text);

            if (parsed.cases.length === 0) {
                alert('Fehler: Keine gültigen Fallbeispiele im KEP-MD-2 Format gefunden.');
                return;
            }

            if (isDesktopTarget()) {
                addLocalMemory({
                    id: `local-grading-memory-${Date.now()}`,
                    name: parsed.name,
                    cases: parsed.cases,
                    userId: null,
                    createdAt: new Date().toISOString()
                });
                alert(`Erfahrungsschatz "${parsed.name}" erfolgreich importiert!`);
                return;
            }

            const response = await apiClient.post('/api/user/grading-memories', {
                name: parsed.name,
                cases: parsed.cases
            });
            if (!response.ok) {
                throw new Error('Fehler beim Speichern des importierten Erfahrungsschatzes im Backend.');
            }
            addLocalMemory(await response.json());
            alert(`Erfahrungsschatz "${parsed.name}" erfolgreich importiert!`);
        } catch (err) {
            alert('Import-Fehler: ' + toErrorMessage(err));
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await importMemoryFile(file);
        } finally {
            // Zuruecksetzen, damit dieselbe Datei erneut gewaehlt werden kann.
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExportMemory = async (memory: GradingMemory) => {
        try {
            const markdown = exportGradingMemoryToMarkdown(memory.name, memory.cases);
            const filename = `${memory.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_grading_memory.md`;
            await downloadFile(markdown, filename, 'text/markdown;charset=utf-8');
        } catch (error) {
            console.error('Fehler beim Exportieren des Erfahrungsschatzes:', toErrorMessage(error));
            alert('Export fehlgeschlagen.');
        }
    };

    const handleConfirmRename = async () => {
        if (!editingMemoryId || !editingName.trim()) return;

        try {
            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_grading_memories');
                if (!stored) return;

                let list: GradingMemory[] = JSON.parse(stored);
                if (findNameCollision(list, editingMemoryId, editingName)) {
                    alert(nameTakenMessage('Erfahrungsschatz'));
                    return;
                }
                list = list.map(m => m.id === editingMemoryId ? { ...m, name: editingName.trim() } : m);
                localStorage.setItem('koreki_local_grading_memories', JSON.stringify(list));
                refreshMemories();
                setEditingMemoryId(null);
                return;
            }

            const response = await apiClient.fetch('/api/user/grading-memories', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingMemoryId, newName: editingName.trim() })
            });

            if (!response.ok) {
                // Der Grund steht in der Antwort — etwa die Namenskollision.
                // Ihn zu verwerfen ließ jeden Fall gleich aussehen.
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Fehler beim Umbenennen im Backend.');
            }

            refreshMemories();
            setEditingMemoryId(null);
        } catch (e) {
            alert('Fehler beim Umbenennen: ' + toErrorMessage(e));
        }
    };

    return {
        editingMemoryId, setEditingMemoryId,
        editingName, setEditingName,
        fileInputRef,
        handleImportClick,
        importMemoryFile,
        handleImportFile,
        handleExportMemory,
        handleConfirmRename
    };
}
