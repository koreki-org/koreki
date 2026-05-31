import appendHandler from '../../src/pages/api/user/grading-memories/append';
import { LocalGradingMemoryService } from '../../src/lib/services/local-profile-service';
import { isLocalInstance } from '../../src/lib/env-context';

// Mock security with claims
jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: any) => async (req: any, res: any) => {
        req.user = { claims: { sub: 'test-user-id' } };
        return handler(req, res);
    }
}));

// Mock LocalProfileService and env context
jest.mock('../../src/lib/services/local-profile-service', () => ({
    LocalGradingMemoryService: {
        getAvailableProfiles: jest.fn(),
        upsertProfile: jest.fn()
    }
}));

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn(() => true)
}));

const mockGetProfiles = LocalGradingMemoryService.getAvailableProfiles as jest.Mock;
const mockUpsertProfile = LocalGradingMemoryService.upsertProfile as jest.Mock;

describe('GradingMemories Append Case API Endpoint - Integration Tests (Layer 2)', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    it('should reject non-POST methods with 405', async () => {
        req = { method: 'GET' };
        await appendHandler(req, res);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    it('should reject missing or invalid parameters with 400', async () => {
        req = {
            method: 'POST',
            body: {
                gradingMemoryId: '', // Invalid empty
                studentText: 'Answer text'
                // missing expectedCorrection
            }
        };
        await appendHandler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should successfully append a case when in local instance mode', async () => {
        const mockMemory = {
            id: 'local-memory-1',
            name: 'Klassenarbeit USV-Typen',
            cases: [],
            userId: 'test-user-id',
            createdAt: '2026-05-12'
        };

        mockGetProfiles.mockResolvedValueOnce([mockMemory]);
        mockUpsertProfile.mockResolvedValueOnce({
            ...mockMemory,
            cases: [
                {
                    id: 'case-test-id',
                    studentText: 'Online USV...',
                    expectedCorrection: { pointsObtained: 5, correctionNotes: 'Correct.' }
                }
            ]
        });

        req = {
            method: 'POST',
            body: {
                gradingMemoryId: 'local-memory-1',
                studentText: 'Online USV...',
                expectedCorrection: {
                    pointsObtained: 5,
                    correctionNotes: 'Correct.'
                }
            }
        };

        await appendHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true
        }));
        expect(mockGetProfiles).toHaveBeenCalledWith('test-user-id');
        expect(mockUpsertProfile).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'local-memory-1',
                cases: expect.arrayContaining([
                    expect.objectContaining({
                        studentText: 'Online USV...',
                        expectedCorrection: { pointsObtained: 5, correctionNotes: 'Correct.' }
                    })
                ])
            }),
            'test-user-id'
        );
    });
});
