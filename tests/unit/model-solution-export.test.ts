import {
    MODEL_SOLUTION_EXPORT_VERSION,
    buildModelSolutionExport,
    buildModelSolutionExportFilename,
    serializeModelSolutionExport
} from '../../src/lib/model-solution-export';
import type { Task, AppSettings } from '../../src/types';

/**
 * Diese Logik steckte in ModelSolutionCard und war nur ueber das Rendern der
 * gesamten Karte erreichbar — also praktisch ungetestet. Genau hier liegt aber
 * das, was still kaputtgehen kann: das Dateiformat und die Versionsangabe, an
 * der ein spaeterer Import haengt.
 */
describe('model-solution-export', () => {
    const tasksLayout = [
        { name: 'Aufgabe 1', content: 'Loesung 1', maxPoints: 5 },
        { name: 'Aufgabe 2', content: 'Loesung 2', maxPoints: 3 }
    ] as Task[];

    const settings = {
        activePromptProfileId: 'prompt-42',
        activeAiProfileId: 'ai-7'
    } as AppSettings;

    const fixedNow = new Date(2026, 7, 11, 9, 5); // 11.08.2026, 09:05 Ortszeit

    describe('buildModelSolutionExport', () => {
        it('schreibt die Formatversion mit', () => {
            const payload = buildModelSolutionExport(
                { modelSolution: 'Text', tasksLayout },
                fixedNow
            );

            expect(payload.version).toBe(MODEL_SOLUTION_EXPORT_VERSION);
        });

        it('uebernimmt Musterloesung, Rahmen und Aufgaben unveraendert', () => {
            const payload = buildModelSolutionExport(
                { modelSolution: 'Text', modelSolutionContext: 'Rahmen', tasksLayout },
                fixedNow
            );

            expect(payload.modelSolution).toBe('Text');
            expect(payload.modelSolutionContext).toBe('Rahmen');
            expect(payload.tasksLayout).toEqual(tasksLayout);
        });

        it('setzt einen fehlenden Rahmen auf die leere Zeichenkette statt undefined', () => {
            const payload = buildModelSolutionExport({ modelSolution: 'Text', tasksLayout }, fixedNow);

            // undefined wuerde von JSON.stringify verworfen — das Feld fehlte dann
            // in der Datei und ein Import muesste den Fall gesondert behandeln.
            expect(payload.modelSolutionContext).toBe('');
            expect(JSON.parse(serializeModelSolutionExport({ modelSolution: 'Text', tasksLayout }, fixedNow)))
                .toHaveProperty('modelSolutionContext', '');
        });

        it('haengt die aktiven Profile als Metadaten an', () => {
            const payload = buildModelSolutionExport(
                { modelSolution: 'Text', tasksLayout, settings },
                fixedNow
            );

            expect(payload.metadata).toEqual({
                activeProfileId: 'prompt-42',
                activeAiProfileId: 'ai-7'
            });
        });

        it('kommt ohne Einstellungen zurecht', () => {
            const payload = buildModelSolutionExport({ modelSolution: 'Text', tasksLayout }, fixedNow);

            expect(payload.metadata.activeProfileId).toBeUndefined();
            expect(payload.metadata.activeAiProfileId).toBeUndefined();
        });

        it('verwendet den uebergebenen Zeitpunkt', () => {
            const payload = buildModelSolutionExport({ modelSolution: 'Text', tasksLayout }, fixedNow);

            expect(payload.timestamp).toBe(fixedNow.toISOString());
        });
    });

    describe('buildModelSolutionExportFilename', () => {
        it('folgt dem Muster koreki-ml-JJJJ-MM-TT_hhmm.koreki', () => {
            expect(buildModelSolutionExportFilename(fixedNow)).toBe('koreki-ml-2026-08-11_0905.koreki');
        });

        it('fuellt einstellige Monate, Tage und Zeiten mit Null auf', () => {
            expect(buildModelSolutionExportFilename(new Date(2026, 0, 3, 7, 4)))
                .toBe('koreki-ml-2026-01-03_0704.koreki');
        });

        it('nutzt Ortszeit, nicht UTC', () => {
            const name = buildModelSolutionExportFilename(fixedNow);

            // Die Lehrkraft ordnet die Datei ihrem Arbeitstag zu; ein
            // UTC-Wechsel wuerde abends den Tagesstempel verschieben.
            expect(name).toContain(`-${String(fixedNow.getDate()).padStart(2, '0')}_`);
            expect(name).toContain(String(fixedNow.getHours()).padStart(2, '0'));
        });
    });

    describe('serializeModelSolutionExport', () => {
        it('liefert eingerueckten, wieder einlesbaren JSON-Text', () => {
            const text = serializeModelSolutionExport(
                { modelSolution: 'Text', tasksLayout, settings },
                fixedNow
            );

            expect(text).toContain('\n  ');
            expect(JSON.parse(text)).toEqual(
                buildModelSolutionExport({ modelSolution: 'Text', tasksLayout, settings }, fixedNow)
            );
        });
    });
});
