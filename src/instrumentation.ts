import { toErrorMessage } from './lib/error-message';
/**
 * Next.js Instrumentation Hook
 * Used for server-side maintenance tasks and observability.
 */
export async function register() {
    // Only run in the Node.js runtime (not Edge)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            // Configure Undici global dispatcher to prevent 30s HeadersTimeoutError on slow LLMs
            try {
                const { Agent, setGlobalDispatcher } = await import('undici');
                setGlobalDispatcher(new Agent({
                    headersTimeout: 300000, // 5 minutes
                    bodyTimeout: 300000,    // 5 minutes
                    connectTimeout: 60000   // 1 minute
                }));
                console.log('[INSTRUMENTATION] Undici global dispatcher configured with 5-minute timeouts.');
            } catch (err) {
                console.warn('[INSTRUMENTATION WARNING] Failed to set global undici dispatcher:', toErrorMessage(err));
            }

            // --- TIER-GUARD ---
            // Säule 6 setzt eine Koreki-Datenbank voraus. Community und Desktop
            // persistieren bewusst dateibasiert (siehe community-edition-persistence.md);
            // dort existiert weder eine PrivacyLog-Tabelle noch eine erreichbare
            // DATABASE_URL. Der Aufräumjob scheiterte dort bislang bei jedem Start.
            const { isLocalInstance } = await import('./lib/env-context');
            if (isLocalInstance()) {
                console.log('[INSTRUMENTATION] Local instance without database — skipping Pillar 6 retention.');
                return;
            }

            const cron = await import('node-cron');
            const { cleanupLogs } = await import('../prisma/scripts/cleanup-logs.js');
            const { default: prisma } = await import('./lib/prisma');

            // --- PILLAR 6: AUTOMATED DATA RETENTION ---
            // Verify if DB is reachable before scheduling retention
            prisma.$connect()
                .then(() => {
                    // Trigger once on startup to verify functionality and keep DB lean
                    cleanupLogs(prisma).catch(err => console.error('[INSTRUMENTATION FATAL] Startup Cleanup failed:', err.message));

                    // Schedule: Daily at 3:00 AM
                    cron.schedule('0 3 * * *', async () => {
                        try {
                            await cleanupLogs(prisma);
                        } catch (err) {
                            console.error('[CRON FATAL] Pillar 6 Cleanup failed:', toErrorMessage(err));
                        }
                    });
                    console.log('[INSTRUMENTATION] Security Guard Active: Pillar 6 (Retention) scheduled daily at 03:00.');
                })
                .catch(() => {
                    console.log('[INSTRUMENTATION] Database not available (offline/desktop mode). Skipping automated data retention.');
                });
        } catch (error) {
            console.error('[INSTRUMENTATION ERROR] Failed to initialize security cron:', toErrorMessage(error));
        }
    }
}
