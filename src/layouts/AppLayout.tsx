import React from 'react';
import MinimalFooter from '../components/layout/MinimalFooter';
import BackgroundGradients from '../components/layout/BackgroundGradients';

/**
 * AppLayout Component
 * 
 * The persistent application shell for Koreki.
 * It provides the BackgroundGradients, font-outfit hierarchy, 
 * and consistent bg-background.
 */
interface AppLayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, showFooter = true }) => {
    return (
        <div className="min-h-screen bg-background font-outfit flex flex-col relative">
            {/* Global Ambient Shell */}
            <BackgroundGradients />
            
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
