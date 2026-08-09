import { LocalProfileService, LocalAiProfileService, LocalGradingMemoryService, LocalSkillProfileService } from '../../../src/lib/services/local-profile-service';
import { toProfileHttpError } from '../../../src/lib/services/profile-naming';
import fs from 'fs';
import path from 'path';

jest.mock('fs');

describe('Local Profile & AI Parameter Services 🧪🏮🛡️', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('LocalProfileService (Prompt Profiles)', () => {
        it('should load prompt profiles from disk and return system defaults as base', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
                { id: 'custom-1', name: 'Deutsch LK', correctionPrompt: 'Prüfe Rechtschreibung...', isSystem: false }
            ]));

            const profiles = await LocalProfileService.getAvailableProfiles('teacher-123');
            expect(profiles.length).toBeGreaterThan(1);
            expect(profiles.find(p => p.name === 'Deutsch LK')).toBeDefined();
            expect(fs.readFileSync).toHaveBeenCalled();
        });

        it('should upsert profile and pseudonymize file via user ID hash', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            const data = { name: 'Deutsch LK', correctionPrompt: 'Prüfe Rechtschreibung...' };
            await LocalProfileService.upsertProfile(data, 'teacher-123');

            expect(mockWrite).toHaveBeenCalled();
            const writtenPath = mockWrite.mock.calls[0][0] as string;
            // The filename must contain profiles_ and the SHA-256 hash of 'teacher-123'
            expect(writtenPath).toContain('profiles_');
            expect(writtenPath).toContain('.json');
        });
    });

    describe('LocalAiProfileService (AI Tuning Parameters)', () => {
        it('should load AI profiles from disk and filter out malformed entries', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
                { id: 'custom-ai-1', name: 'Optimized Gemma', temperature: 0.1, topP: 0.9 },
                null,
                { invalid: true }
            ]));

            const profiles = await LocalAiProfileService.getAvailableProfiles('teacher-123');
            expect(profiles.length).toBe(1);
            expect(profiles[0].name).toBe('Optimized Gemma');
            expect(profiles[0].temperature).toBe(0.1);
        });

        it('should upsert AI parameter profile', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            const data = {
                id: 'custom-ai-1',
                name: 'Optimized Gemma',
                temperature: 0.1,
                topP: 0.9,
                maxTokens: 2048,
                presencePenalty: 0.0,
                enableThinking: true,
                visionTemperature: 0.1,
                visionTopP: 0.9,
                visionMaxTokens: 2048,
                visionPresencePenalty: 0.0,
                ollamaNumCtx: 4096
            };

            await LocalAiProfileService.upsertProfile(data, 'teacher-123');

            expect(mockWrite).toHaveBeenCalled();
            const writtenData = JSON.parse(mockWrite.mock.calls[0][1] as string);
            expect(writtenData[0].name).toBe('Optimized Gemma');
            expect(writtenData[0].temperature).toBe(0.1);
            expect(writtenData[0].enableThinking).toBe(true);
            expect(writtenData[0].ollamaNumCtx).toBe(4096);
        });

        it('should rename a profile by ID', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
                { id: 'ai-1', name: 'Old Gemma' }
            ]));
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await LocalAiProfileService.renameProfile('ai-1', 'New Gemma', 'teacher-123');

            expect(mockWrite).toHaveBeenCalled();
            const writtenData = JSON.parse(mockWrite.mock.calls[0][1] as string);
            expect(writtenData[0].name).toBe('New Gemma');
        });

        it('should delete a profile by ID', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
                { id: 'ai-1', name: 'Old Gemma' },
                { id: 'ai-2', name: 'Second Profile' }
            ]));
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await LocalAiProfileService.deleteProfile('ai-1', 'teacher-123');

            expect(mockWrite).toHaveBeenCalled();
            const writtenData = JSON.parse(mockWrite.mock.calls[0][1] as string);
            expect(writtenData.length).toBe(1);
            expect(writtenData[0].id).toBe('ai-2');
        });
    });

    /**
     * REGRESSION: Umbenennen legte einen zweiten Eintrag mit demselben Namen an,
     * wenn der Name bereits vergeben war. Gespeichert und ausgewählt wird über
     * den NAMEN — die Dublette war danach unerreichbar, jede Bearbeitung landete
     * beim ersten Treffer. Die Datenbank-Dienste verbieten das seit jeher.
     */
    describe('Umbenennen: Namenskollision (Dubletten-Schutz)', () => {
        const zweiSkillSets = JSON.stringify([
            { id: 'local-skill-1', name: 'FISI-Skills', activeSkillIds: ['a'], customSkills: {}, isSystem: false },
            { id: 'local-skill-2', name: 'Mein Skill-Profil', activeSkillIds: ['b'], customSkills: {}, isSystem: false }
        ]);

        it('weist ein Skill-Profil auf einen bereits vergebenen Namen zurück', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(zweiSkillSets);
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await expect(
                LocalSkillProfileService.renameProfile('local-skill-2', 'FISI-Skills', 'teacher-123')
            ).rejects.toThrow('existiert bereits');

            expect(mockWrite).not.toHaveBeenCalled();
        });

        it('prüft den Namen unabhängig von Groß-/Kleinschreibung und Leerzeichen', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(zweiSkillSets);
            jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await expect(
                LocalSkillProfileService.renameProfile('local-skill-2', '  fisi-skills ', 'teacher-123')
            ).rejects.toThrow('existiert bereits');
        });

        /**
         * Die Rückfrage vor dem Überschreiben prüft nach `isSameName`. Verglich
         * der Schreibpfad danach exakt, entstand trotz Zusage eine Dublette —
         * genau die Falle, die der Umbenennen-Schutz verhindern soll.
         */
        it('trifft beim Speichern den bestehenden Eintrag auch bei anderer Schreibweise', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(zweiSkillSets);
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await LocalSkillProfileService.upsertProfile(
                { name: 'fisi-skills', activeSkillIds: ['neu'] },
                'teacher-123'
            );

            const writtenData = JSON.parse(mockWrite.mock.calls[0][1] as string);
            expect(writtenData).toHaveLength(2);
            expect(writtenData[0].activeSkillIds).toEqual(['neu']);
        });

        it('lässt einen freien Namen zu', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(zweiSkillSets);
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await LocalSkillProfileService.renameProfile('local-skill-2', 'FISI-Skills 2026', 'teacher-123');

            const writtenData = JSON.parse(mockWrite.mock.calls[0][1] as string);
            expect(writtenData.map((p: any) => p.name)).toEqual(['FISI-Skills', 'FISI-Skills 2026']);
        });

        it('erlaubt das Umbenennen auf den eigenen Namen (nur Schreibweise geändert)', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(zweiSkillSets);
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await LocalSkillProfileService.renameProfile('local-skill-1', 'FISI-SKILLS', 'teacher-123');

            const writtenData = JSON.parse(mockWrite.mock.calls[0][1] as string);
            expect(writtenData[0].name).toBe('FISI-SKILLS');
        });

        it('schützt auch den Erfahrungsschatz', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
                { id: 'mem-1', name: 'Klausur 1', cases: [] },
                { id: 'mem-2', name: 'Klausur 2', cases: [] }
            ]));
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await expect(
                LocalGradingMemoryService.renameProfile('mem-2', 'Klausur 1', 'teacher-123')
            ).rejects.toThrow('existiert bereits');

            expect(mockWrite).not.toHaveBeenCalled();
        });

        it('schützt Prompt- und KI-Profile nach derselben Regel', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
                { id: 'p-1', name: 'Deutsch LK', correctionPrompt: '', isSystem: false },
                { id: 'p-2', name: 'Mathe GK', correctionPrompt: '', isSystem: false }
            ]));
            await expect(
                LocalProfileService.renameProfile('p-2', 'Deutsch LK', 'teacher-123')
            ).rejects.toThrow('existiert bereits');

            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
                { id: 'ai-1', name: 'Optimized Gemma' },
                { id: 'ai-2', name: 'Schnell' }
            ]));
            await expect(
                LocalAiProfileService.renameProfile('ai-2', 'Optimized Gemma', 'teacher-123')
            ).rejects.toThrow('existiert bereits');
        });

        it('meldet einen unbekannten Eintrag, statt stillschweigend nichts zu tun', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(zweiSkillSets);
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            await expect(
                LocalSkillProfileService.renameProfile('gibt-es-nicht', 'Egal', 'teacher-123')
            ).rejects.toThrow('nicht gefunden');

            expect(mockWrite).not.toHaveBeenCalled();
        });

        it('übersetzt die fachlichen Fehler in HTTP-Antworten', () => {
            expect(toProfileHttpError(new Error('Ein Skill-Profil mit diesem Namen existiert bereits'), 'fallback'))
                .toEqual({ status: 409, message: 'Ein Skill-Profil mit diesem Namen existiert bereits' });
            expect(toProfileHttpError(new Error('Skill-Profil nicht gefunden'), 'fallback'))
                .toEqual({ status: 404, message: 'Skill-Profil nicht gefunden' });
            // Unerwartetes bleibt unspezifisch — sonst gerieten Dateipfade nach außen.
            expect(toProfileHttpError(new Error('EACCES: permission denied, open C:\\Users\\...'), 'fallback'))
                .toEqual({ status: 500, message: 'fallback' });
        });

        /**
         * SaaS-Pfad: Dort prüfen die Routen vorher selbst, zwischen Prüfung und
         * Schreibvorgang bleibt aber ein Wettlauf-Fenster. Die Sperre der
         * Datenbank darf den Nutzer nicht als „Interner Serverfehler" erreichen.
         */
        it('erkennt die Eindeutigkeits-Sperre der Datenbank (Prisma P2002)', () => {
            const prismaFehler = Object.assign(new Error('Unique constraint failed on the fields: (`name`,`userId`)'), { code: 'P2002' });

            expect(toProfileHttpError(prismaFehler, 'Interner Serverfehler', 'Erfahrungsschatz'))
                .toEqual({ status: 409, message: 'Ein Erfahrungsschatz mit diesem Namen existiert bereits' });
        });
    });

    describe('LocalGradingMemoryService (Few-Shot Calibration Memories)', () => {
        it('should load local grading memories from disk', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
                { id: 'mem-1', name: 'Klausur 1 Kalibrierung', cases: [] }
            ]));

            const memories = await LocalGradingMemoryService.getAvailableProfiles('teacher-123');
            expect(memories.length).toBe(1);
            expect(memories[0].name).toBe('Klausur 1 Kalibrierung');
        });

        it('should save grading memory to disk', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            const memoryData = {
                id: 'mem-1',
                name: 'Klausur 1 Kalibrierung',
                cases: []
            };

            await LocalGradingMemoryService.upsertProfile(memoryData, 'teacher-123');

            expect(mockWrite).toHaveBeenCalled();
            const writtenData = JSON.parse(mockWrite.mock.calls[0][1] as string);
            expect(writtenData[0].name).toBe('Klausur 1 Kalibrierung');
        });
    });
});
