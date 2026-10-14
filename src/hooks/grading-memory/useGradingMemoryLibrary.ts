import { useState, useRef } from 'react';
import type { GradingMemory } from '@/types';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget } from '@/lib/env-context';
import { downloadFile } from '@/lib/file-utils';
import { exportGradingMemoryToMarkdown, parseMarkdownGradingMemory } from '@/lib/parsers/markdown-grading-memory-parser';
import { findNameCollision } from '@/lib/local-vault';
import { isSameName, nameTakenMessage } from '@/lib/services/profile-naming';
import { persistGradingMemory, bestaetigeSchatzName } from '@/lib/grading-memory-persistence';
import { toErrorMessage } from '@/lib/error-message';
import { meldeErfolg, meldeFehler, meldeHinweis } from '@/lib/notify';

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
    /** Die vorhandenen Schätze — nötig für die Rückfrage vor dem Überschreiben. */
    memories: GradingMemory[];
}

export function useGradingMemoryLibrary({
    addLocalMemory,
    refreshMemories,
    memories
}: UseGradingMemoryLibraryParams) {
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
                /**
                 * Drei verschiedene Ursachen sahen bis zum 18.08.2026 gleich
                 * aus — alle drei meldeten „Format nicht erkannt".
                 *
                 * Der gemeldete Fall war der erste: ein Erfahrungsschatz ohne
                 * Fallbeispiele wurde exportiert und wieder abgelegt. Die Datei
                 * war einwandfrei und stammte aus unserem eigenen Export; nur
                 * enthielt sie nichts. Die Formatmeldung schickte die Lehrkraft
                 * damit auf die Suche nach einem Fehler, den es nicht gab.
                 */
                const marken = (text.match(/\[CASE_START\]/g) || []).length;

                if (parsed.istErfahrungsschatzDatei && marken === 0) {
                    meldeHinweis(
                        `Der Erfahrungsschatz „${parsed.name}" enthält keine Fallbeispiele.\n\n`
                        + 'Die Datei ist in Ordnung — sie war bereits beim Exportieren leer. '
                        + 'Öffne den Erfahrungsschatz, füge Fallbeispiele hinzu und exportiere ihn erneut.'
                    );
                    return;
                }

                meldeFehler(
                    'Fehler: Keine gültigen Fallbeispiele im KEP-MD-2 Format gefunden.\n\n'
                    + `Datei: ${file.name} (${text.length} Zeichen)\n`
                    + `Gefundene Fallbeispiel-Marken: ${marken}\n\n`
                    + (marken === 0
                        ? 'Die Datei trägt keinen Erfahrungsschatz-Kopf. Stammt sie aus dem Export?'
                        : 'Die Blöcke sind vorhanden, aber unvollständig — es fehlt „### Schülerantwort:" oder „### Erwartete Korrektur:".')
                );
                return;
            }

            /**
             * Rückfrage vor dem Überschreiben — wie beim Speichern und wie in
             * den drei Profil-Familien.
             *
             * Der Name steht im KOPF der Datei, nicht im Dateinamen. Eine
             * umbenannte Datei trägt also weiterhin den alten Namen, und beide
             * Ablagen überschreiben namensgleich (localStorage per `isSameName`,
             * die Datenbank per `upsert`). Ohne diese Rückfrage verschwanden
             * Änderungen still, die nach dem Export am bestehenden Schatz
             * gemacht wurden — gemeldet am 18.08.2026.
             */
            const ersetzt = memories.some(m => isSameName(m.name, parsed.name));
            const urteil = await bestaetigeSchatzName(parsed.name, memories);
            if (!urteil.ok) {
                if (urteil.fehler) meldeHinweis(urteil.fehler);
                return;
            }

            await persistGradingMemory({ name: parsed.name, cases: parsed.cases, addLocalMemory });

            // Sagt, was tatsächlich geschehen ist. „Importiert" bei einem
            // Ersetzen liess die Lehrkraft nach einem neuen Eintrag suchen,
            // den es nicht gab.
            meldeErfolg(ersetzt
                ? `Erfahrungsschatz "${parsed.name}" ersetzt (${parsed.cases.length} Fallbeispiele).`
                : `Erfahrungsschatz "${parsed.name}" importiert (${parsed.cases.length} Fallbeispiele).`);
        } catch (err) {
            meldeFehler('Import-Fehler: ' + toErrorMessage(err));
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
        // Ein Erfahrungsschatz ohne Fallbeispiele ergibt eine Datei, die sich
        // nicht wieder einlesen laesst — sein ganzer Inhalt SIND die Beispiele.
        // Genau daraus entstand der Fehlerbericht vom 18.08.2026: exportiert,
        // abgelegt, „Format nicht erkannt". Hier ist die Stelle, an der die
        // Lehrkraft es erfahren muss, nicht erst beim Wiedereinlesen.
        if (!memory.cases || memory.cases.length === 0) {
            meldeHinweis(
                `Der Erfahrungsschatz „${memory.name}" enthält keine Fallbeispiele.\n\n`
                + 'Eine solche Datei liesse sich später nicht wieder einlesen — '
                + 'die Fallbeispiele sind ihr gesamter Inhalt.'
            );
            return;
        }

        try {
            const markdown = exportGradingMemoryToMarkdown(memory.name, memory.cases);
            const filename = `${memory.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_grading_memory.md`;
            await downloadFile(markdown, filename, 'text/markdown;charset=utf-8');
        } catch (error) {
            console.error('Fehler beim Exportieren des Erfahrungsschatzes:', toErrorMessage(error));
            meldeFehler('Export fehlgeschlagen.');
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
                    meldeHinweis(nameTakenMessage('Erfahrungsschatz'));
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
            meldeFehler('Fehler beim Umbenennen: ' + toErrorMessage(e));
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
