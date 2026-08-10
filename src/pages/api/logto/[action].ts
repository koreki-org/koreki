import { logtoClient } from '@/lib/logto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { logger } from '@/lib/logger';

// @security-audit-exclude
// Diese Route IST der Anmeldevorgang und kann den withSecurity-Wrapper nicht
// nutzen: der Wrapper setzt eine bestehende Logto-Session voraus, die hier erst
// entsteht. Die Ausnahme ist damit strukturell, nicht historisch.
//
// Was die Route dennoch sicher macht:
// - `redirectUri` und `postRedirectUri` sind serverseitige Konstanten aus
//   NEXT_PUBLIC_BASE_URL. Es gibt keinen Query-Parameter, der das Ziel steuert —
//   ein Open Redirect ueber diesen Endpunkt ist nicht moeglich.
// - `action` wird gegen eine feste Liste geprueft, alles andere endet in 404.
// - Brute-Force-Schutz und Ratenbegrenzung des Logins liegen bei Logto selbst.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/logto/callback`;

  try {
    if (action === 'sign-in') {
      logger.info('[Logto] redirectUri being sent', { redirectUri });
      return await logtoClient.handleSignIn({ 
        redirectUri, 
        postRedirectUri: '/app' 
      })(req, res);
    }

    if (action === 'sign-up') {
      logger.info('[Logto] redirectUri being sent (sign-up)', { redirectUri });
      return await logtoClient.handleSignIn({ 
        redirectUri, 
        postRedirectUri: '/app',
        interactionMode: 'signUp'
      })(req, res);
    }

    if (action === 'forgot-password') {
      return await logtoClient.handleSignIn({
        redirectUri,
        postRedirectUri: '/app',
        firstScreen: 'reset_password'
      })(req, res);
    }

    if (action === 'sign-out') {
      return await logtoClient.handleSignOut(baseUrl)(req, res);
    }

    if (action === 'callback') {
      return await logtoClient.handleSignInCallback('/app')(req, res);
    }

    res.status(404).json({ message: 'Unknown action' });

  } catch (error: any) {
    if (error.code === 'sign_in_session.not_found') {
      return res.redirect('/login?error=session_lost');
    }
    logger.error('[Logto] Auth Error', { message: error.message || error });
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
