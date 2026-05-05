import { useMemo } from 'react';
import { BatchFile } from '../types';
import { calculateAnalytics } from '../lib/analytics-logic';

export const useCorrectionStatistics = (batchFiles: BatchFile[]) => {
    return useMemo(() => calculateAnalytics(batchFiles), [batchFiles]);
};
