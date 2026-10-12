/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border) / <alpha-value>)",
                input: "hsl(var(--input) / <alpha-value>)",
                ring: "hsl(var(--ring) / <alpha-value>)",
                background: "hsl(var(--background) / <alpha-value>)",
                foreground: "hsl(var(--foreground) / <alpha-value>)",
                // Ohne diesen Eintrag war `bg-card` ein No-Op: die Klasse existierte
                // nicht, 16 Stellen im Baum setzten damit gar nichts (07.09.2026).
                card: {
                    DEFAULT: "hsl(var(--card) / <alpha-value>)",
                    foreground: "hsl(var(--card-foreground) / <alpha-value>)",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary) / <alpha-value>)",
                    foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
                    foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
                    foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
                },
                warning: {
                    DEFAULT: "hsl(var(--warning) / <alpha-value>)",
                    foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
                },
                success: {
                    DEFAULT: "hsl(var(--success) / <alpha-value>)",
                    foreground: "hsl(var(--success-foreground) / <alpha-value>)",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted) / <alpha-value>)",
                    foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent) / <alpha-value>)",
                    foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
                },
                wash: "hsl(var(--wash) / <alpha-value>)",
                "accent-1": "hsl(var(--accent-1) / <alpha-value>)",
                "accent-2": "hsl(var(--accent-2) / <alpha-value>)",
                "accent-3": "hsl(var(--accent-3) / <alpha-value>)",
                "accent-4": "hsl(var(--accent-4) / <alpha-value>)",
            },
            fontSize: {
                xxs: "0.625rem", // 10px
            },
            borderRadius: {
                hero: "var(--radius-hero)",
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            spacing: {
                'page-inline': 'var(--spacing-page-inline)',
                'section-vertical': 'var(--spacing-section-vertical)',
                'card-padding': 'var(--spacing-card-padding)',
                'card-padding-sm': 'var(--spacing-card-padding-sm)',
                'hero-top': 'var(--spacing-hero-top)',
                'hero-bottom': 'var(--spacing-hero-bottom)',
            },
            backdropBlur: {
                xs: "2px",
                glass: "12px",
            },
            boxShadow: {
                glass: "0 0 0 1px hsl(232 30% 20% / 0.06), 0 12px 24px -6px hsl(232 40% 20% / 0.10), 0 40px 80px -20px hsl(239 50% 30% / 0.22)",
                // Grosser, weicher Schatten fuer Produktbilder auf den Marketing-Seiten.
                lift: "0 0 0 1px hsl(232 30% 20% / 0.06), 0 2px 4px hsl(232 40% 20% / 0.04), 0 12px 24px -6px hsl(232 40% 20% / 0.08), 0 40px 80px -20px hsl(239 50% 30% / 0.18)",
                // Weicher, mehrschichtiger Kartenschatten: ersetzt Rand + shadow-sm.
                card: "0 0 0 1px hsl(232 30% 20% / 0.06), 0 1px 2px hsl(232 40% 20% / 0.05), 0 4px 12px -4px hsl(232 40% 20% / 0.08)",
            },
            fontFamily: {
                // Eine Schrift fuer alles. `font-outfit` bleibt als Alias, damit die
                // 118 Aufrufstellen nicht auf einen Schlag umgeschrieben werden muessen.
                sans: ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
                outfit: ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
            },
        },
    },
    plugins: [],
};
