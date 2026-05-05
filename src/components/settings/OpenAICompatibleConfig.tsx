import React from 'react';
import { Server, ShieldCheck, Trash2, Info, Zap } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppSettings } from '@/types';
import { getKorekiMode } from '@/lib/env-context';

interface OpenAICompatibleConfigProps {
    settings: Partial<AppSettings>;
    onSave: (updates: Partial<AppSettings>) => void;
    appMode?: string;
}

export const OpenAICompatibleConfig: React.FC<OpenAICompatibleConfigProps> = ({ settings, onSave, appMode }) => {
    const [isSaving, setIsSaving] = React.useState(false);
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
    const [localKey, setLocalKey] = React.useState(settings.openaiKey || '');
    
    const mode = getKorekiMode();
    const isDesktop = mode === 'desktop';
    const isCommunity = mode === 'community';
    const isSaaS = mode === 'saas';
    const isPure = appMode === 'PURE';

    const handleClearKey = async () => {
        if (confirm('Möchtest du die Zugangsdaten wirklich sicher vom Rechner löschen?')) {
            if (isDesktop) {
                try {
                    const { vaultService } = await import('@/lib/ai/vault-service');
                    await vaultService.deleteSecret('koreki-openai-key');
                } catch (e) {
                    console.error("Delete error:", e);
                }
            }
            setLocalKey('');
            onSave({ openaiKey: '', openaiUrl: '', openaiModel: '' });
        }
    };

    const performSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const { vaultService } = await import('@/lib/ai/vault-service');
            await vaultService.saveSecret('koreki-openai-key', localKey);
            onSave({ openaiKey: localKey });
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (e) {
            console.error("Save error:", e);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Case 1: Community / SaaS Standard (Server Managed) */}
            {(isCommunity || (isSaaS && !isPure)) && (
                <div className="space-y-4">
                    <div className="p-5 bg-indigo-50/50 rounded-3xl border-2 border-indigo-100 flex flex-col items-center text-center gap-3">
                        <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Mittwald AI API aktiv</h4>
                            <p className="text-[11px] text-indigo-700 font-medium leading-relaxed max-w-[250px] mx-auto mt-1">
                                Dein Institut stellt diesen Dienst (Qwen) zentral zur Verfügung. Die Konfiguration erfolgt sicher über die Administration.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Case 2: Desktop or SaaS Pure (Local Vault / Manual) */}
            {(isDesktop || (isSaaS && isPure)) && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Server size={16} className="text-primary/60" />
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Eigene Endpunkt-Konfiguration</label>
                        </div>
                        {settings.openaiKey && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleClearKey}
                                className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg gap-1.5"
                            >
                                <Trash2 size={12} />
                                <span className="text-[10px] font-bold uppercase">Daten löschen</span>
                            </Button>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label htmlFor="openai-url" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Base URL</label>
                            <Input 
                                id="openai-url"
                                placeholder="https://llm.aihosting.mittwald.de/v1" 
                                value={settings.openaiUrl || ''} 
                                onChange={e => onSave({ openaiUrl: e.target.value })}
                                className="rounded-xl border-2 focus:border-primary/50 transition-all"
                            />
                        </div>
                        <div>
                            <label htmlFor="openai-key" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">API Key</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <Input 
                                        id="openai-key"
                                        type="password"
                                        placeholder="sk-..." 
                                        value={localKey} 
                                        onChange={e => setLocalKey(e.target.value)}
                                        className="rounded-xl border-2 focus:border-primary/50 transition-all pr-12"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <ShieldCheck size={16} className={localKey ? "text-emerald-500" : "text-slate-300"} />
                                    </div>
                                </div>
                                <Button 
                                    onClick={performSave} 
                                    disabled={isSaving || !localKey || localKey === settings.openaiKey}
                                    className="rounded-xl px-4 h-auto"
                                >
                                    <ShieldCheck size={16} />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="openai-model" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Modell</label>
                            <Input 
                                id="openai-model"
                                placeholder="Qwen3.6-35B-A3B-FP8" 
                                value={settings.openaiModel || ''} 
                                onChange={e => onSave({ openaiModel: e.target.value })}
                                className="rounded-xl border-2 focus:border-primary/50 transition-all"
                            />
                        </div>

                        {/* Thinking Mode Toggle */}
                        <div className="pt-2">
                            <button
                                onClick={() => onSave({ enableThinking: !settings.enableThinking })}
                                className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between group ${
                                    settings.enableThinking 
                                        ? 'border-indigo-500 bg-indigo-50/50' 
                                        : 'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${
                                        settings.enableThinking ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        <Zap size={14} className={settings.enableThinking ? 'animate-pulse' : ''} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-[11px] font-black uppercase tracking-tight ${
                                            settings.enableThinking ? 'text-indigo-900' : 'text-slate-600'
                                        }`}>Deep Reasoning</p>
                                        <p className="text-[9px] text-slate-500 font-medium">Aktiviert den "Thinking"-Modus (z.B. für Qwen)</p>
                                    </div>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${
                                    settings.enableThinking ? 'bg-indigo-500' : 'bg-slate-200'
                                }`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                                        settings.enableThinking ? 'left-6' : 'left-1'
                                    }`} />
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-2">
                        <Info size={14} className="text-indigo-500 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[10px] text-indigo-700 font-medium leading-tight">
                                {isDesktop 
                                    ? "Deine Zugangsdaten werden sicher im Tresor deines Betriebssystems verwaltet."
                                    : "Direkte Browser-Verbindung (Pure Mode). Aus DSGVO-Gründen werden Daten nicht über Koreki-Server geproxt."}
                            </p>
                            {!isDesktop && (
                                <p className="text-[9px] text-indigo-500 italic leading-tight">
                                    Hinweis: Ihr Provider muss CORS für koreki.org unterstützen.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
