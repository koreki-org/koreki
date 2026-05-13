import React from 'react';

interface FloatingActionsProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Koreki Premium Floating Action Pill
 * Unified UI component for hovering actions on cards and list items.
 */
export const FloatingActions: React.FC<FloatingActionsProps> = ({ 
    children, 
    className = "" 
}) => {
    return (
        <div className={`absolute flex items-center gap-0.5 p-1.5 bg-white shadow-2xl shadow-indigo-200/40 border border-slate-100 rounded-[1.25rem] opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 z-20 ${className}`}>
            {children}
        </div>
    );
};
