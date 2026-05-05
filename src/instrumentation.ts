/**
 * Next.js Instrumentation Hook
 * Used for server-side maintenance tasks and observability.
 */
export async function register() {
    // Only run in the Node.js runtime (not Edge)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const cron = await import('node-cron');
            const { cleanupLogs } = await import('../prisma/scripts/cleanup-logs.js');
            const { default: prisma } = await import('./lib/prisma');

            // --- PILLAR 6: AUTOMATED DATA RETENTION ---
            // Trigger once on startup to verify functionality and keep DB lean
            cleanupLogs(prisma).catch(err => console.error('[INSTRUMENTATION FATAL] Startup Cleanup failed:', err.message));

            // Schedule: Daily at 3:00 AM
            cron.schedule('0 3 * * *', async () => {
                try {
                    await cleanupLogs(prisma);
                } catch (err: any) {
                    console.error('[CRON FATAL] Pillar 6 Cleanup failed:', err.message);
                }
            });

            console.log('[INSTRUMENTATION] Security Guard Active: Pillar 6 (Retention) scheduled daily at 03:00.');
        } catch (error: any) {
            console.error('[INSTRUMENTATION ERROR] Failed to initialize security cron:', error.message);
        }
    }
}
