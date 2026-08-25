import React from 'react';
import { SlidersHorizontal, PlusCircle, Pencil, Trash2, Check, RefreshCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { useFileDropZone } from '@/hooks/useFileDropZone';
import { meldeHinweis } from '@/lib/notify';

/**
 * Seitenleiste der KI-Profile — Auswahl, Umbenennen, Import, Export.
 *
 * Lag zuvor am Anfang von AiProfileModules.tsx, also in derselben Datei wie der
 * Editor. Das Gegenstueck fuer Skill-Profile steht in SkillsSidebar.tsx; beide
 * sind aus derselben Vorlage entstanden und inzwischen auseinandergelaufen.
 */
interface SidebarProps {
    profiles: any[];
    /** Kennung des gewaehlten KI-Profils — die Markierung haengt daran, nicht am Namen. */
    selectedProfileId: string;
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
    selectedProfileId,
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

    /** Liest eine Profildatei ein — ein Weg fuer Dateiauswahl und Ablegen. */
    const importProfileFile = async (file: File) => {
        try {
            onImportProfile(JSON.parse(await file.text()));
        } catch (err) {
            meldeHinweis('Ungültiges KI-Profil-Format (JSON erwartet).');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await importProfileFile(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const { isDragging, dragProps } = useFileDropZone(importProfileFile);

    return (
        <div 
            className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-200 ${isDragging ? 'bg-primary/5 ring-2 ring-inset ring-primary' : ''}`}
            {...dragProps}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-sm border-2 border-dashed border-primary rounded-2xl m-2 pointer-events-none">
                    <div className="flex flex-col items-center text-primary font-bold gap-2">
                        <RefreshCcw size={32} className="animate-spin-slow" />
                        <p>KI-Profil hier loslassen!</p>
                    </div>
                </div>
            )}
            <div className="p-4 border-b border-border space-y-2">
                <Button onClick={onStartNew} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl shadow-md gap-2">
                    <PlusCircle size={18} /> Neues Profil
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-10 border-dashed border-primary/20 text-primary font-bold rounded-xl hover:bg-primary/5 gap-2">
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
                        <label className="text-xxs uppercase font-bold text-muted-foreground tracking-widest px-2">Eigene Profile</label>
                        {profiles.filter(p => !p.isSystem).map(p => (
                            <div
                                key={p.id}
                                onClick={() => onSelectProfile(p)}
                                className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer relative ${selectedProfileId === p.id ? 'bg-background border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-background/50'}`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <SlidersHorizontal size={18} className={selectedProfileId === p.id ? 'text-primary' : 'text-muted-foreground'} />
                                    {editingProfileId === p.id ? (
                                        <Input 
                                            autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)}
                                            className="h-8 text-xs font-bold border-primary/20" onClick={(e) => e.stopPropagation()}
                                            onBlur={onConfirmRename} onKeyDown={(e) => e.key === 'Enter' && onConfirmRename()}
                                        />
                                    ) : (
                                        <span className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfileId === p.id ? 'text-primary' : 'text-foreground'} group-hover:pr-[80px]`}>{p.name}</span>
                                    )}
                                </div>
                                
                                <FloatingActions className="-top-2 -right-2">
                                    {editingProfileId === p.id ? (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); onConfirmRename(); }}>
                                            <Check size={14} />
                                        </Button>
                                    ) : (
                                        <>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                title="Profil kopieren"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
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
                                                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" 
                                                onClick={(e) => onExportProfile(p, e)} 
                                                title="Profil exportieren (.json)"
                                            >
                                                <Download size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => onStartRename(e, p)} title="Umbenennen">
                                                <Pencil size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" onClick={(e) => onDeleteProfile(p.id, e)} title="Löschen">
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
                    <label className="text-xxs uppercase font-bold text-muted-foreground tracking-widest px-2">System-Vorlagen</label>
                    {profiles.filter(p => p.isSystem).map(p => (
                        <div
                            key={p.name}
                            onClick={() => onSelectProfile(p)}
                            className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer relative ${selectedProfileId === p.id ? 'bg-background border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-background/50'}`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <SlidersHorizontal size={18} className={selectedProfileId === p.id ? 'text-primary' : 'text-muted-foreground'} />
                                <span className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfileId === p.id ? 'text-primary' : 'text-foreground'} group-hover:pr-[40px]`}>{p.name}</span>
                            </div>
                            <FloatingActions className="-top-2 -right-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Als Vorlage verwenden (Kopieren)"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
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
