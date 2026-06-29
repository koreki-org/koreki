import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface TeacherViewInfoProps {
    onLogout: () => void;
}

export const TeacherViewInfo: React.FC<TeacherViewInfoProps> = ({ onLogout }) => {
    return (
        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start gap-4 p-5 bg-warning/5 border border-warning/20 rounded-2xl text-xs text-warning text-left mb-6 shadow-sm">
                <AlertCircle size={20} className="text-warning shrink-0 mt-0.5" />
                <div className="flex flex-col gap-2">
                    <p className="font-bold uppercase tracking-wide">Zentraler AVV steht noch aus.</p>
                    <p className="leading-relaxed opacity-90">
                        Dein Institut hat noch keinen gültigen AVV hinterlegt. Solange dieses Dokument fehlt, sind Bilderkennung und Korrekturen im Schul-Profil gesperrt.
                    </p>
                    <p className="font-bold mt-2">Was du tun kannst:</p>
                    <p className="leading-relaxed opacity-90 italic">
                        &quot;Bitte wende dich an deine Schulleitung oder System-Verwaltung, um den AVV im Schul-Admin-Dashboard hochzuladen.&quot;
                    </p>
                </div>
            </div>

            <Button
                variant="outline"
                className="w-full py-5 font-bold rounded-xl border-border text-sm"
                onClick={onLogout}
            >
                Abmelden
            </Button>
        </div>
    );
};
