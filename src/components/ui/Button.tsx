import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background active:scale-95',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg',
                destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'underline-offset-4 hover:underline text-primary',
                chip: 'bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-primary-foreground font-bold uppercase tracking-wider',
            },
            size: {
                default: 'h-10 py-2 px-4',
                sm: 'h-9 px-3 rounded-md',
                lg: 'h-11 px-8 rounded-lg text-base',
                icon: 'h-10 w-10',
                xs: 'h-8 px-3 rounded-lg text-xxs',
            },
            shape: {
                default: '',
                // Kapselt den Marketing-"Pill-CTA"-Look (siehe Hero-/Deep-Dive-CTAs auf den
                // Marketing-Seiten): voll gerundet, angehobener Custom-Shadow-Ton, dezenter
                // Hover-Lift. Ersetzt bisherige Ad-hoc-Duplikate von rounded-full + shadow-*.
                // Bewusst Sentence-Case (kein uppercase/tracking-widest) — Uppercase-CTAs
                // erzeugten zusammen mit den Badges einen zu "hypigen" Gesamteindruck.
                // Uppercase/tracking-widest bleibt Badge.tsx vorbehalten (dortige Konvention).
                pill: 'relative overflow-hidden rounded-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 group',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
            shape: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    /** Nur in Kombination mit shape="pill" sinnvoll: blendet den Shimmer-Overlay-Effekt der Hero-CTAs ein. */
    shimmer?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, shape, shimmer, isLoading, children, type = 'button', ...props }, ref) => {
        return (
            <button
                type={type}
                className={cn(buttonVariants({ variant, size, shape, className }))}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {shimmer && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                )}
                {isLoading && (
                    <svg
                        style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }}
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
