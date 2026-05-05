import prisma from '../../../src/lib/prisma';
import { getLegalDocument } from '../../../src/lib/legal';
import { getComplianceSsrProps } from '../../../src/lib/compliance';

// 1. Mock dependent modules
jest.mock('../../../src/lib/legal', () => ({
  getLegalDocument: jest.fn(),
}));

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    privacyLog: { findFirst: jest.fn() },
  },
}));

describe('Compliance Service Unit Tests (Layer 1)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getComplianceSsrProps', () => {
    it('should return the latest version for unauthenticated requests', async () => {
      (getLegalDocument as jest.Mock).mockReturnValue({
        version: '1.2',
        content: 'Latest AGB Content',
        hash: 'H_LATEST'
      });

      const props = await getComplianceSsrProps('agb', null);

      expect(props.version).toBe('1.2');
      expect(props.isAcceptedVersion).toBe(false);
      expect(getLegalDocument).toHaveBeenCalledWith('agb', null);
    });

    it('should retrieve the accepted version for a logged-in user', async () => {
      const mockClaims = { sub: 'user-789' };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeWorkspaceId: 'w-101' });
      (prisma.privacyLog.findFirst as jest.Mock).mockResolvedValue({ avvVersion: '1.1' });
      
      (getLegalDocument as jest.Mock).mockImplementation((type, ver) => {
        if (ver === '1.1') return { version: '1.1', content: 'Correct Old Version', hash: 'H_OLD' };
        return { version: '1.2', content: 'Latest Content', hash: 'H_NEW' };
      });

      const props = await getComplianceSsrProps('avv', mockClaims);

      expect(props.version).toBe('1.1');
      expect(props.isAcceptedVersion).toBe(true);
      expect(getLegalDocument).toHaveBeenCalledWith('avv', '1.1');
    });

    it('should fallback to latest if the historic file is physically missing', async () => {
      const mockClaims = { sub: 'user-789' };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeWorkspaceId: 'w-101' });
      (prisma.privacyLog.findFirst as jest.Mock).mockResolvedValue({ avvVersion: '0.9' });
      
      (getLegalDocument as jest.Mock).mockImplementation((type, ver) => {
        if (ver === '0.9') return null; // File missing
        return { version: '1.2', content: 'Latest Fallback', hash: 'H_FALLBACK' };
      });

      const props = await getComplianceSsrProps('avv', mockClaims);

      expect(props.version).toBe('1.2');
      expect(props.isAcceptedVersion).toBe(false);
      expect(getLegalDocument).toHaveBeenCalledWith('avv', null);
    });

    it('should correctly handle user not having an active workspace', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeWorkspaceId: null });
      (getLegalDocument as jest.Mock).mockReturnValue({ version: '1.0', content: 'C', hash: 'H' });

      const props = await getComplianceSsrProps('tom', { sub: 'u' });

      expect(props.version).toBe('1.0');
      expect(prisma.privacyLog.findFirst).not.toHaveBeenCalled();
    });

    it('should log errors and return error status on crash', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Prisma Crash'));
      
      const props = await getComplianceSsrProps('avv', { sub: 'error-user' });

      expect(props.version).toBe('ERROR');
      expect(props.content).toContain('Fehler');
    });
  });
});
