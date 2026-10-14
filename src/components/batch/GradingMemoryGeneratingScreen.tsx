import React from 'react';
import { Bot } from 'lucide-react';

export const GradingMemoryGeneratingScreen: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center animate-pulse">
            <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                <Bot size={28} className="absolute inset-0 m-auto text-primary animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 font-outfit">Simuliere virtuelle Schülerabgaben...</h3>
            <p className="text-muted-foreground text-xs md:text-sm max-w-[450px]">
                Die KI analysiert deine Musterlösung und schlüpft in die Rollen verschiedener Schüler-Avatare, um Tippfehler, lückenhafte Rechenwege und schwammige Sprache zu simulieren und zu bewerten.
            </p>
        </div>
    );
};
