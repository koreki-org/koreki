import prisma from './prisma';
import { logger } from './logger';

export type SecurityEvent = 
    | 'AUTH_FAILURE' 
    | 'ACCESS_DENIED' 
    | 'RATE_LIMIT_EXCEEDED' 
    | 'PRIVILEGE_ESCALATION_ATTEMPT'
    | 'AI_PIPELINE_ANOMALY'
    | 'SECURITY_ANOMALY'
    | 'LOGIN_SUCCESS';

/**
 * Logs a technical security event to the PrivacyLog table.
 */
export async function logSecurityEvent(
    userId: string | null, 
    workspaceId: string | null, 
    event: SecurityEvent, 
    details: string, 
    ip?: string
) {
    try {
        const targetUserId = userId === 'anonymous' ? null : userId;
        
        await prisma.privacyLog.create({
            data: {
                userId: targetUserId,
                workspaceId,
                action: `SECURITY_EVENT: ${event}`,
                confirmedText: details, // Reusing field for details
                ip: ip || null
            }
        });
    } catch (error) {
        // [Industrial Recovery] 🛡️
        // If the database insert fails (e.g. FK violation), we must NOT crash the app. 
        // We log it to console/standard logger so it's captured in the container logs.
        logger.error('[AUDIT FATAL] Failed to log security event', { 
            event, 
            userId, 
            message: error instanceof Error ? error.message : String(error) 
        });
    }
}
