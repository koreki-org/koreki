import { logtoClient } from '@/lib/logto';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  try {
    if (action === 'sign-in') {
      console.log('[Logto] redirectUri being sent:', 'https://koreki.org/api/logto/callback');
      return await logtoClient.handleSignIn({ 
        redirectUri: 'https://koreki.org/api/logto/callback', 
        postRedirectUri: '/app' 
      })(req, res);
    }

    if (action === 'sign-up') {
      console.log('[Logto] redirectUri being sent (sign-up):', 'https://koreki.org/api/logto/callback');
      return await logtoClient.handleSignIn({ 
        redirectUri: 'https://koreki.org/api/logto/callback', 
        postRedirectUri: '/app',
        interactionMode: 'signUp'
      })(req, res);
    }

    if (action === 'forgot-password') {
      return await logtoClient.handleSignIn({
        redirectUri: 'https://koreki.org/api/logto/callback',
        postRedirectUri: '/app',
        firstScreen: 'reset_password'
      })(req, res);
    }

    if (action === 'sign-out') {
      return await logtoClient.handleSignOut('https://koreki.org')(req, res);
    }

    if (action === 'callback') {
      return await logtoClient.handleSignInCallback('/app')(req, res);
    }

    res.status(404).json({ message: 'Unknown action' });

  } catch (error: any) {
    if (error.code === 'sign_in_session.not_found') {
      return res.redirect('/login?error=session_lost');
    }
    console.error('[Logto] Auth Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
