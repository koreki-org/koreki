import type { NextApiResponse } from 'next';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { getAVVByVersion } from '../../../config/legal';

/**
 * Legal Document Download API ⚖️📥
 * Delivers the specific version of an AVV that a user accepted.
 * In this implementation, it delivers the raw Markdown for audit proof.
 * (Can be extended to PDF if needed)
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // SECURITY POLICY: Raw .md downloads are disabled in favor of 'View & Print' only.
    // This prevents unauthorized storage of unformatted legal source files.
    return res.status(403).json({ 
        error: 'Download deaktiviert.', 
        message: 'Aus Sicherheitsgründen ist der direkte Download von .md Dateien deaktiviert. Bitte nutzen Sie die "Anzeigen & Drucken" Funktion im Dashboard.' 
    });
});
