import React from 'react';
import { Globe, ShieldCheck, Trash2, Info, Save, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppSettings } from '@/types';
import { getKorekiMode } from '@/lib/env-context';
import { vaultService } from '@/lib/ai/vault-service';

interface MistralConfigProps {
    settings: Partial<AppSettings>;
    onSave: (updates: Partial<AppSettings>) => void;
    appMode?: string;
}

export const MistralConfig: React.FC<MistralConfigProps> = ({ settings, onSave, appMode }) => {
    const [isSaving, setIsSaving] = React.useState(false);
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
    const [localKey, setLocalKey] = React.useState(settings.mistralKey || '');
    const mode = getKorekiMode();
    const isDesktop = mode === 'desktop';
    const isCommunity = mode === 'community';
    const isSaaS = mode === 'saas';
    const isPure = appMode === 'PURE';

    const handleClearKey = async () => {
        if (confirm('Möchtest du den Key wirklich sicher vom Rechner löschen?')) {
            if (isDesktop) {
                try {
                    await vaultService.deleteSecret('koreki-mistral-key');
                } catch (e) {
                    console.error("Delete error:", e);
                }
            }
            setLocalKey('');
            onSave({ mistralKey: '' });
            setSaveStatus('idle');
        }
    };

    const performSave = async () => {
        if (!localKey) return;
        
        setIsSaving(true);
        setSaveStatus('idle');
        
        try {
            // Industrial Hardening: Ensure it actually hits the vault
            await vaultService.saveSecret('koreki-mistral-key', localKey);
            onSave({ mistralKey: localKey });
            setSaveStatus('success');
            
            // Auto-hide success after 3s
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
                <div className="p-5 bg-emerald-50/50 rounded-3xl border-2 border-emerald-100 flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-emerald-900 uppercase tracking-tight">System-Standard aktiv</h4>
                        <p className="text-[11px] text-emerald-700 font-medium leading-relaxed max-w-[250px] mx-auto mt-1">
                            Dieser Dienst wird sicher über die Server-Umgebung bereitgestellt. Du musst keinen eigenen Key hinterlegen.
                        </p>
                    </div>
                </div>
            )}

            {/* Case 2: Desktop or SaaS Pure (Local Vault / Manual) */}
            {(isDesktop || (isSaaS && isPure)) && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe size={16} className="text-primary/60" />
                            <label htmlFor="mistral-key" className="text-xs font-bold text-slate-700 uppercase tracking-tight">Mistral API Key</label>
                        </div>
                        {settings.mistralKey && isDesktop && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleClearKey}
                                className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg gap-1.5"
                            >
                                <Trash2 size={12} />
                                <span className="text-[10px] font-bold uppercase">Vom Rechner löschen</span>
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <Input 
                                id="mistral-key"
                                type="password" 
                                placeholder="sk-..." 
                                value={localKey} 
                                onChange={e => {
                                    setLocalKey(e.target.value);
                                    setSaveStatus('idle');
                                }}
                                onKeyDown={e => e.key === 'Enter' && performSave()}
                                className="rounded-xl border-2 focus:border-primary/50 transition-all pr-12"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Sicher im System-Tresor">
                                <ShieldCheck size={16} className={localKey ? "text-emerald-500" : "text-slate-300"} />
                            </div>
                        </div>
                        <Button 
                            onClick={performSave} 
                            disabled={isSaving || !localKey || localKey === settings.mistralKey}
                            className="rounded-xl px-4 gap-2 h-auto"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span className="hidden sm:inline">Speichern</span>
                        </Button>
                    </div>

                    {saveStatus === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-bold animate-in fade-in slide-in-from-left-2">
                            <CheckCircle2 size={12} />
                            Key wurde sicher im System-Tresor hinterlegt.
                        </div>
                    )}

                    {saveStatus === 'error' && (
                        <div className="flex items-center gap-2 text-rose-600 text-[10px] font-bold animate-in fade-in slide-in-from-left-2">
                            <AlertCircle size={12} />
                            Fehler beim Zugriff auf den Tresor.
                        </div>
                    )}

                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-2">
                        <Info size={14} className="text-indigo-500 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[10px] text-indigo-700 font-medium leading-tight">
                                {isDesktop 
                                    ? "Dieser Key wird verschlüsselt im Tresor deines Betriebssystems (Windows Credential Manager / Keychain / GNOME Keyring) gespeichert."
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
