/**
 * Core cleanup logic for automated data retention (Pillar 6). 
 * Now exportable for both CLI and in-app use.
 */
async function cleanupLogs(existingPrisma = null) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = existingPrisma || new PrismaClient();
    const RETENTION_DAYS = 90;

    console.log(`[CLEANUP] Starting Automated Data Retention (Pillar 6) - ZERO-OPS...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    console.log(`[CLEANUP] Target: Deleting entries older than ${cutoffDate.toISOString()}`);
    
    try {
        // 1. Cleanup Privacy & Audit Logs (The core requirement)
        const deletedLogs = await prisma.privacyLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate
                }
            }
        });
        console.log(`[CLEANUP] Success! Removed ${deletedLogs.count} entries from PrivacyLog.`);

        // 2. Cleanup old processed Stripe sessions (Maintenance)
        const deletedSessions = await prisma.processedStripeSession.deleteMany({
            where: {
                processedAt: {
                    lt: cutoffDate
                }
            }
        });
        console.log(`[CLEANUP] Success! Removed ${deletedSessions.count} entries from ProcessedStripeSession.`);

        console.log(`------------------------------------------------------------`);
        console.log(`[PILLAR 6] SUCCESS: Automated Data Retention finished.`);
        console.log(`[PILLAR 6] TIMESTAMP: ${new Date().toISOString()}`);
        console.log(`------------------------------------------------------------`);

        return { logs: deletedLogs.count, sessions: deletedSessions.count };
    } catch (error) {
        console.error(`[CLEANUP] FATAL ERROR:`, error.message);
        throw error;
    } finally {
        if (!existingPrisma) {
            await prisma.$disconnect();
        }
    }
}

// Support for direct CLI execution
if (require.main === module) {
    cleanupLogs().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { cleanupLogs };
