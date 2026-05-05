import prisma from '@/lib/prisma';
import { getLegalDocument, LegalDocument } from '@/lib/legal';
import { logger } from '@/lib/logger';

export interface ComplianceProps {
    content: string;
    version: string;
    isAcceptedVersion: boolean;
    [key: string]: any; // Satisfy Record<string, unknown> for Next.js SSR
}

/**
 * Core logic for retrieving version-consistent compliance documents.
 * Can be used in getServerSideProps or API routes.
 */
export async function getComplianceSsrProps(
    type: 'avv' | 'tom' | 'betriebsanleitung' | 'agb',
    userClaims: { sub: string } | null
): Promise<ComplianceProps> {
    try {
        let acceptedVersion: string | null = null;

        if (userClaims?.sub) {
            const user = await prisma.user.findUnique({
                where: { logtoId: userClaims.sub },
                select: { activeWorkspaceId: true }
            });

            if (user?.activeWorkspaceId) {
                const latestConsent = await prisma.privacyLog.findFirst({
                    where: {
                        workspaceId: user.activeWorkspaceId,
                        action: 'AVV_CONSENT_ACCEPTED'
                    },
                    orderBy: { createdAt: 'desc' },
                    select: { avvVersion: true }
                });
                
                if (latestConsent?.avvVersion) {
                    // Note: In a production scenario, we'd map 'tom' to a specific consent if needed.
                    // For now, we use the AVV consent as the anchor for the compliance version state.
                    if (type === 'avv') {
                        acceptedVersion = latestConsent.avvVersion;
                    } else if (type === 'tom' || type === 'betriebsanleitung') {
                        // Logic: If they accepted AVV v1.1, they usually saw the accompanying TOM/Manual.
                        // For simplicity, we fallback to latest for these unless specific mapping is needed.
                        acceptedVersion = null; 
                    }
                }
            }
        }

        let doc = getLegalDocument(type, acceptedVersion);
        
        // Fallback to latest if specific version is not found but was requested
        if (!doc && acceptedVersion !== null) {
            logger.warn(`Specific version ${acceptedVersion} for ${type} not found. Falling back to latest.`);
            doc = getLegalDocument(type, null);
            acceptedVersion = null; // Mark as generic/latest display
        }
        
        if (!doc) {
            return { content: `${type.toUpperCase()} Dokument nicht gefunden.`, version: "MISSING", isAcceptedVersion: false };
        }

        return {
            content: doc.content,
            version: doc.version,
            isAcceptedVersion: !!acceptedVersion && doc.version === acceptedVersion,
        };
    } catch (error) {
        logger.error(`Error in getComplianceSsrProps for ${type}:`, error);
        return { content: `Fehler beim Laden der ${type.toUpperCase()}.`, version: "ERROR", isAcceptedVersion: false };
    }
}
