import React from 'react';
import MinimalFooter from '../components/layout/MinimalFooter';

/**
 * AppLayout Component
 * 
 * The persistent application shell for Koreki.
 * It provides the font hierarchy and a consistent bg-background.
 */
interface AppLayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, showFooter = true }) => {
    return (
        <div className="min-h-screen bg-background flex flex-col relative">
            <main className="flex-grow relative z-20">
                {children}
            </main>
            
            {showFooter && (
                <div className="relative z-0">
                    <MinimalFooter />
                </div>
            )}
        </div>
    );
};

export default AppLayout;
