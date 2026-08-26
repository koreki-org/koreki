/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['remark-gfm', 'react-markdown'],
    webpack: (config, { dev }) => {
        config.module.rules.push({
            test: /\.md$/,
            type: 'asset/source',
        });
        // Removed config.cache = false as it disables Webpack caching in dev mode, 
        // leading to massive performance and RAM issues.
        return config;
    },
    reactStrictMode: true,
    // Die App-Version wandert in jeden Protokolleintrag (Art. 12 KI-VO). Die
    // Prompts haengen ueber Git am Build, deshalb identifiziert die Version den
    // verwendeten Prompt-Stand.
    env: {
        NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
    },
    // TypeScript strict mode: Build fails on type errors.
    // All 21 original TS errors were resolved (2026-05-03).
    typescript: {
        ignoreBuildErrors: false,
    },
    // INTENTIONAL: ESLint is run separately in CI (npm run lint). Skipped during build
    // to keep build times fast and avoid false positives from generated Prisma types.
    eslint: {
        ignoreDuringBuilds: true,
    },
    productionBrowserSourceMaps: false,
    output: (process.env.NEXT_PUBLIC_KOREKI_MODE === 'desktop' || process.env.NEXT_PUBLIC_KOREKI_DESKTOP === 'true') ? 'export' : 'standalone',
    images: {
        unoptimized: true,
    },
    async headers() {
        const isDesktop = process.env.NEXT_PUBLIC_KOREKI_MODE === 'desktop' || process.env.NEXT_PUBLIC_KOREKI_DESKTOP === 'true';
        if (isDesktop) return [];
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
                    },
                    {
                        // INTENTIONAL: 'unsafe-inline' and 'unsafe-eval' are required by Next.js
                        // Pages Router (inline scripts for hydration, React Fast Refresh in dev).
                        // Nonce-based CSP would require a Custom Server, increasing self-hosting
                        // complexity for schools — an unacceptable trade-off for our target audience.
                        // XSS risk is mitigated by: no dangerouslySetInnerHTML, Zod input validation,
                        // and React's built-in output encoding.
                        key: 'Content-Security-Policy',
                        value: (() => {
                            const oidcIssuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || '';
                            let oidcOrigin = '';
                            try {
                                if (oidcIssuer) {
                                    const url = new URL(oidcIssuer);
                                    oidcOrigin = url.origin;
                                }
                            } catch (e) {}
                            
                            const isDev = process.env.NODE_ENV === 'development';
                            const devConnect = isDev ? '* ws: wss:' : '';
                            return `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://auth.koreki.org ${oidcOrigin}; connect-src 'self' https://api.mistral.ai https://auth.koreki.org http://localhost:11434 http://127.0.0.1:11434 ${oidcOrigin} ${devConnect}; frame-src 'self' https://auth.koreki.org ${oidcOrigin};`;
                        })()
                    }
                ]
            }
        ];
    },
    async redirects() {
        const isDesktop = process.env.NEXT_PUBLIC_KOREKI_MODE === 'desktop' || process.env.NEXT_PUBLIC_KOREKI_DESKTOP === 'true';
        if (isDesktop) return [];
        return [
            {
                source: '/:path*',
                has: [
                    {
                        type: 'host',
                        value: 'old.koreki.org',
                    },
                ],
                destination: 'https://koreki.org/:path*',
                permanent: true,
            },
            {
                source: '/:path*',
                has: [
                    {
                        type: 'host',
                        value: 'www.old.koreki.org',
                    },
                ],
                destination: 'https://koreki.org/:path*',
                permanent: true,
            }
        ];
    },
}

module.exports = nextConfig
