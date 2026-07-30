import { logSecurityEvent } from '../../../src/lib/audit-service';
import { openExternal } from '../../../src/lib/os-utils';
import { stripPangBlock, cleanDidacticalMarks, formatMarkdownTableForPDF } from '../../../src/lib/pdf-utils';
import prisma from '../../../src/lib/prisma';
import { isDesktopTarget } from '../../../src/lib/env-context';

// Mock dependencies
jest.mock('../../../src/lib/prisma', () => ({
    privacyLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' })
    }
}));

jest.mock('../../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn()
}));

jest.mock('@tauri-apps/plugin-shell', () => ({
    open: jest.fn().mockResolvedValue(undefined)
}), { virtual: true });

describe('Core Utilities Quick-Wins - Industrial Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('audit-service.ts (logSecurityEvent)', () => {
        it('should log security events cleanly to PrivacyLog', async () => {
            await logSecurityEvent('usr-1', 'ws-123', 'AUTH_FAILURE', 'Invalid password attempted', '192.168.1.1');

            expect(prisma.privacyLog.create).toHaveBeenCalledWith({
                data: {
                    userId: 'usr-1',
                    workspaceId: 'ws-123',
                    action: 'SECURITY_EVENT: AUTH_FAILURE',
                    confirmedText: 'Invalid password attempted',
                    ip: '192.168.1.1'
                }
            });
        });

        it('should convert anonymous userId to null and handle database errors without crashing', async () => {
            (prisma.privacyLog.create as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            await expect(
                logSecurityEvent('anonymous', null, 'RATE_LIMIT_EXCEEDED', 'Too many requests')
            ).resolves.not.toThrow();
        });
    });

    describe('os-utils.ts (openExternal)', () => {
        const originalWindowOpen = window.open;

        beforeEach(() => {
            window.open = jest.fn();
        });

        afterEach(() => {
            window.open = originalWindowOpen;
        });

        it('should open URL via window.open when in Web mode', async () => {
            (isDesktopTarget as jest.Mock).mockReturnValue(false);

            await openExternal('https://koreki.org/docs');

            expect(window.open).toHaveBeenCalledWith('https://koreki.org/docs', '_blank', 'noopener,noreferrer');
        });
    });

    describe('pdf-utils.ts (PDF Cleaning & Formatting)', () => {
        it('should strip PANG engine block from feedback string', () => {
            const rawFeedback = 'Gute Arbeit!\n\n[⚙️ PANG Engine v2.1]\n- Status: OK';
            const cleaned = stripPangBlock(rawFeedback);

            expect(cleaned.trim()).toBe('Gute Arbeit!');
        });

        it('should clean emojis, system marks, and didactical codes for Helvetica PDF rendering', () => {
            const rawText = '[⚙️ Check] Richtig gelöst 😊!';
            const cleaned = cleanDidacticalMarks(rawText);

            expect(cleaned).toBe('[System Check] Richtig gelöst !');
        });

        it('should format Markdown tables cleanly for PDF rendering', () => {
            const rawTable = `
| Kriterium | Punkte |
| --- | --- |
| Formel | 5/5 |
| Rechnung | 5/5 |
`;

            const formatted = formatMarkdownTableForPDF(rawTable);

            expect(formatted).toContain('• Formel:');
            expect(formatted).toContain('Punkte: 5/5');
            expect(formatted).toContain('• Rechnung:');
        });

        it('should return cleaned text directly if markdown table has fewer than 3 lines', () => {
            const shortText = '| Kriterium | Punkte |';
            const formatted = formatMarkdownTableForPDF(shortText);

            expect(formatted).toBe('| Kriterium | Punkte |');
        });
    });
});
