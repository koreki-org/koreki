import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface StepSuccessProps {
    isOrganization: boolean;
    onComplete: () => void;
}

export const StepSuccess: React.FC<StepSuccessProps> = ({ isOrganization, onComplete }) => {
    return (
        <div className="w-full flex flex-col items-center justify-center text-center h-full animate-in zoom-in-50 duration-500">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                <CheckCircle size={80} className="text-emerald-500 relative z-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Vollständig!</h3>
            <p className="text-slate-600 leading-relaxed mb-10 max-w-[350px]">
                {isOrganization 
                  ? 'Der Instituts-AVV wurde erfolgreich hinterlegt. Alle Lehrkräfte sind nun für die Verarbeitung freigeschaltet.'
                  : 'Ihr AVV wurde erfolgreich hinterlegt. Der Standard-Modus ist nun für Ihren Account freigeschaltet.'
                }
            </p>
            <Button className="w-full py-6 font-bold text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 mt-auto" onClick={onComplete}>
                Dashboard öffnen
            </Button>
        </div>
    );
};
