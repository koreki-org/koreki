import React from 'react';

interface LogoProps {
    size?: number;
    className?: string;
    showText?: boolean;
    textLarge?: boolean;
    subtitle?: string;
}

const Logo: React.FC<LogoProps> = ({
    size = 32,
    className = '',
    showText = false,
    textLarge = false,
    subtitle = ''
}) => {
    return (
        <div className={`logo-container-root ${className}`} style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            textAlign: 'center'
        }}>
            <div className="logo-top-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: size > 40 ? '1rem' : '0.75rem',
            }}>
                <div className="logo-badge-new" style={{
                    width: size,
                    height: size,
                    minWidth: size,
                    minHeight: size,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderRadius: size * 0.25,
                    background: 'white',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                    border: '1px solid var(--slate-100)',
                    flexShrink: 0
                }}>
                    <img
                        src={`/logo.png?v=2.0.0`}
                        alt="Koreki Logo"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block'
                        }}
                    />
                </div>
                {showText && (
                    <span className={`logo-text-new ${textLarge ? 'large' : ''}`} style={{
                        fontWeight: 800,
                        fontSize: textLarge ? (size > 50 ? '2.4rem' : '2.1rem') : '1.25rem',
                        letterSpacing: '-1.2px',
                        color: 'var(--slate-900)',
                        lineHeight: 1,
                        whiteSpace: 'nowrap'
                    }}>
                        Koreki<span className="logo-dot-new" style={{ color: 'var(--blue-600)' }}>.</span>
                    </span>
                )}
            </div>
            {showText && subtitle && (
                <span className="logo-subtitle-new" style={{
                    fontSize: textLarge ? '0.95rem' : '0.75rem',
                    color: 'var(--slate-500)',
                    fontWeight: 500,
                    marginTop: '0.1rem',
                    letterSpacing: '0.3px',
                    display: 'block',
                    opacity: 0.9
                }}>
                    {subtitle}
                </span>
            )}
            <style jsx>{`
                .logo-text-new.large { font-size: 2.1rem; }
                @media (max-width: 640px) {
                    .logo-text-new { font-size: 1.25rem; }
                    .logo-subtitle-new { font-size: 0.75rem; }
                }
            `}</style>
        </div>
    );
};

export default Logo;
