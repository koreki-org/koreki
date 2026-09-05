import React, { useState } from 'react';
import { Cpu, Globe, Zap, Server } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AppSettings } from '@/types';
import { getKorekiMode } from '@/lib/env-context';
import { GEPRUEFTER_ANBIETER, EXPERIMENTELL_KENNZEICHEN } from '@/lib/ai/gepruefte-konfiguration';

// Sub-Components
import { MistralConfig } from './MistralConfig';
import { OllamaConfig } from './OllamaConfig';
import { OpenAICompatibleConfig } from './OpenAICompatibleConfig';

interface UnifiedAiConfigProps {
    settings: Partial<AppSettings>;
    onSave: (updates: Partial<AppSettings>) => void;
    mode: 'ADMIN' | 'USER_SETUP';
    appMode?: string;
}

/**
 * Unified AI Configuration Orchestrator
 * 🏮🏗️🛡️
 */
export const UnifiedAiConfig: React.FC<UnifiedAiConfigProps> = ({ settings, onSave, mode, appMode }) => {
    const korekiMode = getKorekiMode();
    const isSaaS = korekiMode === 'saas';
    
    // Internal state for transient UI values
    const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>(settings);

    const updateSettings = (updates: Partial<AppSettings>) => {
        const newSettings = { ...localSettings, ...updates };
        setLocalSettings(newSettings);
        onSave(updates);
    };

    // --- VIEW: SAAS CARD SELECTION ---
    if (isSaaS && mode === 'USER_SETUP') {
        // ... SaaS card logic remains same ...
        const LocationBadge = ({ location }: { location: string }) => (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/5 text-xxs font-black text-success uppercase tracking-tight border border-success/20">
                <Zap size={10} /> {location}
            </span>
        );

        return (
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={() => updateSettings({ provider: 'mistral' })}
                        className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 text-left ${
                            settings.provider === 'mistral' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-border bg-background'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2.5 rounded-2xl ${settings.provider === 'mistral' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Globe size={20} />
                            </div>
                            <LocationBadge location="Frankreich (EU)" />
                        </div>
                        <h4 className="font-black text-foreground tracking-tight">Mistral AI Standard</h4>
                        <p className="text-xs text-muted-foreground font-medium">Bewährte Performance, DSGVO-konform gehostet in der EU.</p>
                    </button>

                    <button
                        onClick={() => updateSettings({ 
                            provider: 'openai-compatible', 
                            openaiModel: 'Qwen3.6-35B-A3B-FP8',
                            openaiUrl: 'https://llm.aihosting.mittwald.de/v1',
                            enableThinking: true
                        })}
                        className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 text-left ${
                            settings.provider === 'openai-compatible' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-border bg-background'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2.5 rounded-2xl ${settings.provider === 'openai-compatible' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Zap size={20} />
                            </div>
                            <LocationBadge location="Deutschland (DE)" />
                        </div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-foreground tracking-tight">Mittwald AI API (Qwen)</h4>
                            <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-xxs font-bold text-primary uppercase">Pro</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">Maximale Präzision durch High-Performance AI, gehostet in Deutschland.</p>
                    </button>
                </div>
            </div>
        );
    }

    // --- VIEW: TECHNICAL SETUP (Community / Desktop / Admin) ---
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xxs font-black uppercase text-muted-foreground tracking-widest ml-1">KI Engine / Provider</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'mistral', label: 'Mistral API', icon: Globe },
                        { id: 'ollama', label: 'Ollama Lokal', icon: Cpu },
                        { id: 'openai-compatible', label: 'OpenAI Kompatibel', icon: Server }
                    ].map(p => (
                        <Button
                            key={p.id}
                            variant="outline"
                            onClick={() => updateSettings({ provider: p.id as any })}
                            className={`h-auto py-3 flex flex-col items-center gap-1.5 rounded-2xl transition-all duration-300 border-2 ${
                                settings.provider === p.id ? 'border-primary bg-primary/5' : 'bg-background'
                            }`}
                        >
                            <p.icon size={16} className={settings.provider === p.id ? 'text-primary' : 'text-muted-foreground/50'} />
                            <span className={`text-xxs font-bold ${settings.provider === p.id ? 'text-primary' : 'text-muted-foreground'}`}>{p.label}</span>
                            {/*
                              * Nur ueber lokales Ollama gibt es ueberhaupt eine gemessene
                              * Kombination; WELCHES Modell es sein muss, steht dort in der
                              * Modell-Liste. Die beiden anderen Wege sind unabhaengig vom
                              * Modell ungeprueft — siehe `lib/ai/gepruefte-konfiguration.ts`.
                              */}
                            {p.id !== GEPRUEFTER_ANBIETER && (
                                <span className="px-1.5 py-0.5 rounded-md bg-warning/10 text-[9px] font-bold text-warning uppercase tracking-tight leading-none">
                                    {EXPERIMENTELL_KENNZEICHEN}
                                </span>
                            )}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Orchestrated Config Panels */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                {settings.provider === 'mistral' && (
                    <MistralConfig settings={settings} onSave={updateSettings} appMode={appMode} />
                )}

                {settings.provider === 'ollama' && (
                    <OllamaConfig settings={settings} onSave={updateSettings} />
                )}

                {settings.provider === 'openai-compatible' && (
                    <OpenAICompatibleConfig settings={settings} onSave={updateSettings} appMode={appMode} />
                )}
            </div>
        </div>
    );
};
