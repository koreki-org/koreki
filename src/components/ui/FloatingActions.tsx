import React from 'react';

interface FloatingActionsProps {
    children: React.ReactNode;
    className?: string;
    onClick?: React.MouseEventHandler;
}

/**
 * Koreki Premium Floating Action Pill
 * Unified UI component for hovering actions on cards and list items.
 */
export const FloatingActions: React.FC<FloatingActionsProps> = ({ 
    children, 
    className = "",
    onClick
}) => {
    return (
        <div 
            onClick={onClick}
            className={`absolute flex items-center gap-0.5 p-1.5 bg-background/95 backdrop-blur-sm shadow-xl shadow-primary/10 border border-primary/5 rounded-2xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 scale-90 group-hover:scale-100 z-30 ${className}`}
        >
            {children}
        </div>
    );
};
