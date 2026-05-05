import React from 'react';
import { Shield } from 'lucide-react';
import { AppSettings } from '@/types';
import { UnifiedAiConfig } from './UnifiedAiConfig';
import { Input } from '@/components/ui/Input';
import { isLocalInstance } from '@/lib/env-context';

interface AIProviderSectionProps {
    settings: AppSettings;
    onSave: (updates: Partial<AppSettings>) => void;
    isAdmin: boolean;
}

export const AIProviderSection: React.FC<AIProviderSectionProps> = ({ settings, onSave, isAdmin }) => {
    // Show nothing if not authorized
    if (!isAdmin) return null;

    const isGlobalAdmin = isAdmin; // Simplified for now

    return (
        <div className="mb-8">
            <div className="mb-8">
                <UnifiedAiConfig 
                    settings={settings} 
                    onSave={onSave} 
                    mode="ADMIN" 
                />
            </div>
        </div>
    );
};

