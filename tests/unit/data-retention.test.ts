// Mocking Prisma Client (Prefixed with 'mock' to be allowed in hoisted jest.mock)
const mockDeleteMany = jest.fn().mockResolvedValue({ count: 5 });
const mockDisconnect = jest.fn();

jest.mock('@prisma/client', () => {
    return {
        PrismaClient: jest.fn().mockImplementation(() => {
            return {
                privacyLog: {
                    deleteMany: mockDeleteMany
                },
                processedStripeSession: {
                    deleteMany: mockDeleteMany
                },
                $disconnect: mockDisconnect
            };
        })
    };
});

const { cleanupLogs } = require('../../prisma/scripts/cleanup-logs.js');

describe('Security: Pillar 6 - Data Retention Verification', () => {

    beforeAll(() => {
        // Use fake timers to control Date.now()
        jest.useFakeTimers();
        // Set a fixed time (UTC)
        jest.setSystemTime(new Date('2026-04-04T12:00:00Z').getTime());
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should calculate the correct cutoff date (90 days ago)', async () => {
        await cleanupLogs();

        expect(mockDeleteMany).toHaveBeenCalled();
        
        const callArgs = mockDeleteMany.mock.calls[0][0];
        const usedCutoffDate = callArgs.where.createdAt.lt;
        
        // We check the logic: cutoff should be exactly 90 days before now
        const now = new Date();
        const expectedCutoff = new Date();
        expectedCutoff.setDate(now.getDate() - 90);

        // Compare timestamps to be timezone-independent
        expect(usedCutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it('should return the count of deleted entries', async () => {
        const result = await cleanupLogs();
        expect(result.logs).toBe(5);
        expect(result.sessions).toBe(5);
        expect(mockDeleteMany).toHaveBeenCalledTimes(2);
    });

    it('should gracefully handle database errors', async () => {
        mockDeleteMany.mockRejectedValueOnce(new Error('DB Timeout'));
        
        await expect(cleanupLogs()).rejects.toThrow('DB Timeout');
    });
});
