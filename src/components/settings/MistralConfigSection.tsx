import React from 'react';
import { Shield, Key, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getKorekiMode, isDesktopTarget } from '@/lib/env-context';

interface MistralConfigSectionProps {
    mistralKey: string;
    setMistralKey: (key: string) => void;
    onSave: () => void;
}

export const MistralConfigSection: React.FC<MistralConfigSectionProps> = ({
    mistralKey, setMistralKey, onSave
}) => {
    const mode = getKorekiMode();
    const isCommunity = mode === 'community';

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="mistral-key" className="text-xs font-black uppercase text-muted-foreground tracking-wider ml-1">Mistral API Key</label>
                <div className="relative">
                    <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                        id="mistral-key"
                        type="password"
                        value={mistralKey}
                        onChange={(e) => setMistralKey(e.target.value)}
                        placeholder={isCommunity ? "Zentraler Server-Key (Standard)" : "sk-..."}
                        className="pl-10 h-10 rounded-xl text-xs"
                    />
                </div>
                
                {isCommunity && !mistralKey ? (
                    <div className="flex items-center gap-2 text-primary bg-primary/5 p-3 rounded-xl border border-primary/20 mt-2">
                        <Info size={16} />
                        <p className="text-xs font-bold italic">Nutzt den zentralen API-Key des Servers.</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-success bg-success/5 p-3 rounded-xl border border-success/20 mt-2">
                        <Shield size={16} />
                        <p className="text-xs font-bold italic">
                            {isDesktopTarget() 
                                ? "Wird sicher und nativ in Ihrem Windows-Tresor gespeichert." 
                                : "Wird nur lokal im RAM/Browser gehalten."}
                        </p>
                    </div>
                )}
            </div>
            <Button 
                onClick={onSave} 
                disabled={!isCommunity && !mistralKey} 
                className="w-full rounded-xl font-bold h-11 text-xs"
            >
                Mistral Konfiguration anwenden
            </Button>
        </div>
    );
};
