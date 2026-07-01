import React from 'react';
import { Bot } from 'lucide-react';

export const GradingMemoryGeneratingScreen: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center animate-pulse">
            <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-600/10 border-t-indigo-600 animate-spin" />
                <Bot size={28} className="absolute inset-0 m-auto text-indigo-600 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-outfit">Simuliere virtuelle Schülerabgaben...</h3>
            <p className="text-slate-500 text-xs md:text-sm max-w-[450px]">
                Die KI analysiert deine Musterlösung und schlüpft in die Rollen verschiedener Schüler-Avatare, um Tippfehler, lückenhafte Rechenwege und schwammige Sprache zu simulieren und zu bewerten.
            </p>
        </div>
    );
};
