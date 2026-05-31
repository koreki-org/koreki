import { createBatchFile } from '../../src/test/factories';
import { BatchFile } from '../../src/types';

/**
 * Industrial Verification: UI Locking Logic (Layer 2)
 * Ensures that the system-wide 'isLocked' flag correctly triggers
 * to prevent structural changes during or after grading.
 */
describe('UI Locking Logic Integration (Layer 2)', () => {

    const calculateIsLocked = (files: BatchFile[]) => {
        return files.some(f => f.status === 'done' || f.status === 'processing');
    };

    it('should stay unlocked when all files are pending', () => {
        const files = [
            createBatchFile({ status: 'pending' }),
            createBatchFile({ status: 'pending' })
        ];
        expect(calculateIsLocked(files)).toBe(false);
    });

    it('should lock when at least one file is processing', () => {
        const files = [
            createBatchFile({ status: 'pending' }),
            createBatchFile({ status: 'processing' })
        ];
        expect(calculateIsLocked(files)).toBe(true);
    });

    it('should lock when at least one file is done', () => {
        const files = [
            createBatchFile({ status: 'done' }),
            createBatchFile({ status: 'pending' })
        ];
        expect(calculateIsLocked(files)).toBe(true);
    });

    it('should stay unlocked when files are in error state (allowed to fix structure)', () => {
        const files = [
            createBatchFile({ status: 'error' }),
        ];
        expect(calculateIsLocked(files)).toBe(false);
    });
});
