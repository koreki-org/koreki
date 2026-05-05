import React from 'react';
import MarketingHeader from '../components/layout/MarketingHeader';
import MarketingFooter from '../components/layout/MarketingFooter';
import BackgroundGradients from '../components/layout/BackgroundGradients';

/**
 * MarketingLayout Component
 * 
 * The public-facing shell for Koreki.
 * Now unified with the 'Ambient Shell' design system for a cohesive brand identity.
 */
interface MarketingLayoutProps {
    children: React.ReactNode;
    hideHeader?: boolean;
    hideFooter?: boolean;
}

const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children, hideHeader = false, hideFooter = false }) => {
    return (
        <div className="min-h-screen bg-background font-outfit overflow-x-hidden flex flex-col relative">
            {/* Unified Ambient Shell */}
            <BackgroundGradients />

            {!hideHeader && (
                <div className="sticky top-0 z-[1000] w-full">
                    <MarketingHeader />
                </div>
            )}
            
            <main className="flex-grow relative z-10">
                {children}
            </main>
            
            {!hideFooter && (
                <div className="relative z-10">
                    <MarketingFooter />
                </div>
            )}
        </div>
    );
};

export default MarketingLayout;
