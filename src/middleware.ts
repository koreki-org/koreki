import { NextRequest, NextResponse } from 'next/server';
import { isLocalInstance } from './lib/env-context';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    
    const oidcIssuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || '';
    let oidcOrigin = '';
    try {
        if (oidcIssuer) {
            const url = new URL(oidcIssuer);
            oidcOrigin = url.origin;
        }
    } catch (e) {}
    
    // Nutzerkonfigurierte Ollama-/OpenAI-Adressen erweitern die connect-src.
    //
    // Das ist ausschliesslich ein Feature lokaler Instanzen: dort gehoert der
    // Endpunkt dem Nutzer selbst. Im SaaS wuerde dieselbe Mechanik bedeuten,
    // dass ein gesetztes Cookie die Exfiltrations-Schranke der CSP aufhebt —
    // die Allowlist bleibt dort deshalb fest.
    const allowsUserEndpoints = isLocalInstance();
    const ollamaUrlRaw = allowsUserEndpoints ? request.cookies.get('koreki_ollama_url')?.value : undefined;
    const openaiUrlRaw = allowsUserEndpoints ? request.cookies.get('koreki_openai_url')?.value : undefined;

    const extraConnects: string[] = [];
    if (ollamaUrlRaw) {
        try {
            const decoded = decodeURIComponent(ollamaUrlRaw).trim();
            if (decoded) {
                const url = new URL(decoded);
                if (url.origin && url.origin !== 'null') {
                    extraConnects.push(url.origin);
                }
            }
        } catch (e) {}
    }
    if (openaiUrlRaw) {
        try {
            const decoded = decodeURIComponent(openaiUrlRaw).trim();
            if (decoded) {
                const url = new URL(decoded);
                if (url.origin && url.origin !== 'null') {
                    extraConnects.push(url.origin);
                }
            }
        } catch (e) {}
    }
    
    const isDev = process.env.NODE_ENV === 'development';
    const devConnect = isDev ? '* ws: wss:' : '';
    
    const connectSrc = [
        "'self'",
        "https://api.mistral.ai",
        "https://auth.koreki.org",
        "http://localhost:11434",
        "http://127.0.0.1:11434",
        oidcOrigin,
        devConnect,
        ...extraConnects
    ].filter(Boolean).join(' ');
    
    const csp = `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://auth.koreki.org ${oidcOrigin}; connect-src ${connectSrc}; frame-src 'self' https://auth.koreki.org ${oidcOrigin};`;
    
    response.headers.set('Content-Security-Policy', csp);
    
    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
