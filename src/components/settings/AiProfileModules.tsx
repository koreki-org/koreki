import React from 'react';
import { SlidersHorizontal, PlusCircle, Pencil, Trash2, Check, RefreshCcw, Save, Brain, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface SidebarProps {
    profiles: any[];
    selectedProfile: string;
    isCreatingNew: boolean;
    editingProfileId: string | null;
    editingName: string;
    onStartNew: () => void;
    onSelectProfile: (p: any) => void;
    onStartRename: (e: React.MouseEvent, p: any) => void;
    onDeleteProfile: (id: string, e: React.MouseEvent) => void;
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
    onConfirmRename, 
    setEditingName, 
    setEditingProfileId
}) => (
    <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100">
            <Button onClick={onStartNew} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md gap-2">
                <PlusCircle size={18} /> Neues Profil
            </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 pt-4">
            {/* User Profiles */}
            {profiles.filter(p => !p.isSystem).length > 0 && (
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">Eigene Profile</label>
                    {profiles.filter(p => !p.isSystem).map(p => (
                        <Button
                            key={p.id}
                            variant="ghost"
                            onClick={() => onSelectProfile(p)}
                            className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
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
                                    <span className={`text-xs md:text-sm font-bold truncate ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'}`}>{p.name}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {editingProfileId === p.id ? (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={(e) => { e.stopPropagation(); onConfirmRename(); }}>
                                        <Check size={14} />
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-opacity" onClick={(e) => onStartRename(e, p)}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" onClick={(e) => onDeleteProfile(p.id, e)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </Button>
                    ))}
                </div>
            )}
            {/* System Templates */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">System-Vorlagen</label>
                {profiles.filter(p => p.isSystem).map(p => (
                    <Button
                        key={p.name}
                        variant="ghost"
                        onClick={() => onSelectProfile(p)}
                        className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <SlidersHorizontal size={18} className={selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className={`text-xs md:text-sm font-bold ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'}`}>{p.name}</span>
                        </div>
                    </Button>
                ))}
            </div>
        </div>
    </div>
);

interface EditorProps {
    isCreatingNew: boolean;
    selectedProfile: string;
    isSystemSelected: boolean;
    isDirty: boolean;
    saving: boolean;
    newProfileName: string;
    setNewProfileName: (v: string) => void;
    onSaveToDB: () => void;
    onStartNew: () => void;

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
    visionPresencePenalty, setVisionPresencePenalty
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
            <div className="flex justify-between items-end gap-6">
                <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {isCreatingNew ? 'Name für neues KI-Profil' : 'Gewähltes KI-Profil'}
                    </label>
                    {isCreatingNew ? (
                        <Input
                            autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                            placeholder="z.B. Kalt & Präzise" className="text-lg sm:text-xl font-black border-indigo-200 h-12 sm:h-14 rounded-xl sm:rounded-2xl"
                        />
                    ) : (
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                            {selectedProfile}
                            {isSystemSelected && <Badge variant="outline" className="text-[7px] sm:text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full border-transparent">SYSTEM</Badge>}
                        </h3>
                    )}
                </div>
                {isDirty && !isCreatingNew && !isSystemSelected && (
                    <div className="flex items-center gap-2 text-amber-500 animate-pulse pb-2 shrink-0">
                        <RefreshCcw size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ungespeichertes</span>
                    </div>
                )}
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
                    <div className="flex gap-2">
                        {!isSystemSelected && (
                            <Button variant="outline" size="sm" disabled={!isDirty || saving} onClick={onSaveToDB} className={`h-8 sm:h-9 rounded-full text-[10px] font-black uppercase gap-2 px-3 sm:px-4 ${isDirty ? 'border-indigo-600 bg-indigo-50 text-indigo-600 animate-pulse' : 'border-slate-100 text-slate-300'}`}>
                                <Save size={14} /> Speichern
                            </Button>
                        )}
                        {!isCreatingNew && (
                            <Button variant="outline" size="sm" onClick={onStartNew} className="h-8 sm:h-9 rounded-full text-[10px] font-black uppercase border-indigo-100 text-indigo-600 gap-2 px-3 sm:px-4">
                                <PlusCircle size={14} /> Kopieren
                            </Button>
                        )}
                    </div>
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
                                            <p className="text-[10px] text-slate-500 font-medium">Aktiviert tiefere Überlegungen vor Notenerteilung</p>
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
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Temperatur (Kreativität)</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{temperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="0.0" max="2.0" step="0.1" value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold leading-relaxed">
                                    <span>{getTempDescription(temperature, 'correction')}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: {enableThinking ? "0.6" : "0.7"}</span>
                                </div>
                            </div>

                            {/* Slider: Top P */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top P (Nucleus Sampling)</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{topP.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0.0" max="1.0" step="0.05" value={topP}
                                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Beschränkt den Token-Auswahlpool</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: {enableThinking ? "0.95" : "0.80"}</span>
                                </div>
                            </div>

                            {/* Slider: Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Max Tokens</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{maxTokens.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range" min="2000" max="32768" step="1000" value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Maximale Länge des KI-Antworttexts</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 32.768</span>
                                </div>
                            </div>

                            {/* Slider: Presence Penalty */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Presence Penalty</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{presencePenalty.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="-2.0" max="2.0" step="0.1" value={presencePenalty}
                                    onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Bestraft Wortwiederholungen im Fließtext</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 0.0</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Slider: Vision Temperature */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Temperatur</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionTemperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="0.0" max="2.0" step="0.1" value={visionTemperature}
                                    onChange={(e) => setVisionTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold leading-relaxed">
                                    <span>{getTempDescription(visionTemperature, 'vision')}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 0.2</span>
                                </div>
                            </div>

                            {/* Slider: Vision Top P */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Top P</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionTopP.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0.0" max="1.0" step="0.05" value={visionTopP}
                                    onChange={(e) => setVisionTopP(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Vokabularbegrenzung bei der Texterkennung</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 0.80</span>
                                </div>
                            </div>

                            {/* Slider: Vision Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Max Tokens</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionMaxTokens.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range" min="1000" max="16384" step="500" value={visionMaxTokens}
                                    onChange={(e) => setVisionMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Maximale Länge des extrahierten Texts</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 4.000</span>
                                </div>
                            </div>

                            {/* Slider: Vision Presence Penalty */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Presence Penalty</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionPresencePenalty.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="-2.0" max="2.0" step="0.1" value={visionPresencePenalty}
                                    onChange={(e) => setVisionPresencePenalty(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Steuert Wortwiederholungs-Bestrafung bei OCR</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 0.0</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
