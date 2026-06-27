import React from 'react';
import { SlidersHorizontal, PlusCircle, Pencil, Trash2, Check, RefreshCcw, Save, Brain, Eye, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { cn } from '@/lib/utils';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';

interface SidebarProps {
    profiles: any[];
    selectedProfile: string;
    isCreatingNew: boolean;
    editingProfileId: string | null;
    editingName: string;
    onStartNew: (template?: any) => void;
    onSelectProfile: (p: any) => void;
    onStartRename: (e: React.MouseEvent, p: any) => void;
    onDeleteProfile: (id: string, e: React.MouseEvent) => void;
    onExportProfile: (p: any, e: React.MouseEvent) => void;
    onImportProfile: (p: any) => void;
    onConfirmRename: () => void;
    setEditingName: (v: string) => void;
    setEditingProfileId: (v: string | null) => void;
}

export const AiProfileSidebar: React.FC<SidebarProps> = ({
    profiles, 
    selectedProfile, 
    isCreatingNew, 
    editingProfileId, 
    editingName,
    onStartNew, 
    onSelectProfile, 
    onStartRename, 
    onDeleteProfile, 
    onExportProfile,
    onImportProfile,
    onConfirmRename, 
    setEditingName, 
    setEditingProfileId
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            onImportProfile(parsed);
        } catch (err) {
            alert("Ungültiges KI-Profil-Format (JSON erwartet).");
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            onImportProfile(parsed);
        } catch (err) {
            alert("Ungültiges KI-Profil-Format.");
        }
    };

    return (
        <div 
            className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-200 ${isDragging ? 'bg-indigo-50/80 ring-2 ring-inset ring-indigo-500' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-50/80 backdrop-blur-sm border-2 border-dashed border-indigo-500 rounded-2xl m-2 pointer-events-none">
                    <div className="flex flex-col items-center text-indigo-600 font-bold gap-2">
                        <RefreshCcw size={32} className="animate-spin-slow" />
                        <p>KI-Profil hier loslassen!</p>
                    </div>
                </div>
            )}
            <div className="p-4 border-b border-slate-100 space-y-2">
                <Button onClick={onStartNew} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md gap-2">
                    <PlusCircle size={18} /> Neues Profil
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-10 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 gap-2">
                    <RefreshCcw size={16} /> KI-Profil importieren
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".json" 
                    className="hidden" 
                />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 pt-4">
                {/* User Profiles */}
                {profiles.filter(p => !p.isSystem).length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xxs uppercase font-black text-slate-400 tracking-widest px-2">Eigene Profile</label>
                        {profiles.filter(p => !p.isSystem).map(p => (
                            <div
                                key={p.id}
                                onClick={() => onSelectProfile(p)}
                                className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer relative ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <SlidersHorizontal size={18} className={selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-400'} />
                                    {editingProfileId === p.id ? (
                                        <Input 
                                            autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)}
                                            className="h-8 text-xs font-bold border-indigo-200" onClick={(e) => e.stopPropagation()}
                                            onBlur={onConfirmRename} onKeyDown={(e) => e.key === 'Enter' && onConfirmRename()}
                                        />
                                    ) : (
                                        <span className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'} group-hover:pr-[80px]`}>{p.name}</span>
                                    )}
                                </div>
                                
                                <FloatingActions className="-top-2 -right-2">
                                    {editingProfileId === p.id ? (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={(e) => { e.stopPropagation(); onConfirmRename(); }}>
                                            <Check size={14} />
                                        </Button>
                                    ) : (
                                        <>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                title="Profil kopieren"
                                                className="h-8 w-8 text-slate-600 hover:text-indigo-600 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStartNew(p);
                                                }}
                                            >
                                                <PlusCircle size={14} />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-600 hover:text-indigo-600 transition-colors" 
                                                onClick={(e) => onExportProfile(p, e)} 
                                                title="Profil exportieren (.json)"
                                            >
                                                <Download size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-indigo-600 transition-colors" onClick={(e) => onStartRename(e, p)} title="Umbenennen">
                                                <Pencil size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-500 transition-colors" onClick={(e) => onDeleteProfile(p.id, e)} title="Löschen">
                                                <Trash2 size={14} />
                                            </Button>
                                        </>
                                    )}
                                </FloatingActions>
                            </div>
                        ))}
                    </div>
                )}
                {/* System Templates */}
                <div className="space-y-2">
                    <label className="text-xxs uppercase font-black text-slate-400 tracking-widest px-2">System-Vorlagen</label>
                    {profiles.filter(p => p.isSystem).map(p => (
                        <div
                            key={p.name}
                            onClick={() => onSelectProfile(p)}
                            className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer relative ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <SlidersHorizontal size={18} className={selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-400'} />
                                <span className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'} group-hover:pr-[40px]`}>{p.name}</span>
                            </div>
                            <FloatingActions className="-top-2 -right-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Als Vorlage verwenden (Kopieren)"
                                    className="h-8 w-8 text-slate-600 hover:text-indigo-600 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStartNew(p);
                                    }}
                                >
                                    <PlusCircle size={14} />
                                </Button>
                            </FloatingActions>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

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
    // Helper for temperature description
    const getTempDescription = (val: number, tab: 'correction' | 'vision') => {
        if (tab === 'vision') {
            if (val === 0) return 'Präzises OCR (Empfohlen)';
            if (val <= 0.3) return 'Sehr deterministisch';
            if (val <= 0.7) return 'Standard Transkription';
            return 'Kreative Texterkennung (Vorsicht!)';
        } else {
            if (val === 0) return 'Strikte Konsistenz (Deterministisch)';
            if (val <= 0.6) return 'Empfohlen für Deep Reasoning (Präzise)';
            if (val <= 0.8) return 'Ausgewogene Notengebung (Standard)';
            if (val <= 1.2) return 'Abwechslungsreiches Feedback';
            return 'Hochgradig kreativ (Nicht für Noten empfohlen)';
        }
    };

    return (
        <div className="flex-1 flex flex-col space-y-4 sm:space-y-6 overflow-y-auto p-4 sm:p-8">
            <div className="flex justify-between items-center gap-6">
                <div className="flex-1 space-y-2">
                    <label className="text-xxs font-black text-slate-400 uppercase tracking-widest">
                        {isCreatingNew ? 'Name für neues KI-Profil' : 'Gewähltes KI-Profil'}
                    </label>
                    {isCreatingNew ? (
                        <Input
                            autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                            placeholder="z.B. Kalt & Präzise" className="text-lg sm:text-xl font-black border-indigo-200 h-12 sm:h-14 rounded-xl sm:rounded-2xl"
                        />
                    ) : (
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3 truncate">
                            {selectedProfile}
                            {isSystemSelected && <Badge variant="outline" className="text-xxs bg-slate-100 text-slate-500 px-3 py-1 rounded-full border-transparent">SYSTEM</Badge>}
                        </h3>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isDirty && !isCreatingNew && !isSystemSelected && (
                        <div className="flex items-center gap-2 text-amber-500 animate-pulse px-2 hidden sm:flex">
                            <RefreshCcw size={14} />
                            <span className="text-xxs font-black uppercase tracking-widest">Ungespeichert</span>
                        </div>
                    )}
                    {!isSystemSelected && (
                        <Button 
                            onClick={onSaveToDB} 
                            disabled={!isDirty || saving}
                            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white !text-xxs whitespace-nowrap font-black uppercase rounded-full flex items-center gap-1.5 shadow-md shadow-indigo-100 transition-all border-0"
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                            ) : (
                                <Save size={14} />
                            )}
                            Speichern
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                <button
                    onClick={() => setActiveTab('correction')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                        activeTab === 'correction'
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Brain size={14} className={activeTab === 'correction' ? "text-indigo-500" : "text-slate-400"} />
                    Korrektur & Analyse
                </button>
                <button
                    onClick={() => setActiveTab('vision')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                        activeTab === 'vision'
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Eye size={14} className={activeTab === 'vision' ? "text-emerald-500" : "text-slate-400"} />
                    Handschriften-OCR (Vision)
                </button>
            </div>

            {/* Sliders and Toggles form */}
            <div className="flex-1 flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <SlidersHorizontal size={18} className="text-indigo-600" /> Parameter-Feintuning
                    </label>
                </div>

                <div className="space-y-6 overflow-y-auto pr-1">
                    {activeTab === 'correction' ? (
                        <>
                            {/* Toggle for Deep Reasoning */}
                            <div className="p-4 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-lg transition-colors", enableThinking ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400")}>
                                            <Brain size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight text-slate-700">Deep Reasoning</p>
                                            <p className="text-xxs text-slate-500 font-medium">Aktiviert tiefere Überlegungen vor Notenerteilung</p>
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
                                            enableThinking ? "bg-indigo-500" : "bg-slate-200"
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
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Temperatur (Kreativität)</label>
                                        <KorekiTooltip 
                                            title="Temperatur" 
                                            content="Steuert die Kreativität des Modells. 0.0 ist maximal deterministisch (präzise). Höhere Werte erlauben kreativeres und abwechslungsreicheres Feedback."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{temperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min={(provider === 'ollama' || provider === 'openai-compatible') ? "0.2" : "0.0"} max="2.0" step="0.1" value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-slate-500 font-semibold leading-relaxed">
                                    <span>{getTempDescription(temperature, 'correction')}</span>
                                    <span className="text-xxs text-slate-400 font-medium">Standard: {enableThinking ? "0.6" : "0.7"}</span>
                                </div>
                            </div>

                            {/* Slider: Top P */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top P (Nucleus Sampling)</label>
                                        <KorekiTooltip 
                                            title="Top P" 
                                            content="Eingrenzung des Wortschatzes. 0.95 bedeutet, dass nur die obersten 95% der wahrscheinlichsten Wörter berücksichtigt werden, um Ausreißer zu vermeiden."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{topP.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0.0" max="1.0" step="0.05" value={topP}
                                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-slate-500 font-semibold">
                                    <span>Beschränkt den Token-Auswahlpool</span>
                                    <span className="text-xxs text-slate-400 font-medium">Standard: {enableThinking ? "0.95" : "0.80"}</span>
                                </div>
                            </div>

                            {/* Slider: Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Max Tokens (num_predict)</label>
                                        <KorekiTooltip 
                                            title="Max Tokens" 
                                            content="Die absolute Obergrenze für die Länge der KI-Generierung. Verhindert unendliche Textschleifen. System-Aktionen (z. B. Mapping) werden im Backend automatisch auf 8.192 gedeckelt, um Kontextüberläufe zu verhindern."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{maxTokens.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range" min="2048" max="32768" step="1024" value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-slate-500 font-semibold">
                                    <span>Maximale Länge des KI-Antworttexts</span>
                                    <span className="text-xxs text-slate-400 font-medium">Standard: 32.768</span>
                                </div>
                            </div>

                            {/* Slider: Presence Penalty */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Presence Penalty</label>
                                        <KorekiTooltip 
                                            title="Presence Penalty" 
                                            content="Bestraft die wiederholte Verwendung gleicher Wörter. Ein Wert von 0.0 ist empfohlen für mathematische Aufgaben und präzise Tabellen-Mappings, um Auslassungen von Aufgabenbezeichnern zu vermeiden."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{presencePenalty.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="-2.0" max="2.0" step="0.1" value={presencePenalty}
                                    onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-slate-500 font-semibold">
                                    <span>Bestraft Wortwiederholungen im Fließtext</span>
                                    <span className="text-xxs text-slate-400 font-medium">Standard: 0.0</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Slider: Vision Temperature */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Temperatur</label>
                                        <KorekiTooltip 
                                            title="Vision Temperatur" 
                                            content="Steuert die Temperatur speziell für die Handschriften-Erkennung (OCR). Werte nahe 0.4 werden erzwungen, um lokale Schleifen bei unklaren Schriftzeichen zu verhindern."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionTemperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min={(provider === 'ollama' || provider === 'openai-compatible') ? "0.2" : "0.0"} max="2.0" step="0.1" value={visionTemperature}
                                    onChange={(e) => setVisionTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-slate-500 font-semibold leading-relaxed">
                                    <span>{getTempDescription(visionTemperature, 'vision')}</span>
                                    <span className="text-xxs text-slate-400 font-medium">Standard: 0.2</span>
                                </div>
                            </div>

                            {/* Slider: Vision Top P */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Top P</label>
                                        <KorekiTooltip 
                                            title="Vision Top P" 
                                            content="Begrenzung des Wortschatzes bei der OCR. Hilft dem Vision-Modell, sich auf wahrscheinliche Zeichenkombinationen zu fokussieren."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionTopP.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0.0" max="1.0" step="0.05" value={visionTopP}
                                    onChange={(e) => setVisionTopP(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-slate-500 font-semibold">
                                    <span>Vokabularbegrenzung bei der Texterkennung</span>
                                    <span className="text-xxs text-slate-400 font-medium">Standard: 0.80</span>
                                </div>
                            </div>

                            {/* Slider: Vision Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Max Tokens (num_predict)</label>
                                        <KorekiTooltip 
                                            title="Vision Max Tokens" 
                                            content="Die maximale Token-Länge für die OCR-Erkennung pro Seite. Standardmäßig auf 16.000 begrenzt."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionMaxTokens.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range" min="1024" max="32768" step="1024" value={visionMaxTokens}
                                    onChange={(e) => setVisionMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-slate-500 font-semibold">
                                    <span>Maximale Länge des extrahierten Texts</span>
                                    <span className="text-xxs text-slate-400 font-medium">Standard: 16.000</span>
                                </div>
                            </div>

                            {/* Slider: Vision Presence Penalty */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Presence Penalty</label>
                                        <KorekiTooltip 
                                            title="Vision Presence Penalty" 
                                            content="Bestrafung wiederholter Wörter beim OCR-Durchlauf. Empfohlener Standard ist 0.0."
                                            buttonClassName="h-6 w-6"
                                            iconSize={14}
                                            align="left"
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionPresencePenalty.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="-2.0" max="2.0" step="0.1" value={visionPresencePenalty}
                                    onChange={(e) => setVisionPresencePenalty(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-xxs text-slate-500 font-semibold">
                                    <span>Steuert Wortwiederholungs-Bestrafung bei OCR</span>
                                    <span className="text-xxs text-slate-400 font-medium">Standard: 0.0</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Kontext-Größe (num_ctx) - Desktop / Local Inference only */}
                    {provider === 'ollama' && (
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
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
                                <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">
                                    {!ollamaNumCtx || ollamaNumCtx === 0 ? 'Automatisch' : `${ollamaNumCtx.toLocaleString()}`}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:bg-slate-100/70 transition-all cursor-pointer" onClick={() => {
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
                                    className="h-4 w-4 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500/30 transition-all cursor-pointer"
                                />
                                <div className="flex-1 cursor-pointer select-none">
                                    <label htmlFor="ollamaNumCtxAuto" className="text-xs font-bold text-slate-700 block cursor-pointer">
                                        Automatische Kontext-Skalierung (Empfohlen)
                                    </label>
                                    <span className="text-xxs text-slate-400 block leading-tight">
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
                                        className="rounded-xl border-2 border-slate-200 focus:border-primary/50 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all"
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
                                <p className="text-xxs text-slate-400 font-medium">
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
