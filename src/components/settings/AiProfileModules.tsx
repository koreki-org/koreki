import React from 'react';
import { SlidersHorizontal, RefreshCcw, Save, Brain, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { cn } from '@/lib/utils';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { describeTemperature } from '@/lib/ai/temperature-guidance';


interface EditorProps {
    isCreatingNew: boolean;
    selectedProfile: string;
    isSystemSelected: boolean;
    isDirty: boolean;
    saving: boolean;
    newProfileName: string;
    setNewProfileName: (v: string) => void;
    onSaveToDB: () => void;
    onStartNew: (template?: any) => void;

    activeTab: 'correction' | 'vision';
    setActiveTab: (tab: 'correction' | 'vision') => void;

    // Parameters
    enableThinking: boolean;
    setEnableThinking: (v: boolean) => void;
    temperature: number;
    setTemperature: (v: number) => void;
    topP: number;
    setTopP: (v: number) => void;
    maxTokens: number;
    setMaxTokens: (v: number) => void;
    presencePenalty: number;
    setPresencePenalty: (v: number) => void;

    visionTemperature: number;
    setVisionTemperature: (v: number) => void;
    visionTopP: number;
    setVisionTopP: (v: number) => void;
    visionMaxTokens: number;
    setVisionMaxTokens: (v: number) => void;
    visionPresencePenalty: number;
    setVisionPresencePenalty: (v: number) => void;

    provider?: string;
    ollamaNumCtx: number;
    setOllamaNumCtx: (v: number) => void;
}

export const AiProfileEditor: React.FC<EditorProps> = ({
    isCreatingNew, selectedProfile, isSystemSelected, isDirty, saving, 
    newProfileName, setNewProfileName, onSaveToDB, onStartNew,
    activeTab, setActiveTab,
    enableThinking, setEnableThinking,
    temperature, setTemperature,
    topP, setTopP,
    maxTokens, setMaxTokens,
    presencePenalty, setPresencePenalty,
    visionTemperature, setVisionTemperature,
    visionTopP, setVisionTopP,
    visionMaxTokens, setVisionMaxTokens,
    visionPresencePenalty, setVisionPresencePenalty,
    provider,
    ollamaNumCtx,
    setOllamaNumCtx
}) => {
    const getTempDescription = describeTemperature;

    return (
        <div className="flex-1 flex flex-col space-y-4 sm:space-y-6 overflow-y-auto p-4 sm:p-8">
            <div className="flex justify-between items-center gap-6">
                <div className="flex-1 space-y-2">
                    <label className="text-xxs font-bold text-muted-foreground uppercase tracking-widest">
                        {isCreatingNew ? 'Name für neues KI-Profil' : 'Gewähltes KI-Profil'}
                    </label>
                    {isCreatingNew ? (
                        <Input
                            autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                            placeholder="z.B. Kalt & Präzise" className="text-lg sm:text-xl font-black border-primary/20 h-12 sm:h-14 rounded-xl sm:rounded-2xl"
                        />
                    ) : (
                        <h3 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-3 truncate">
                            {selectedProfile}
                            {isSystemSelected && <Badge variant="outline" className="text-xxs bg-muted text-muted-foreground px-3 py-1 rounded-full border-transparent">SYSTEM</Badge>}
                        </h3>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isDirty && !isCreatingNew && !isSystemSelected && (
                        <div className="flex items-center gap-2 text-warning animate-pulse px-2 hidden sm:flex">
                            <RefreshCcw size={14} />
                            <span className="text-xxs font-bold uppercase tracking-widest">Ungespeichert</span>
                        </div>
                    )}
                    {!isSystemSelected && (
                        <Button 
                            onClick={onSaveToDB} 
                            disabled={!isDirty || saving}
                            className="h-9 px-4 text-xxs whitespace-nowrap font-bold uppercase rounded-full flex items-center gap-1.5 shadow-md transition-all border-0"
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-foreground border-t-transparent" />
                            ) : (
                                <Save size={14} />
                            )}
                            Speichern
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-muted p-1 rounded-xl border border-border/50">
                <button
                    onClick={() => setActiveTab('correction')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                        activeTab === 'correction'
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Brain size={14} className={activeTab === 'correction' ? "text-primary" : "text-muted-foreground"} />
                    Korrektur &amp; Analyse
                </button>
                <button
                    onClick={() => setActiveTab('vision')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                        activeTab === 'vision'
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Eye size={14} className={activeTab === 'vision' ? "text-success" : "text-muted-foreground"} />
                    Handschriften-OCR (Vision)
                </button>
            </div>

            {/* Sliders and Toggles form */}
            <div className="flex-1 flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                        <SlidersHorizontal size={18} className="text-primary" /> Parameter-Feintuning
                    </label>
                </div>

                <div className="space-y-6 overflow-y-auto pr-1">
                    {activeTab === 'correction' ? (
                        <>
                            {/* Toggle for Deep Reasoning */}
                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-lg transition-colors", enableThinking ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                            <Brain size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight text-foreground">Deep Reasoning</p>
                                            <p className="text-xxs text-muted-foreground font-medium">Aktiviert tiefere Überlegungen vor Notenerteilung</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={enableThinking}
                                        onClick={() => {
                                            const nextVal = !enableThinking;
                                            setEnableThinking(nextVal);
                                            if (nextVal) {
                                                setTemperature(0.6);
                                                setTopP(0.95);
                                            } else {
                                                setTemperature(0.7);
                                                setTopP(0.8);
                                            }
                                        }}
                                        className={cn(
                                            "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            enableThinking ? "bg-primary" : "bg-muted"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                                                enableThinking ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Slider: Temperature */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider">Temperatur (Kreativität)</label>
                                        <KorekiTooltip 
                                            title="Temperatur" 
                                            content="Steuert die Kreativität des Modells. 0.0 ist maximal deterministisch (präzise). Höhere Werte erlauben kreativeres und abwechslungsreicheres Feedback."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{temperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min={(provider === 'ollama' || provider === 'openai-compatible') ? "0.2" : "0.0"} max="2.0" step="0.1" value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold leading-relaxed">
                                    <span>{getTempDescription(temperature, 'correction')}</span>
                                    <span className="text-xxs text-muted-foreground font-medium">Standard: {enableThinking ? "0.6" : "0.7"}</span>
                                </div>
                            </div>

                            {/* Slider: Top P */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider">Top P (Nucleus Sampling)</label>
                                        <KorekiTooltip 
                                            title="Top P" 
                                            content="Eingrenzung des Wortschatzes. 0.95 bedeutet, dass nur die obersten 95% der wahrscheinlichsten Wörter berücksichtigt werden, um Ausreißer zu vermeiden."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{topP.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0.0" max="1.0" step="0.05" value={topP}
                                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold">
                                    <span>Beschränkt den Token-Auswahlpool</span>
                                    <span className="text-xxs text-muted-foreground font-medium">Standard: {enableThinking ? "0.95" : "0.80"}</span>
                                </div>
                            </div>

                            {/* Slider: Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider">Max Tokens (num_predict)</label>
                                        <KorekiTooltip 
                                            title="Max Tokens" 
                                            content="Die absolute Obergrenze für die Länge der KI-Generierung. Verhindert unendliche Textschleifen. System-Aktionen (z. B. Mapping) werden im Backend automatisch auf 8.192 gedeckelt, um Kontextüberläufe zu verhindern."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{maxTokens.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range" min="2048" max="32768" step="1024" value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold">
                                    <span>Maximale Länge des KI-Antworttexts</span>
                                    <span className="text-xxs text-muted-foreground font-medium">Standard: 32.768</span>
                                </div>
                            </div>

                            {/* Slider: Presence Penalty */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider">Presence Penalty</label>
                                        <KorekiTooltip 
                                            title="Presence Penalty" 
                                            content="Bestraft die wiederholte Verwendung gleicher Wörter. Ein Wert von 0.0 ist empfohlen für mathematische Aufgaben und präzise Tabellen-Mappings, um Auslassungen von Aufgabenbezeichnern zu vermeiden."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{presencePenalty.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="-2.0" max="2.0" step="0.1" value={presencePenalty}
                                    onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold">
                                    <span>Bestraft Wortwiederholungen im Fließtext</span>
                                    <span className="text-xxs text-muted-foreground font-medium">Standard: 0.0</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Slider: Vision Temperature */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider">Vision Temperatur</label>
                                        <KorekiTooltip 
                                            title="Vision Temperatur" 
                                            content="Steuert die Temperatur speziell für die Handschriften-Erkennung (OCR). Werte nahe 0.4 werden erzwungen, um lokale Schleifen bei unklaren Schriftzeichen zu verhindern."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{visionTemperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min={(provider === 'ollama' || provider === 'openai-compatible') ? "0.2" : "0.0"} max="2.0" step="0.1" value={visionTemperature}
                                    onChange={(e) => setVisionTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold leading-relaxed">
                                    <span>{getTempDescription(visionTemperature, 'vision')}</span>
                                    <span className="text-xxs text-muted-foreground font-medium">Standard: 0.2</span>
                                </div>
                            </div>

                            {/* Slider: Vision Top P */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider">Vision Top P</label>
                                        <KorekiTooltip 
                                            title="Vision Top P" 
                                            content="Begrenzung des Wortschatzes bei der OCR. Hilft dem Vision-Modell, sich auf wahrscheinliche Zeichenkombinationen zu fokussieren."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{visionTopP.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0.0" max="1.0" step="0.05" value={visionTopP}
                                    onChange={(e) => setVisionTopP(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold">
                                    <span>Vokabularbegrenzung bei der Texterkennung</span>
                                    <span className="text-xxs text-muted-foreground font-medium">Standard: 0.80</span>
                                </div>
                            </div>

                            {/* Slider: Vision Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider">Vision Max Tokens (num_predict)</label>
                                        <KorekiTooltip 
                                            title="Vision Max Tokens" 
                                            content="Die maximale Token-Länge für die OCR-Erkennung pro Seite. Standardmäßig auf 16.000 begrenzt."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{visionMaxTokens.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range" min="1024" max="32768" step="1024" value={visionMaxTokens}
                                    onChange={(e) => setVisionMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold">
                                    <span>Maximale Länge des extrahierten Texts</span>
                                    <span className="text-xxs text-muted-foreground font-medium">Standard: 16.000</span>
                                </div>
                            </div>

                            {/* Slider: Vision Presence Penalty */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider">Vision Presence Penalty</label>
                                        <KorekiTooltip 
                                            title="Vision Presence Penalty" 
                                            content="Bestrafung wiederholter Wörter beim OCR-Durchlauf. Empfohlener Standard ist 0.0."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{visionPresencePenalty.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="-2.0" max="2.0" step="0.1" value={visionPresencePenalty}
                                    onChange={(e) => setVisionPresencePenalty(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold">
                                    <span>Steuert Wortwiederholungs-Bestrafung bei OCR</span>
                                    <span className="text-xxs text-muted-foreground font-medium">Standard: 0.0</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Kontext-Größe (num_ctx) - Desktop / Local Inference only */}
                    {provider === 'ollama' && (
                        <div className="pt-4 border-t border-border space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                    <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        Kontext-Größe (num_ctx)
                                    </label>
                                    <KorekiTooltip 
                                        title="Kontext-Größe (num_ctx)" 
                                        content="Das Gesamtfenster (Prompt + Antwort) des Modells. Im automatischen Modus skaliert das System die Größe dynamisch passend zur OCR-Textlänge. num_predict (die maximale Generierung) wird im Backend immer automatisch auf das verbleibende Kontextfenster gedeckelt, damit die Antwort nicht unvollständig abgeschnitten wird."
                                        buttonClassName="h-6 w-6"
                                        iconSize={14}
                                        align="left"
                                    />
                                </div>
                                <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">
                                    {!ollamaNumCtx || ollamaNumCtx === 0 ? 'Automatisch' : `${ollamaNumCtx.toLocaleString()}`}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 bg-muted border border-border p-2.5 rounded-xl hover:bg-muted/70 transition-all cursor-pointer" onClick={() => {
                                if (ollamaNumCtx === 0) {
                                    setOllamaNumCtx(16384);
                                } else {
                                    setOllamaNumCtx(0);
                                }
                            }}>
                                <input
                                    type="checkbox"
                                    id="ollamaNumCtxAuto"
                                    checked={!ollamaNumCtx || ollamaNumCtx === 0}
                                    onChange={(e) => {
                                        setOllamaNumCtx(e.target.checked ? 0 : 16384);
                                    }}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 transition-all cursor-pointer"
                                />
                                <div className="flex-1 cursor-pointer select-none">
                                    <label htmlFor="ollamaNumCtxAuto" className="text-xs font-bold text-foreground block cursor-pointer">
                                        Automatische Kontext-Skalierung (Empfohlen)
                                    </label>
                                    <span className="text-xxs text-muted-foreground block leading-tight">
                                        Skaliert das Kontextfenster dynamisch je nach Dokumenten- und Bildgröße, um Grafikspeicher (VRAM) zu sparen.
                                    </span>
                                </div>
                            </div>
                            
                            {ollamaNumCtx > 0 && (
                                <div className="flex gap-2 animate-fade-in">
                                    <select
                                        value={[8192, 16384, 32768, 65536].includes(ollamaNumCtx) ? ollamaNumCtx : 'custom'}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val !== 'custom') {
                                                setOllamaNumCtx(Number(val));
                                            }
                                        }}
                                        className="rounded-xl border-2 border-border focus:border-primary/50 bg-background px-3 py-2 text-xs font-bold text-foreground outline-none transition-all"
                                    >
                                        <option value={8192}>8k (8192)</option>
                                        <option value={16384}>16k (16384)</option>
                                        <option value={32768}>32k (32768)</option>
                                        <option value={65536}>64k (65536)</option>
                                        <option value="custom">Benutzerdefiniert</option>
                                    </select>
                                    
                                    <Input 
                                        type="number"
                                        placeholder="z.B. 16384"
                                        value={ollamaNumCtx || ''} 
                                        onChange={e => {
                                            const val = e.target.value ? Number(e.target.value) : 16384;
                                            setOllamaNumCtx(val);
                                        }}
                                        className="rounded-xl border-2 focus:border-primary/50 transition-all text-xs font-mono flex-1 h-9"
                                        min={2048}
                                        max={262144}
                                    />
                                </div>
                            )}
                            {ollamaNumCtx > 0 && (
                                <p className="text-xxs text-muted-foreground font-medium">
                                    Größere manuelle Werte ermöglichen die Verarbeitung extrem großer Dokumente, verbrauchen aber dauerhaft viel Grafikspeicher (VRAM).
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
