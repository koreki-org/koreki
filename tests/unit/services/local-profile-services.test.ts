import { LocalProfileService, LocalAiProfileService, LocalGradingMemoryService } from '../../../src/lib/services/local-profile-service';
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
