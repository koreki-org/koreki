import React from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Logo from '@/components/Logo';

interface AdminHeaderProps {
    title: string;
    subtitle?: string;
    institution?: string;
    backPath?: string;
    backLabel?: string;
    rightContent?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
    title,
    subtitle,
    institution,
    backPath = '/app',
    backLabel = 'Zurück zum Cockpit',
    rightContent
}) => {
    const router = useRouter();

    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
            <div className="space-y-6">
                {/* Unified Breadcrumb Back Button */}
                <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(backPath)}
                    className="group -ml-2 text-xs font-bold text-muted-foreground uppercase tracking-wide hover:bg-transparent hover:text-primary transition-colors pr-4"
                >
                    <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    {backLabel}
                </Button>
                
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Logo 
                            size={48} 
                        />
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                                {title}<span className="text-primary">.</span>
                            </h1>
                            {institution ? (
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-1">
                                    <Building2 size={14} className="text-primary" />
                                    {institution}
                                </p>
                            ) : subtitle ? (
                                <p className="text-sm font-medium text-muted-foreground mt-1">{subtitle}</p>
                            ) : null}
                        </div>
                    </div>

                    {!institution && (
                        <>
                            <div className="hidden md:block h-12 w-px bg-border ml-2" />
                            <div className="hidden md:flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Enterprise Environment v2.0</p>
                                </div>
                                <p className="text-sm font-semibold text-foreground">Multi-Tenant Management</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Dynamic Right Content (Stats/Actions) */}
            {rightContent && (
                <div className="flex gap-4 w-full md:w-auto">
                    {rightContent}
                </div>
            )}
        </header>
    );
};
