import React from 'react';
import { Button } from './ui/Button';
import { AppSettings } from '@/types';
import { UnifiedAiConfig } from './settings/UnifiedAiConfig';

interface AiConfigurationContentProps {
    initialSettings: Partial<AppSettings>;
    onSaveOllama: (url: string, model: string) => void;
    onSaveMistral: (key: string) => void;
    onSaveCustom?: (url: string, key: string, model: string, thinking: boolean) => void;
    isInline?: boolean;
}

const AiConfigurationContent: React.FC<AiConfigurationContentProps> = ({ 
    initialSettings, onSaveOllama, onSaveMistral, onSaveCustom, isInline = false
}) => {
    const [settings, setSettings] = React.useState<Partial<AppSettings>>(initialSettings);

    const handleSave = (updates: Partial<AppSettings>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
    };

    const applyConfiguration = () => {
        if (settings.provider === 'ollama') {
            onSaveOllama(settings.ollamaUrl || 'http://127.0.0.1:11434', settings.ollamaModel || 'qwen3.6:35b');
        } else if (settings.provider === 'mistral') {
            onSaveMistral(settings.mistralKey || '');
        } else if (settings.provider === 'openai-compatible') {
            if (onSaveCustom) {
                onSaveCustom(
                    settings.openaiUrl || '', 
                    settings.openaiKey || '', 
                    settings.openaiModel || '', 
                    settings.enableThinking || false
                );
            } else {
                // Fallback for generic save
                onSaveMistral(settings.openaiKey || ''); 
            }
        }
    };

    const containerClasses = isInline 
        ? "bg-muted/50 p-5 rounded-2xl border border-border animate-fade-in" 
        : "space-y-6 animate-fade-in";

    return (
        <div className={containerClasses}>
            <UnifiedAiConfig 
                settings={settings}
                onSave={handleSave}
                mode="USER_SETUP"
            />

            <div className="pt-4">
                <Button 
                    onClick={applyConfiguration} 
                    className="w-full rounded-2xl font-black h-14 text-sm shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Konfiguration anwenden
                </Button>
            </div>
        </div>
    );
};

export default AiConfigurationContent;
