import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../src/pages/api/org-admin/remove-member';
import prisma from '../../src/lib/prisma';

// 1. Fully self-contained Logto Mock
jest.mock('../../src/lib/logto', () => ({
  logtoClient: {
    withLogtoApiRoute: (handler: any) => handler,
  },
}));

// 2. Robust, self-contained Prisma Mock
// We define the mock functions first so we can reference them in tests
const mockTransactionClient = {
  membership: { 
    delete: jest.fn().mockResolvedValue({}), 
    findMany: jest.fn().mockResolvedValue([]) 
  },
  user: { update: jest.fn().mockResolvedValue({}) },
  workspace: { update: jest.fn().mockResolvedValue({}) },
  privacyLog: { create: jest.fn().mockResolvedValue({}) },
};

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { 
        findFirst: jest.fn(),
        findUnique: jest.fn()
    },
    membership: { findUnique: jest.fn() },
    privacyLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(cb => cb(mockTransactionClient)),
  },
}));

describe('Multitenancy Isolation Audit (Layer 2)', () => {

  let req: any;
  let res: Partial<NextApiResponse>;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    req = {
      headers: { 'x-forwarded-for': '127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' } as any,
      body: {},
      query: {},
      user: { isAuthenticated: false },
      ip: '127.0.0.1'
    } as any;
  });

  const mockClaims = {
    sub: 'logto-admin-A',
    iss: 'https://logto.test',
    aud: 'koreki-app',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  };

  it('should block an admin from Org A attempting to remove a user from Org B (403 Forbidden)', async () => {
    req = {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' } as any,
      body: { membershipId: 'membership-org-B', targetUserId: 'user-B', workspaceId: 'ORG_B_ID' },
      query: {},
      // @ts-ignore
      user: { isAuthenticated: true, claims: mockClaims },
      ip: '127.0.0.1'
    };

    const mockAdminUser = {
      id: 'admin-A',
      logtoId: 'logto-admin-A',
      role: 'USER',
      memberships: [{ workspaceId: 'ORG_A_ID', role: 'ADMIN' }]
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockAdminUser);

    (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
      id: 'membership-org-B',
      workspaceId: 'ORG_B_ID', // Different Organization!
      userId: 'user-B'
    });

    await handler(req as any, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringMatching(/Organisations-Administratorrechte erforderlich/i)
    }));
  });

  it('should allow an admin from Org A to remove their own member (Baseline)', async () => {
    req = {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' } as any,
      body: { membershipId: 'membership-org-A', targetUserId: 'user-A', workspaceId: 'ORG_A_ID' },
      query: {},
      // @ts-ignore
      user: { isAuthenticated: true, claims: mockClaims },
      ip: '127.0.0.1'
    };

    const mockAdminUser = {
      id: 'admin-A',
      logtoId: 'logto-admin-A',
      role: 'USER',
      memberships: [{ workspaceId: 'ORG_A_ID', role: 'ADMIN' }]
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockAdminUser);

    (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        id: 'membership-org-A',
        workspaceId: 'ORG_A_ID', // Same Organization!
        userId: 'user-A'
    });

    await handler(req as any, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

});
