import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

/**
 * CollapsibleCardContent
 *
 * Shared primitive for cards that need to auto-collapse their body while
 * keeping the content mounted (no unmount/remount, no layout jank on remount).
 * Uses a transition on max-height/opacity per the Koreki motion standard
 * (`transition-all duration-300`).
 *
 * Rationale: avoids duplicating collapse/chevron logic across
 * ModelSolutionCard and StudentWorkCard (see UI Expert governance).
 */
interface CollapsibleCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
    collapsed?: boolean;
    children: React.ReactNode;
}

export const CollapsibleCardContent: React.FC<CollapsibleCardContentProps> = ({
    collapsed = false,
    className,
    children,
    ...props
}) => {
    return (
        <CardContent
            aria-hidden={collapsed}
            className={cn(
                'transition-all duration-300 overflow-hidden',
                collapsed ? 'max-h-0 !py-0 opacity-0 pointer-events-none' : 'max-h-[5000px] opacity-100',
                className
            )}
            {...props}
        >
            {children}
        </CardContent>
    );
};

interface CollapseToggleButtonProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
    label: string;
}

/**
 * Chevron trigger for CollapsibleCardContent. Rendered by the consuming card
 * in its own CardHeader button row, only when a toggle handler is provided.
 * Mirrors the plain rotating-chevron pattern used by BatchFileListItem's
 * "Details" toggle (ghost, no chip border) rather than the bolder chip style.
 */
export const CollapseToggleButton: React.FC<CollapseToggleButtonProps> = ({
    collapsed,
    onToggleCollapse,
    label,
}) => {
    const actionLabel = collapsed ? `${label} ausklappen` : `${label} einklappen`;

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground transition-transform duration-300 rounded-lg"
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={actionLabel}
            title={actionLabel}
        >
            <ChevronDown size={18} />
        </Button>
    );
};
