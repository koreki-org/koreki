import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, CheckCircle2, Shield, Server, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppSettings } from '@/types';
import { pingOllama, fetchOllamaModels, resolveOllamaModel } from '@/lib/ai/ollama-logic';

interface OllamaConfigProps {
    settings: Partial<AppSettings>;
    onSave: (updates: Partial<AppSettings>) => void;
}

export const OllamaConfig: React.FC<OllamaConfigProps> = ({ settings, onSave }) => {
    const [isChecking, setIsChecking] = useState(false);
    const [checkStatus, setCheckStatus] = useState<'ok' | 'error' | 'idle'>('idle');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isSelfSigned, setIsSelfSigned] = useState(false);
    const [ollamaVersion, setOllamaVersion] = useState('');
    const [hasAttempted, setHasAttempted] = useState(false);

    const presets = ['qwen3.6:35b', 'mistral-small3.2:latest', 'gemma4:31b'];
    const [isCustomMode, setIsCustomMode] = useState(() => {
        if (!settings.ollamaModel) return false;
        return !presets.includes(settings.ollamaModel);
    });
    const hasInitializedRef = React.useRef(false);

    // Sync custom mode once when models are loaded (to support initial mapped presets)
    useEffect(() => {
        if (hasInitializedRef.current || availableModels.length === 0 || !settings.ollamaModel) return;
        
        const isPresetMatched = presets.some(pid => resolveOllamaModel(pid, availableModels) === settings.ollamaModel);
        if (isPresetMatched) {
            setIsCustomMode(false);
        } else {
            setIsCustomMode(true);
        }
        hasInitializedRef.current = true;
    }, [availableModels, settings.ollamaModel]);

    const handleVerifyConnection = useCallback(async (silent = false) => {
        if (!silent) setIsChecking(true);
        try {
            const { success, isSelfSigned: selfSigned, version } = await pingOllama(settings.ollamaUrl || 'http://127.0.0.1:11434');
            setCheckStatus(success ? 'ok' : 'error');
            setIsSelfSigned(selfSigned);
            setOllamaVersion(version);
            setHasAttempted(true);
            
            if (success) {
                const { models } = await fetchOllamaModels(settings.ollamaUrl || 'http://127.0.0.1:11434');
                setAvailableModels(models);

                // Auto-resolve preset if it is not explicitly installed but has a matching local mapped tag
                const presets = ['qwen3.6:35b', 'mistral-small3.2:latest', 'gemma4:31b'];
                const isPreset = presets.includes(settings.ollamaModel || '');
                if (isPreset && settings.ollamaModel && models.length > 0 && !models.includes(settings.ollamaModel)) {
                    const resolved = resolveOllamaModel(settings.ollamaModel, models);
                    if (resolved !== settings.ollamaModel) {
                        onSave({ ollamaModel: resolved });
                    }
                }
            }
        } catch (e) {
            setCheckStatus('error');
            setHasAttempted(true);
        } finally {
            if (!silent) setIsChecking(false);
        }
    }, [settings.ollamaUrl, settings.ollamaModel, onSave]);

    // Auto-Discovery on Mount
    useEffect(() => {
        handleVerifyConnection(true);
    }, []);

    const resolvedModel = resolveOllamaModel(settings.ollamaModel || '', availableModels);
    const isExactMatch = settings.ollamaModel && availableModels.includes(settings.ollamaModel);
    const isMapped = settings.ollamaModel && !isExactMatch && availableModels.length > 0 && resolvedModel !== settings.ollamaModel;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* 1. Connection Header */}
            <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-4">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label htmlFor="ollama-url" className="block text-xs font-bold text-foreground mb-2">Ollama Adresse (URL)</label>
                        <Input 
                            id="ollama-url"
                            placeholder="http://127.0.0.1:11434" 
                            value={settings.ollamaUrl || ''} 
                            onChange={e => onSave({ ollamaUrl: e.target.value })}
                            className="rounded-xl border-2 focus:border-primary/50 transition-all"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button 
                            variant="outline" 
                            onClick={() => handleVerifyConnection(false)}
                            disabled={isChecking}
                            className={`h-10 px-4 rounded-xl border-2 font-bold text-xs transition-all ${
                                checkStatus === 'ok' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                                checkStatus === 'error' ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-border'
                            }`}
                        >
                            {isChecking ? <Loader2 size={16} className="animate-spin" /> : 'Verbindung prüfen'}
                        </Button>
                    </div>
                </div>
                
                {checkStatus === 'ok' && (
                    <div className="flex items-center justify-between text-xxs text-emerald-600 font-bold bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50 animate-in fade-in slide-in-from-left-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            <span>Ollama {ollamaVersion ? `v${ollamaVersion}` : ''} bereit</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {(settings.ollamaUrl || '').startsWith('https') ? (
                                isSelfSigned ? (
                                    <div className="flex items-center gap-1 text-primary/70" title="Selbstsigniertes Zertifikat aktiv">
                                        <Shield size={12} strokeWidth={3} />
                                        <span className="uppercase tracking-tighter">Self-Signed</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-emerald-600/70" title="Gesicherte Verbindung">
                                        <Shield size={12} strokeWidth={3} />
                                        <span className="uppercase tracking-tighter">Sicher</span>
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center gap-1 text-muted-foreground/70" title="Lokale unverschlüsselte Verbindung">
                                    <Server size={12} strokeWidth={3} />
                                    <span className="uppercase tracking-tighter">Lokal</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {checkStatus === 'error' && hasAttempted && (
                    <div className="flex items-center gap-2 text-xxs text-rose-600 font-bold bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50 animate-shake">
                        <Info size={14} />
                        <span>Ollama konnte nicht erreicht werden. Läuft die App?</span>
                    </div>
                )}
            </div>

            {/* 2. Model Selection */}
            <div className="space-y-3">
                <label className="block text-xxs font-black uppercase text-muted-foreground tracking-widest ml-1">Modell wählen</label>
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'qwen3.6:35b', name: 'Qwen 3.6', desc: 'Empfohlen (High Reasoning)' },
                        { id: 'mistral-small3.2:latest', name: 'Mistral Small 3.2', desc: 'Schnell & Effizient' },
                        { id: 'gemma4:31b', name: 'Gemma 31B', desc: 'Spezialist für Inhaltsanalyse' }
                    ].map(p => {
                        const resolvedForCard = resolveOllamaModel(p.id, availableModels);
                        const isSelected = !isCustomMode && (
                            settings.ollamaModel === p.id || 
                            (settings.ollamaModel && availableModels.length > 0 && resolvedForCard === settings.ollamaModel)
                        );

                        return (
                            <Button
                                key={p.id}
                                variant="outline"
                                onClick={() => {
                                    setIsCustomMode(false);
                                    const targetModel = resolveOllamaModel(p.id, availableModels);
                                    onSave({ ollamaModel: targetModel });
                                }}
                                className={`h-auto py-3.5 px-4 justify-between rounded-xl border-2 transition-all duration-300 ${
                                    isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'bg-background hover:border-border/80'
                                }`}
                            >
                                <div className="text-left">
                                    <div className="text-xs font-bold text-foreground">{p.name}</div>
                                    <div className="text-xxs text-muted-foreground font-medium">{p.desc}</div>
                                </div>
                                {isSelected && <CheckCircle2 size={18} className="text-primary animate-in zoom-in duration-300" />}
                            </Button>
                        );
                    })}

                    {/* Eigene Modell-Konfiguration (Custom Model) Card */}
                    <Button
                        variant="outline"
                        onClick={() => {
                            setIsCustomMode(true);
                            // Fallback to llama3:latest only if current model is empty or a preset
                            const presets = ['qwen3.6:35b', 'mistral-small3.2:latest', 'gemma4:31b'];
                            const isCurrentPreset = settings.ollamaModel && (
                                presets.includes(settings.ollamaModel) || 
                                (availableModels.length > 0 && presets.some(pid => resolveOllamaModel(pid, availableModels) === settings.ollamaModel))
                            );
                            if (!settings.ollamaModel || isCurrentPreset) {
                                onSave({ ollamaModel: 'llama3:latest' });
                            }
                        }}
                        className={`h-auto py-3.5 px-4 justify-between rounded-xl border-2 transition-all duration-300 ${
                            isCustomMode ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'bg-background hover:border-border/80'
                        }`}
                    >
                        <div className="text-left flex items-center gap-3">
                            <Cpu size={18} className={isCustomMode ? 'text-primary' : 'text-muted-foreground'} />
                            <div>
                                <div className="text-xs font-bold text-foreground">Eigene Modell-Konfiguration</div>
                                <div className="text-xxs text-muted-foreground font-medium">Manuelle Eingabe eines beliebigen Modell-Tags</div>
                            </div>
                        </div>
                        {isCustomMode && <CheckCircle2 size={18} className="text-primary animate-in zoom-in duration-300" />}
                    </Button>

                    {/* 3. Dynamic Manual Override (Only visible in Custom Mode) */}
                    {isCustomMode && (
                        <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                            <label htmlFor="ollama-model-manual" className="block text-xxs font-black uppercase text-muted-foreground tracking-widest ml-1 mb-2">Manueller Modell-Tag</label>
                            <div className="relative group">
                                <Input 
                                    id="ollama-model-manual"
                                    placeholder="z.B. llama3:latest" 
                                    value={settings.ollamaModel || ''} 
                                    onChange={e => onSave({ ollamaModel: e.target.value })}
                                    className="h-10 rounded-xl text-xs font-mono bg-muted/20 border-2 group-hover:border-border/80 transition-colors"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xxs font-black text-muted-foreground/50 uppercase tracking-tighter">Custom</div>
                            </div>
                        </div>
                    )}

                    {/* 4. Smart Mapping & Discovery Banner (Only visible in Preset Mode) */}
                    {!isCustomMode && (checkStatus === 'ok' || isMapped) && settings.ollamaModel && (
                        <div className={`p-4 rounded-2xl border-2 transition-all duration-300 animate-in slide-in-from-top-2 ${
                            isExactMatch ? 'border-emerald-100 bg-emerald-50/50 text-emerald-700' :
                            isMapped ? 'border-primary/20 bg-primary/5 text-primary' :
                            availableModels.length > 0 ? 'border-amber-100 bg-amber-50/50 text-amber-700' :
                            'border-border bg-muted/20 text-muted-foreground'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${
                                    isExactMatch ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' :
                                    isMapped ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' :
                                    availableModels.length > 0 ? 'bg-amber-500 text-white shadow-sm shadow-amber-200' :
                                    'bg-muted text-muted-foreground'
                                }`}>
                                    {isExactMatch ? <CheckCircle2 size={14} /> : <Info size={14} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xxs font-black uppercase tracking-widest leading-none mb-1 opacity-70">
                                        {isExactMatch ? 'Modell Bereit' : isMapped ? 'Automatisches Mapping' : 'Modell fehlt'}
                                    </span>
                                    <div className="text-xxs font-bold leading-tight">
                                        {isExactMatch ? (
                                            <span>Die KI <span className="font-mono text-emerald-600">{settings.ollamaModel}</span> ist lokal einsatzbereit.</span>
                                        ) : isMapped ? (
                                            <span>Preset wird lokal ersetzt durch: <span className="font-mono text-primary bg-background px-1.5 py-0.5 rounded border border-border">{resolvedModel}</span></span>
                                        ) : availableModels.length > 0 ? (
                                            <span>Das gewählte Modell ist nicht installiert. Bitte manuell nachladen.</span>
                                        ) : (
                                            <span>Modelle werden abgerufen...</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
