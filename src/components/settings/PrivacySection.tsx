import React from 'react';
import { Shield, FileText, ExternalLink } from 'lucide-react';
import { AppSettings, WaehlbarerAppModus } from '@/types';
import { isLocalInstance, isPaidModesEnabled } from '@/lib/env-context';
// No AIConfigurationContent needed for local

interface PrivacySectionProps {
    settings: AppSettings;
    onSave: (updates: Partial<AppSettings>) => void;
    appMode: string;
    avvAccepted: boolean;
    onModeChange: (mode: WaehlbarerAppModus) => void;
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({ 
    appMode, 
    avvAccepted, 
    onModeChange, 
    settings, 
    onSave 
}) => {
    return (
        <div className="mb-6 pb-4 border-b border-border">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Modus & Datenschutz</h3>
            {!isLocalInstance() && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {(['STANDARD', 'PURE', 'TRIAL'] as const).map((mode) => {
                        const isDisabled = (mode === 'STANDARD' || mode === 'PURE') && !isPaidModesEnabled();
                        return (
                            <div
                                key={mode}
                                className={`flex flex-col p-4 border-2 rounded-xl transition-all duration-200 relative overflow-hidden ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'} ${appMode === mode ? 'border-primary bg-primary/5 shadow-sm' : isDisabled ? 'border-border bg-muted/20' : 'border-border hover:border-border/80 bg-background'}`}
                                onClick={() => !isDisabled && onModeChange(mode)}
                            >
                                <span className={`font-bold text-sm mb-1 ${appMode === mode ? 'text-primary' : isDisabled ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                                    {mode.charAt(0) + mode.slice(1).toLowerCase()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {isDisabled ? 'In Kürze verfügbar' : (mode === 'STANDARD' ? 'Managed (3 Credits)' : mode === 'PURE' ? 'Privacy (1 Credit)' : 'Test (Kostenlos)')}
                                </span>
                                {isDisabled && (
                                    <div className="absolute top-1 right-1">
                                        <span className="text-xxs font-black uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Soon</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {appMode === 'TRIAL' && (
                <div className="bg-warning/5 text-warning border border-warning/20 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <span>🧪</span> Trial Modus aktiv (Keine echten Daten)
                </div>
            )}

            {appMode === 'STANDARD' && !isLocalInstance() && (
                <div className="space-y-3">
                    <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 border ${avvAccepted ? 'bg-success/5 text-success border-success/20' : 'bg-destructive/5 text-destructive border-destructive/20'}`}>
                        <span>{avvAccepted ? '✅' : '❌'}</span>
                        {avvAccepted ? 'AVV hinterlegt & gültig' : 'AVV fehlt (Standard-Modus blockiert)'}
                    </div>
                </div>
            )}

            {!isLocalInstance() && appMode === 'PURE' && (
                <div className="mt-4 space-y-4">
                    <div className="bg-muted/20 p-4 rounded-xl border border-border">
                        <label className="block text-sm font-semibold text-foreground mb-2">Mistral API Key (Lokal)</label>
                        <input
                            type="password"
                            placeholder="sk-..."
                            defaultValue={settings.mistralKey || ''}
                            onBlur={(e) => onSave({ mistralKey: e.target.value })}
                            className="h-10 w-full rounded-lg text-sm border-border bg-background px-3"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
