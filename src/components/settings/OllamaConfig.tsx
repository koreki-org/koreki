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
            }
        } catch (e) {
            setCheckStatus('error');
            setHasAttempted(true);
        } finally {
            if (!silent) setIsChecking(false);
        }
    }, [settings.ollamaUrl]);

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
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label htmlFor="ollama-url" className="block text-xs font-bold text-slate-700 mb-2">Ollama Adresse (URL)</label>
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
                                checkStatus === 'error' ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-slate-200'
                            }`}
                        >
                            {isChecking ? <Loader2 size={16} className="animate-spin" /> : 'Verbindung prüfen'}
                        </Button>
                    </div>
                </div>
                
                {checkStatus === 'ok' && (
                    <div className="flex items-center justify-between text-[10px] text-emerald-600 font-bold bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50 animate-in fade-in slide-in-from-left-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            <span>Ollama {ollamaVersion ? `v${ollamaVersion}` : ''} bereit</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {(settings.ollamaUrl || '').startsWith('https') ? (
                                isSelfSigned ? (
                                    <div className="flex items-center gap-1 text-blue-600/70" title="Selbstsigniertes Zertifikat aktiv">
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
                                <div className="flex items-center gap-1 text-slate-400/70" title="Lokale unverschlüsselte Verbindung">
                                    <Server size={12} strokeWidth={3} />
                                    <span className="uppercase tracking-tighter">Lokal</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {checkStatus === 'error' && hasAttempted && (
                    <div className="flex items-center gap-2 text-[10px] text-rose-600 font-bold bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50 animate-shake">
                        <Info size={14} />
                        <span>Ollama konnte nicht erreicht werden. Läuft die App?</span>
                    </div>
                )}
            </div>

            {/* 2. Model Selection (Presets) */}
            <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Modell wählen</label>
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'qwen3.6:35b', name: 'Qwen 3.6', desc: 'Empfohlen (High Reasoning)' },
                        { id: 'mistral-small3.2:latest', name: 'Mistral Small 3.2', desc: 'Schnell & Effizient' },
                        { id: 'gemma4:31b', name: 'Gemma 31B', desc: 'Spezialist für Inhaltsanalyse' }
                    ].map(p => (
                        <Button
                            key={p.id}
                            variant="outline"
                            onClick={() => onSave({ ollamaModel: p.id })}
                            className={`h-auto py-3.5 px-4 justify-between rounded-xl border-2 transition-all duration-300 ${
                                settings.ollamaModel === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="text-left">
                                <div className="text-xs font-bold text-slate-900">{p.name}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{p.desc}</div>
                            </div>
                            {settings.ollamaModel === p.id && <CheckCircle2 size={18} className="text-primary animate-in zoom-in duration-300" />}
                        </Button>
                    ))}
                </div>
            </div>

            {/* 3. Smart Mapping & Discovery Banner */}
            {(checkStatus === 'ok' || isMapped) && settings.ollamaModel && (
                <div className={`p-4 rounded-2xl border-2 transition-all duration-300 animate-in slide-in-from-top-2 ${
                    isExactMatch ? 'border-emerald-100 bg-emerald-50/50 text-emerald-700' :
                    isMapped ? 'border-indigo-100 bg-indigo-50/50 text-indigo-700' :
                    availableModels.length > 0 ? 'border-amber-100 bg-amber-50/50 text-amber-700' :
                    'border-slate-100 bg-slate-50 text-slate-500'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                            isExactMatch ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' :
                            isMapped ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200' :
                            availableModels.length > 0 ? 'bg-amber-500 text-white shadow-sm shadow-amber-200' :
                            'bg-slate-300 text-white'
                        }`}>
                            {isExactMatch ? <CheckCircle2 size={14} /> : <Info size={14} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">
                                {isExactMatch ? 'Modell Bereit' : isMapped ? 'Automatisches Mapping' : 'Modell fehlt'}
                            </span>
                            <div className="text-[11px] font-bold leading-tight">
                                {isExactMatch ? (
                                    <span>Die KI <span className="font-mono text-emerald-600">{settings.ollamaModel}</span> ist lokal einsatzbereit.</span>
                                ) : isMapped ? (
                                    <span>Preset wird lokal ersetzt durch: <span className="font-mono text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">{resolvedModel}</span></span>
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

            {/* 4. Manual Override */}
            <div className="pt-2">
                <label htmlFor="ollama-model-manual" className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2">Manueller Modell-Tag</label>
                <div className="relative group">
                    <Input 
                        id="ollama-model-manual"
                        placeholder="z.B. llama3:latest" 
                        value={settings.ollamaModel || ''} 
                        onChange={e => onSave({ ollamaModel: e.target.value })}
                        className="h-10 rounded-xl text-xs font-mono bg-slate-50/50 border-2 group-hover:border-slate-300 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-tighter">Override</div>
                </div>
            </div>
        </div>
    );
};
