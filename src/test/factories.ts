import { Task } from '../lib/logic';
import { BatchFile, User } from '../types';

/**
 * Factory for creating Task objects for tests.
 */
export const createTask = (overrides?: Partial<Task>): Task => ({
  name: 'Aufgabe 1',
  maxPoints: 10,
  pointsObtained: 0,
  content: 'Beispielinhalt',
  feedback: '',
  confidence: 100,
  ...overrides,
});

/**
 * Factory for creating BatchFile objects for tests.
 */
export const createBatchFile = (overrides?: Partial<BatchFile>): BatchFile => ({
  name: 'Schüler #1',
  status: 'pending',
  result: null,
  error: null,
  documentType: 'typed',
  estimatedCredits: 1,
  ocrDone: false,
  selected: true,
  pageCount: 1,
  ...overrides,
});

/**
 * Factory for creating User/UserData objects for tests.
 */
export const createUser = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  logtoId: 'logto-123',
  username: 'testuser',
  credits: 100,
  hasProAccess: false,
  role: 'USER',
  appMode: 'TRIAL',
  avvAccepted: true,
  activeWorkspaceId: 'ws-123',
  ...overrides,
});
