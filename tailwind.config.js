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
                glass: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            },
            fontFamily: {
                outfit: ["var(--font-outfit)", "Inter", "sans-serif"],
            },
        },
    },
    plugins: [],
};
