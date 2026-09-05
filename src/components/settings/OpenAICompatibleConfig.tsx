import React from 'react';
import { Server, ShieldCheck, Trash2, Info } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppSettings } from '@/types';
import { anbieterPanelModus } from './anbieter-panel-modus';
import { askConfirmation } from '@/lib/confirm-dialog';

interface OpenAICompatibleConfigProps {
    settings: Partial<AppSettings>;
    onSave: (updates: Partial<AppSettings>) => void;
    appMode?: string;
}

export const OpenAICompatibleConfig: React.FC<OpenAICompatibleConfigProps> = ({ settings, onSave, appMode }) => {
    const [isSaving, setIsSaving] = React.useState(false);
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
    const [localKey, setLocalKey] = React.useState(settings.openaiKey || '');
    
    const { isDesktop, isCommunity, isSaaS, isPure, istEigenverwaltet } = anbieterPanelModus(appMode);

    const handleClearKey = async () => {
        if (await askConfirmation({ title: 'Zugangsdaten löschen', message: 'Möchtest du die Zugangsdaten wirklich sicher vom Rechner löschen?' })) {
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
            {((isCommunity && !istEigenverwaltet) || (isSaaS && !isPure)) && (
                <div className="space-y-4">
                    <div className="p-5 bg-primary/5 rounded-3xl border-2 border-primary/10 flex flex-col items-center text-center gap-3">
                        <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-primary uppercase tracking-tight">Mittwald AI API aktiv</h4>
                            <p className="text-xxs text-primary font-medium leading-relaxed max-w-[250px] mx-auto mt-1">
                                Dein Institut stellt diesen Dienst (Qwen) zentral zur Verfügung. Die Konfiguration erfolgt sicher über die Administration.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Case 2: Desktop or SaaS Pure (Local Vault / Manual) */}
            {(isDesktop || istEigenverwaltet || (isSaaS && isPure)) && (
                <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Server size={16} className="text-primary/60" />
                            <label className="text-xs font-bold text-foreground uppercase tracking-tight">Eigene Endpunkt-Konfiguration</label>
                        </div>
                        {settings.openaiKey && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleClearKey}
                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1.5"
                            >
                                <Trash2 size={12} />
                                <span className="text-xxs font-bold uppercase">Daten löschen</span>
                            </Button>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label htmlFor="openai-url" className="block text-xxs font-black text-muted-foreground uppercase tracking-widest ml-1 mb-1.5">Base URL</label>
                            <Input 
                                id="openai-url"
                                placeholder="https://llm.aihosting.mittwald.de/v1" 
                                value={settings.openaiUrl || ''} 
                                onChange={e => onSave({ openaiUrl: e.target.value })}
                                className="rounded-xl border-2 focus:border-primary/50 transition-all"
                            />
                        </div>
                        <div>
                            <label htmlFor="openai-key" className="block text-xxs font-black text-muted-foreground uppercase tracking-widest ml-1 mb-1.5">API Key</label>
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
                                        <ShieldCheck size={16} className={localKey ? "text-success" : "text-muted-foreground/50"} />
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
                            <label htmlFor="openai-model" className="block text-xxs font-black text-muted-foreground uppercase tracking-widest ml-1 mb-1.5">Modell</label>
                            <Input 
                                id="openai-model"
                                placeholder="Qwen3.6-35B-A3B-FP8" 
                                value={settings.openaiModel || ''} 
                                onChange={e => onSave({ openaiModel: e.target.value })}
                                className="rounded-xl border-2 focus:border-primary/50 transition-all"
                            />
                        </div>

                        {/*
                          * KEIN Denkschritt-Schalter hier (05.09.2026). Er stand schon im
                          * KI-Intelligenz-Modal, gespeist aus demselben Feld — nur las die
                          * Kopie ein ungesetztes Feld als AUS und das Original als AN. Zwei
                          * Schalter fuer einen Wert brauchen keine Abstimmung, sondern einen
                          * Schalter. Erzwungen durch `tests/unit/ai/denkschritt-standard.test.ts`.
                          */}
                    </div>

                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-2">
                    <Info size={14} className="text-primary mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xxs text-primary font-medium leading-tight">
                            {isDesktop 
                                ? "Deine Zugangsdaten werden sicher im Tresor deines Betriebssystems verwaltet."
                                : istEigenverwaltet
                                ? "Der Schlüssel gilt für diese Koreki-Instanz und wird in ihrer Konfiguration gespeichert. Die Anfragen laufen über deinen eigenen Server."
                                : "Direkte Browser-Verbindung (Pure Mode). Aus DSGVO-Gründen werden Daten nicht über Koreki-Server geproxt."}
                        </p>
                        {/* Der CORS-Hinweis gilt nur, wo der Browser selbst beim Anbieter anfragt. */}
                        {!isDesktop && !istEigenverwaltet && (
                            <p className="text-xxs text-primary italic leading-tight">
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
