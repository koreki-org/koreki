import React from 'react';
import { cn } from '@/lib/utils';

/*
 * Modell-Empfehlungen fuer die lokale Nutzung. Beschreibt, wofuer sich ein
 * Modell eignet — keine Superlative (marketing-communication §3).
 */
const MODELLE = [
    // Qwen 3.8 nur in genau der gemessenen Fassung (GEPRUEFTE_MODELLE, 20.10.2026);
    // seit 21.10.2026 die aktuelle Empfehlung, 3.6 bleibt geprueft.
    { name: 'Qwen 3.8 (27B) · Qwen 3.6 (35B)', marke: 'Empfohlen', text: 'Aktuell empfohlen ist Qwen 3.8 – in Ollama genau als qwen3.8:27b-mtp-q4_K_M. Qwen 3.6 ist ebenfalls geprüft. Beide lesen getippte und handschriftliche Arbeiten und brauchen einen leistungsfähigen Rechner mit Grafikkarte.' },
    { name: 'Mistral Small 3.2', marke: 'Sparsam', text: 'Gut für getippte Texte und PDFs mit kopierbarem Text. Läuft auch auf schwächerer Hardware.' },
    { name: 'Gemma 4 (31B)', marke: 'Alternative', text: 'Eine weitere Wahl für Handschrift und mathematische Darstellungen.' },
];

export const ModelProfiles: React.FC = () => (
    <div className="w-full">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Welches Modell passt?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Empfehlungen für die Nutzung mit Ollama.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MODELLE.map((m, i) => (
                <div key={m.name} className={cn("bg-card rounded-2xl p-6 shadow-card", i === 0 && "ring-2 ring-primary")}>
                    <span className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                        i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        {m.marke}
                    </span>
                    <p className="mt-3 font-semibold text-foreground">{m.name}</p>
                    <p className="mt-1.5 text-sm/relaxed text-muted-foreground">{m.text}</p>
                </div>
            ))}
        </div>
    </div>
);
