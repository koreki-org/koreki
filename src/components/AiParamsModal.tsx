import React, { useState } from 'react';
import { X, RefreshCcw } from 'lucide-react';
import { AppSettings } from '../types';
import { Button } from './ui/Button';
import { downloadFile } from '@/lib/file-utils';

// Sub-Components
import { AiProfileSidebar, AiProfileEditor } from './settings/AiProfileModules';

// Hooks
import { useAiProfiles } from '../hooks/useAiProfiles';

interface AiParamsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (newSettings: AppSettings, profileName?: string, profileId?: string) => void;
    sessionAiProfileName: string;
    setSessionAiProfileName: (n: string) => void;
}

export const AiParamsModal: React.FC<AiParamsModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSave,
    sessionAiProfileName,
    setSessionAiProfileName
}) => {
    const [activeTab, setActiveTab] = useState<'correction' | 'vision'>('correction');

    // --- STATE & CRUD VIA OUR RE-ENGINEERED HOOK ---
    const {
        profiles,
        selectedProfile,
        isCreatingNew,
        setIsCreatingNew,
        newProfileName,
        setNewProfileName,
        saving,
        showEditorMobile,
        setShowEditorMobile,
        editingProfileId,
        setEditingProfileId,
        editingName,
        setEditingName,
        isDirty,
        isSystemSelected,
        
        temperature, setTemperature,
        topP, setTopP,
        maxTokens, setMaxTokens,
        presencePenalty, setPresencePenalty,
        enableThinking, setEnableThinking,
        
        visionTemperature, setVisionTemperature,
        visionTopP, setVisionTopP,
        visionMaxTokens, setVisionMaxTokens,
        visionPresencePenalty, setVisionPresencePenalty,
        
        ollamaNumCtx, setOllamaNumCtx,

        handleSelectProfile,
        handleStartNew,
        handleSaveProfile,
        handleDeleteProfile,
        handleConfirmRename,
        handleApplyToSession
    } = useAiProfiles(settings, onSave, onClose, settings.activeAiProfileId || 'system-standard');

    const handleExportProfile = async (p: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const jsonContent = JSON.stringify(p, null, 2);
        const filename = `ai-profile-${p.name.toLowerCase().replace(/\s+/g, '-')}.json`;
        try {
            await downloadFile(jsonContent, filename, 'application/json;charset=utf-8');
        } catch (error) {
            console.error('Fehler beim Exportieren des KI-Profils:', error);
            alert('Export fehlgeschlagen.');
        }
    };

    const handleImportProfile = (p: any) => {
        setIsCreatingNew(true);
        setNewProfileName(p.name ? `Import: ${p.name}` : `Import ${new Date().toLocaleDateString()}`);
        
        // Load parameters from import
        if (p.temperature !== undefined) setTemperature(p.temperature);
        if (p.topP !== undefined) setTopP(p.topP);
        if (p.maxTokens !== undefined) setMaxTokens(p.maxTokens);
        if (p.presencePenalty !== undefined) setPresencePenalty(p.presencePenalty);
        if (p.enableThinking !== undefined) setEnableThinking(p.enableThinking);
        
        if (p.visionTemperature !== undefined) setVisionTemperature(p.visionTemperature);
        if (p.visionTopP !== undefined) setVisionTopP(p.visionTopP);
        if (p.visionMaxTokens !== undefined) setVisionMaxTokens(p.visionMaxTokens);
        if (p.visionPresencePenalty !== undefined) setVisionPresencePenalty(p.visionPresencePenalty);
        
        setShowEditorMobile(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 sm:p-4 bg-foreground/60 backdrop-blur-md animate-fade-in">
            <div className="relative w-full md:max-w-[1000px] h-full md:h-[85vh] bg-white rounded-none md:rounded-hero shadow-2xl border-none md:border md:border-white flex flex-col overflow-hidden animate-fade-in text-foreground">
                
                {/* Header Section */}
                <div className="px-4 sm:px-8 py-4 sm:pt-8 sm:pb-4 flex justify-between items-center border-b border-border bg-white/50 backdrop-blur shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        {(showEditorMobile) && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="md:hidden rounded-full shrink-0" 
                                onClick={() => setShowEditorMobile(false)}
                            >
                                <RefreshCcw size={20} className="rotate-180" />
                            </Button>
                        )}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-border overflow-hidden shrink-0">
                            <img src="/logo.png" alt="Koreki Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight truncate">Inferenz Parameter-Center</h2>
                            <p className="text-xxs sm:text-sm text-muted-foreground font-medium italic truncate">Modelliere das Antwortverhalten der KI im Detail</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted shrink-0" onClick={onClose}>
                        <X size={24} />
                    </Button>
                </div>

                {/* Main Content: Two Columns */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className={`${showEditorMobile ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border bg-muted/50 flex-col overflow-hidden`}>
                        <AiProfileSidebar 
                            profiles={profiles}
                            selectedProfile={selectedProfile}
                            isCreatingNew={isCreatingNew}
                            editingProfileId={editingProfileId}
                            editingName={editingName}
                            onStartNew={handleStartNew}
                            onSelectProfile={handleSelectProfile}
                            onStartRename={(e, p) => {
                                e.stopPropagation();
                                setEditingProfileId(p.id);
                                setEditingName(p.name);
                            }}
                            onDeleteProfile={handleDeleteProfile}
                            onExportProfile={handleExportProfile}
                            onImportProfile={handleImportProfile}
                            onConfirmRename={handleConfirmRename}
                            setEditingName={setEditingName}
                            setEditingProfileId={setEditingProfileId}
                        />
                    </div>

                    <div className={`${showEditorMobile ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col bg-white overflow-hidden`}>
                        <AiProfileEditor 
                            isCreatingNew={isCreatingNew}
                            selectedProfile={selectedProfile}
                            isSystemSelected={isSystemSelected}
                            isDirty={isDirty}
                            saving={saving}
                            newProfileName={newProfileName}
                            setNewProfileName={setNewProfileName}
                            onSaveToDB={handleSaveProfile}
                            onStartNew={handleStartNew}
                            
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            
                            enableThinking={enableThinking}
                            setEnableThinking={setEnableThinking}
                            temperature={temperature}
                            setTemperature={setTemperature}
                            topP={topP}
                            setTopP={setTopP}
                            maxTokens={maxTokens}
                            setMaxTokens={setMaxTokens}
                            presencePenalty={presencePenalty}
                            setPresencePenalty={setPresencePenalty}

                            visionTemperature={visionTemperature}
                            setVisionTemperature={setVisionTemperature}
                            visionTopP={visionTopP}
                            setVisionTopP={setVisionTopP}
                            visionMaxTokens={visionMaxTokens}
                            setVisionMaxTokens={setVisionMaxTokens}
                            visionPresencePenalty={visionPresencePenalty}
                            setVisionPresencePenalty={setVisionPresencePenalty}
                            
                            provider={settings.provider}
                            ollamaNumCtx={ollamaNumCtx}
                            setOllamaNumCtx={setOllamaNumCtx}
                        />

                        {/* Footer Action Bar */}
                        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-white border-t border-border flex justify-end items-center shrink-0">
                            <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                                <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none px-4 sm:px-6 h-10 sm:h-12 font-bold text-muted-foreground hover:text-foreground">
                                    Abbrechen
                                </Button>
                                <Button
                                    onClick={isCreatingNew ? handleSaveProfile : handleApplyToSession}
                                    className="flex-[2] sm:flex-none px-6 sm:px-10 h-10 sm:h-14 bg-primary text-white font-black rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20"
                                    disabled={saving || (isCreatingNew && !newProfileName.trim())}
                                >
                                    {saving ? 'Speichert...' : (isCreatingNew ? 'Erstellen' : 'Zuweisen')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
