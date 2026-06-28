import React from 'react';
import { Search, Check, AlertCircle, Settings2, Loader2, Shield, Lock, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface OllamaConfigSectionProps {
    ollamaUrl: string;
    setOllamaUrl: (url: string) => void;
    ollamaModel: string;
    setOllamaModel: (model: string) => void;
    customModel: string;
    setCustomModel: (model: string) => void;
    isPinging: boolean;
    pingStatus: 'ok' | 'error' | null;
    handlePing: () => void;
    availableModels: string[];
    resolvedFromPreset: string | null;
    lastSelectedPreset: string | null;
    onSelectPreset: (preset: string) => void;
    showCustomInput: boolean;
    setShowCustomInput: (show: boolean) => void;
    ollamaVersion?: string;
    isSelfSigned?: boolean;
}

export const OllamaConfigSection: React.FC<OllamaConfigSectionProps> = ({
    ollamaUrl, setOllamaUrl, ollamaModel, setOllamaModel, customModel, setCustomModel,
    isPinging, pingStatus, handlePing, availableModels, resolvedFromPreset,
    lastSelectedPreset, onSelectPreset, showCustomInput, setShowCustomInput, ollamaVersion,
    isSelfSigned
}) => {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="ollama-url" className="text-xs font-black uppercase text-muted-foreground tracking-wider ml-1">Ollama URL</label>
                <div className="flex gap-2">
                    <Input 
                        id="ollama-url"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder="http://127.0.0.1:11434"
                        className="h-10 rounded-xl text-xs font-mono"
                    />
                    <Button 
                        onClick={handlePing}
                        disabled={isPinging}
                        variant="outline"
                        className="h-10 px-4 rounded-xl"
                    >
                        {isPinging ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </Button>
                </div>
                {pingStatus === 'ok' && (
                    <div className="flex items-center justify-between text-xs text-emerald-600 font-bold bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <Check size={14} />
                            <span>Ollama {ollamaVersion ? `v${ollamaVersion}` : ''} bereit</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                            {ollamaUrl.startsWith('https') ? (
                                isSelfSigned ? (
                                    <div className="flex items-center gap-1 text-blue-600/70" title="Selbstsigniertes Zertifikat aktiv">
                                        <Shield size={12} strokeWidth={3} />
                                        <span className="text-[10px] uppercase tracking-tighter">Self-Signed</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-emerald-600/70" title="Verbindung über CA-Zertifikat gesichert">
                                        <Lock size={12} strokeWidth={3} />
                                        <span className="text-[10px] uppercase tracking-tighter">Sicher</span>
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center gap-1 text-slate-400/70" title="Unverschlüsselte lokale Verbindung">
                                    <Info size={12} strokeWidth={3} />
                                    <span className="text-[10px] uppercase tracking-tighter">Lokal</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label htmlFor="ollama-model-select" className="text-xs font-black uppercase text-muted-foreground tracking-wider ml-1">Modell wählen</label>
                <div id="ollama-model-select" className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'qwen3.6:35b', name: 'Qwen 3.6', desc: 'Empfohlen' },
                        { id: 'mistral-small3.2:latest', name: 'Mistral Small 3.2', desc: 'Effizient' },
                        { id: 'gemma4:31b', name: 'Gemma 31B', desc: 'Spezialist' }
                    ].map(p => (
                        <Button
                            key={p.id}
                            variant="outline"
                            onClick={() => onSelectPreset(p.id)}
                            className={`h-auto py-3 px-4 justify-between rounded-xl border-2 transition-all duration-300 ${!showCustomInput && lastSelectedPreset === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'bg-white'}`}
                        >
                            <div className="text-left">
                                <div className="text-xs font-bold text-foreground">{p.name}</div>
                                <div className="text-[11px] text-muted-foreground font-medium">{p.desc}</div>
                            </div>
                            {!showCustomInput && lastSelectedPreset === p.id && <Check size={16} className="text-primary" />}
                        </Button>
                    ))}

                    <Button
                        variant="outline"
                        onClick={() => setShowCustomInput(true)}
                        className={`h-auto py-3 px-4 justify-between rounded-xl border-2 transition-all duration-300 ${showCustomInput ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'bg-white'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Settings2 size={18} className="text-muted-foreground" />
                            <div className="text-left">
                                <div className="text-xs font-bold text-foreground">Eigene Modell-Konfiguration</div>
                                <div className="text-[11px] text-muted-foreground font-medium">Manuelle Eingabe oder Tags</div>
                            </div>
                        </div>
                        {showCustomInput && <Check size={16} className="text-primary" />}
                    </Button>
                </div>

                {!showCustomInput && (
                    <div className={`p-3 rounded-xl border transition-colors ${availableModels.length > 0 ? (resolvedFromPreset ? 'bg-primary/5 border-primary/20' : (availableModels.includes(ollamaModel) ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-warning/5 border-warning/20')) : 'bg-muted border-border'}`}>
                        <div className={`flex items-center gap-2 text-xs font-bold ${availableModels.length > 0 ? (resolvedFromPreset ? 'text-primary' : (availableModels.includes(ollamaModel) ? 'text-emerald-600' : 'text-warning')) : 'text-muted-foreground'}`}>
                            <AlertCircle size={14} />
                            {availableModels.length > 0 ? (
                                resolvedFromPreset ? (
                                    <span>Lokal aufgelöst: <span className="font-mono">{resolvedFromPreset}</span></span>
                                ) : availableModels.includes(ollamaModel) ? (
                                    <span>Exakter Match gefunden</span>
                                ) : (
                                    <span>Modell nicht lokal gefunden</span>
                                )
                            ) : (
                                <span>Verbindung wird geprüft...</span>
                            )}
                        </div>
                    </div>
                )}

                {showCustomInput && (
                    <div className="space-y-3 pt-1 animate-fade-up">
                        <Input 
                            value={customModel}
                            onChange={(e) => setCustomModel(e.target.value)}
                            placeholder="z.B. llama3"
                            className="h-10 rounded-xl text-xs font-mono"
                        />
                        {availableModels.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {availableModels.slice(0, 6).map(m => (
                                    <Button
                                        key={m}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCustomModel(m)}
                                        className={`h-7 px-2 text-[10px] font-mono border ${customModel === m ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-border text-muted-foreground'}`}
                                    >
                                        {m}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
