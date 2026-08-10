import { checkIpFloodLimit, checkSubjectLimit } from '../../src/lib/rate-limit';

jest.mock('../../src/lib/logger', () => ({
    logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), security: jest.fn() }
}));

/**
 * Saeule 1: Rate Limiting nach Subjekt statt nach IP.
 *
 * Die entscheidende Regression, die diese Tests festhalten: eine Lehrkraft muss
 * eine ganze Klasse in einem Durchgang korrigieren koennen, und eine Schule
 * hinter NAT darf sich kein Kontingent teilen muessen.
 */
describe('Security: Pillar 1 - Rate Limiting', () => {

    describe('Stufe 1: IP-Flutschutz', () => {
        it('laesst normalen Verkehr durch', async () => {
            for (let i = 0; i < 20; i++) {
                expect(await checkIpFloodLimit('ip-normal')).toBe(true);
            }
        });

        it('bremst erst bei echter Flut (601. Anfrage)', async () => {
            const ip = 'ip-flut';
            for (let i = 0; i < 600; i++) {
                await checkIpFloodLimit(ip);
            }
            expect(await checkIpFloodLimit(ip)).toBe(false);
        });
    });

    describe('Stufe 2: angemeldete Nutzer', () => {
        it('traegt eine Klassenkorrektur von 30 Schuelern am Stueck', async () => {
            const userId = 'lehrkraft-klasse';
            for (let i = 0; i < 30; i++) {
                expect(await checkSubjectLimit(userId, true, true)).toBe(true);
            }
        });

        it('begrenzt KI-Aufrufe bei 60 pro Minute', async () => {
            const userId = 'lehrkraft-vielnutzer';
            for (let i = 0; i < 60; i++) {
                await checkSubjectLimit(userId, true, true);
            }
            expect(await checkSubjectLimit(userId, true, true)).toBe(false);
        });

        it('zaehlt pro Nutzer, nicht pro IP — zwei Lehrkraefte behindern sich nicht', async () => {
            for (let i = 0; i < 60; i++) {
                await checkSubjectLimit('kollegin-a', true, true);
            }

            expect(await checkSubjectLimit('kollegin-a', true, true)).toBe(false);
            expect(await checkSubjectLimit('kollege-b', true, true)).toBe(true);
        });

        it('haelt KI- und Normalkontingent getrennt', async () => {
            const userId = 'lehrkraft-gemischt';
            for (let i = 0; i < 60; i++) {
                await checkSubjectLimit(userId, true, true);
            }

            expect(await checkSubjectLimit(userId, true, true)).toBe(false);
            expect(await checkSubjectLimit(userId, true, false)).toBe(true);
        });
    });

    describe('Stufe 2: anonyme Anfragen', () => {
        it('bleibt bei den strengeren IP-Grenzen (11. KI-Anfrage)', async () => {
            const ip = 'anonym-ip';
            for (let i = 0; i < 10; i++) {
                await checkSubjectLimit(ip, false, true);
            }
            expect(await checkSubjectLimit(ip, false, true)).toBe(false);
        });

        it('trennt anonyme und angemeldete Kontingente', async () => {
            const shared = 'gleiche-zeichenkette';
            for (let i = 0; i < 10; i++) {
                await checkSubjectLimit(shared, false, true);
            }

            expect(await checkSubjectLimit(shared, false, true)).toBe(false);
            expect(await checkSubjectLimit(shared, true, true)).toBe(true);
        });
    });
});
