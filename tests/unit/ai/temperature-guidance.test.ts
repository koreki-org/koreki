import {
    CORRECTION_TEMPERATURE_LIMIT,
    describeTemperature,
    isTemperatureRiskyForGrading
} from '../../../src/lib/ai/temperature-guidance';

/**
 * Die einzige Stelle, an der die Lehrkraft davor gewarnt wird, dass eine hohe
 * Temperatur die Note vom Zufall abhaengig macht. Lag im Rumpf von
 * AiProfileModules und war nur ueber das Rendern der Seite erreichbar — dabei
 * sind es Schwellenwerte, die beim Anfassen leicht verrutschen.
 */
describe('temperature-guidance', () => {
    describe('Korrektur', () => {
        it('nennt 0 deterministisch', () => {
            expect(describeTemperature(0, 'correction')).toContain('Deterministisch');
        });

        it('empfiehlt den Bereich bis 0.6', () => {
            expect(describeTemperature(0.6, 'correction')).toContain('Empfohlen');
        });

        it('nennt den Bereich bis 0.8 ausgewogen', () => {
            expect(describeTemperature(0.7, 'correction')).toContain('Ausgewogene');
            expect(describeTemperature(0.8, 'correction')).toContain('Ausgewogene');
        });

        it('warnt oberhalb der Notengrenze', () => {
            expect(describeTemperature(CORRECTION_TEMPERATURE_LIMIT, 'correction'))
                .not.toContain('Nicht für Noten');
            expect(describeTemperature(CORRECTION_TEMPERATURE_LIMIT + 0.1, 'correction'))
                .toContain('Nicht für Noten empfohlen');
        });

        it('trennt die Stufen an den Schwellen sauber', () => {
            // Genau AUF der Schwelle gilt noch die mildere Einordnung.
            expect(describeTemperature(0.6, 'correction')).not.toEqual(describeTemperature(0.61, 'correction'));
            expect(describeTemperature(0.8, 'correction')).not.toEqual(describeTemperature(0.81, 'correction'));
        });
    });

    describe('Texterkennung', () => {
        it('empfiehlt 0 fuer praezises OCR', () => {
            expect(describeTemperature(0, 'vision')).toContain('Empfohlen');
        });

        it('warnt frueher als bei der Korrektur', () => {
            // Beim Ablesen geht es um Genauigkeit, nicht um Formulierung —
            // deshalb liegt die Warnschwelle deutlich niedriger.
            expect(describeTemperature(0.8, 'vision')).toContain('Vorsicht');
            expect(describeTemperature(0.8, 'correction')).not.toContain('Vorsicht');
        });

        it('trennt die Stufen an den Schwellen sauber', () => {
            expect(describeTemperature(0.3, 'vision')).not.toEqual(describeTemperature(0.31, 'vision'));
            expect(describeTemperature(0.7, 'vision')).not.toEqual(describeTemperature(0.71, 'vision'));
        });
    });

    describe('isTemperatureRiskyForGrading', () => {
        it('meldet die Korrektur erst oberhalb der Notengrenze', () => {
            expect(isTemperatureRiskyForGrading(1.2, 'correction')).toBe(false);
            expect(isTemperatureRiskyForGrading(1.3, 'correction')).toBe(true);
        });

        it('meldet die Texterkennung ab 0.7', () => {
            expect(isTemperatureRiskyForGrading(0.7, 'vision')).toBe(false);
            expect(isTemperatureRiskyForGrading(0.71, 'vision')).toBe(true);
        });

        it('deckt sich mit dem Warntext', () => {
            [0, 0.5, 0.8, 1.2, 1.5, 2].forEach(value => {
                const warnt = describeTemperature(value, 'correction').includes('Nicht für Noten');
                expect(isTemperatureRiskyForGrading(value, 'correction')).toBe(warnt);
            });
        });
    });
});
