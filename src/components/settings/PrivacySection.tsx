import React from 'react';
import { Shield, FileText, ExternalLink } from 'lucide-react';
import { AppSettings } from '@/types';
import { isLocalInstance, isPaidModesEnabled } from '@/lib/env-context';
// No AIConfigurationContent needed for local

interface PrivacySectionProps {
    settings: AppSettings;
    onSave: (updates: Partial<AppSettings>) => void;
    appMode: string;
    avvAccepted: boolean;
    onModeChange: (mode: any) => void;
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({ 
    appMode, 
    avvAccepted, 
    onModeChange, 
    settings, 
    onSave 
}) => {
    return (
        <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Modus & Datenschutz</h3>
            {!isLocalInstance() && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {['STANDARD', 'PURE', 'TRIAL'].map((mode) => {
                        const isDisabled = (mode === 'STANDARD' || mode === 'PURE') && !isPaidModesEnabled();
                        return (
                            <div
                                key={mode}
                                className={`flex flex-col p-4 border-2 rounded-xl transition-all duration-200 relative overflow-hidden ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'} ${appMode === mode ? 'border-primary bg-primary/5 shadow-sm' : isDisabled ? 'border-slate-100 bg-slate-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                                onClick={() => !isDisabled && onModeChange(mode)}
                            >
                                <span className={`font-bold text-sm mb-1 ${appMode === mode ? 'text-primary' : isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>
                                    {mode.charAt(0) + mode.slice(1).toLowerCase()}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {isDisabled ? 'In Kürze verfügbar' : (mode === 'STANDARD' ? 'Managed (3 Credits)' : mode === 'PURE' ? 'Privacy (1 Credit)' : 'Test (Kostenlos)')}
                                </span>
                                {isDisabled && (
                                    <div className="absolute top-1 right-1">
                                        <span className="text-[7px] font-black uppercase text-slate-400 bg-slate-200/50 px-1 rounded">Soon</span>
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
                    <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 border ${avvAccepted ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                        <span>{avvAccepted ? '✅' : '❌'}</span>
                        {avvAccepted ? 'AVV hinterlegt & gültig' : 'AVV fehlt (Standard-Modus blockiert)'}
                    </div>
                </div>
            )}

            {!isLocalInstance() && appMode === 'PURE' && (
                <div className="mt-4 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Mistral API Key (Lokal)</label>
                        <input
                            type="password"
                            placeholder="sk-..."
                            defaultValue={settings.mistralKey || ''}
                            onBlur={(e) => onSave({ mistralKey: e.target.value })}
                            className="h-10 w-full rounded-lg text-sm border-slate-200 px-3"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
