import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExcelFormatHinweis } from '@/components/batch/ExcelFormatHinweis';
import type { StapelAufteilen } from '@/hooks/useStapelAufteilen';

interface AufteilenWerkzeugeProps {
    zustand: StapelAufteilen;
    seitenGesamt: number;
}

/**
 * Die zwei Abkuerzungen ueber der Seite: gleich lange Arbeiten auf einen Schlag
 * schneiden und die Klassenliste laden. Dazu der Stand.
 */
const AufteilenWerkzeuge: React.FC<AufteilenWerkzeugeProps> = ({ zustand, seitenGesamt }) => {
    // Startwert aus dem Zustand: Die Klassenliste kann vorschneiden, dann steht die Zahl hier.
    // Der Aufrufer setzt `key` auf diesen Wert, damit das Feld ihn uebernimmt.
    const [seitenJe, setSeitenJe] = useState(zustand.seitenJe ? String(zustand.seitenJe) : '');
    const zahl = parseInt(seitenJe, 10);
    const { stuecke, eingaben, klassenliste } = zustand;
    const benannt = stuecke.filter(s => (eingaben[s.start] ?? '').trim() !== '').length;

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
                <label htmlFor="seiten-je-arbeit" className="text-sm text-foreground">Seiten je Arbeit</label>
                <Input
                    id="seiten-je-arbeit"
                    type="number"
                    min={1}
                    max={seitenGesamt}
                    value={seitenJe}
                    onChange={(e) => setSeitenJe(e.target.value)}
                    className="w-20 text-center"
                />
                <Button variant="outline" size="sm" disabled={!(zahl > 0)} onClick={() => zustand.jeArbeit(zahl)}>
                    Übernehmen
                </Button>
            </div>
            <div className="flex items-center gap-1.5">
                <Button variant="chip" size="sm" onClick={zustand.ladeKlassenliste}>
                    <FileSpreadsheet className="w-5 h-5" /> Klassenliste laden
                </Button>
                <ExcelFormatHinweis />
            </div>
            <p className="ml-auto text-sm text-foreground m-0">
                {stuecke.length} {stuecke.length === 1 ? 'Arbeit' : 'Arbeiten'} · {benannt} mit Namen
                {klassenliste.length > 0 && klassenliste.length !== stuecke.length && (
                    <span className="text-warning"> · Klassenliste: {klassenliste.length} Namen</span>
                )}
            </p>
        </div>
    );
};

export default AufteilenWerkzeuge;
