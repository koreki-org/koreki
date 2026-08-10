import React from 'react';
import { X, RefreshCcw } from 'lucide-react';
import { AppSettings } from '../types';
import { downloadFile } from '@/lib/file-utils';
import { Button } from './ui/Button';

// Sub-Components
import { SkillsSidebar, SkillsEditor } from './settings/SkillsModules';

// Hooks
import { useSkillProfiles } from '../hooks/useSkillProfiles';
import { DEFAULT_SKILL_PROFILE_ID } from '@/lib/ai/standard-skills-profiles';

interface SkillsSettingsModalProps {
    settings: AppSettings;
    onSave: (newSettings: AppSettings, profileName?: string, profileId?: string) => void;
    onClose: () => void;
    /** Verweis auf das aktive Set beim Oeffnen — Kennung oder (Altbestand) Name. */
    currentProfileRef?: string;
    onGenerateGraph?: (taskText: string, discipline?: string) => Promise<any | null>;
    onGenerateCalcTrace?: (taskText: string, userNotes?: string) => Promise<any | null>;
}

const SkillsSettingsModal: React.FC<SkillsSettingsModalProps> = ({
    settings,
    onSave,
    onClose,
    currentProfileRef = DEFAULT_SKILL_PROFILE_ID,
    onGenerateGraph,
    onGenerateCalcTrace
}) => {
    // --- STANDALONE FOURTH PILLAR SYMMETRICS ---
    const {
        profiles,
        selectedProfileId,
        selectedProfile,
        isCreatingNew,
        newProfileName,
        setNewProfileName,
        activeSkillIds,
        setActiveSkillIds,
        customSkills,
        handleSaveCustomSkill,
        handleDeleteCustomSkill,
        saving,
        showEditorMobile,
        setShowEditorMobile,
        editingProfileId,
        setEditingProfileId,
        editingName,
        setEditingName,
        isDirty,
        isSystemSelected,
        handleSelectProfile,
        handleStartNew,
        handleImportParsedProfile,
        handleSaveToDB,
        handleApplyToSession,
        handleDeleteProfile,
        handleConfirmRename
    } = useSkillProfiles(settings, onSave, onClose, currentProfileRef);

  // Export a whole skill profile (including its active skill IDs) as a markdown file
  const handleExportProfile = async (profile: any) => {
    const safeName = profile.name || 'skillset';
    const skillsArray = JSON.stringify(profile.activeSkillIds || []);
    const markdown = `---\nname: "${safeName}"\ndescription: "Exportiertes Koreki Skill-Profil"\nversion: "1.0.0"\nskills: ${skillsArray}\n---\n`;
    const filename = `${safeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_profile.md`;
    try {
      await downloadFile(markdown, filename, 'text/markdown;charset=utf-8');
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed.');
    }
  };

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
                            <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight truncate">Skills Center</h2>
                            <p className="text-xxs sm:text-sm text-muted-foreground font-medium italic truncate">Modulare KI-Bewertungs-Skills</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted shrink-0" onClick={onClose}>
                        <X size={24} />
                    </Button>
                </div>

                {/* Main Content: Two Columns */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className={`${showEditorMobile ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border bg-muted/50 flex-col overflow-hidden`}>
                        <SkillsSidebar
                            profiles={profiles}
                            selectedProfileId={selectedProfileId}
                            isCreatingNew={isCreatingNew}
                            editingProfileId={editingProfileId}
                            editingName={editingName}
                            onStartNew={() => handleStartNew([])}
                            onImportParsedProfile={handleImportParsedProfile}
                            onSelectProfile={handleSelectProfile}
                            onStartRename={(e, p) => { e.stopPropagation(); setEditingProfileId(p.id); setEditingName(p.name); }}
                            onDeleteProfile={handleDeleteProfile}
                            onConfirmRename={handleConfirmRename}
                            setEditingName={setEditingName}
                            setEditingProfileId={setEditingProfileId}
                            onExportProfile={handleExportProfile}
                        />
                    </div>

                    <div className={`${showEditorMobile ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col bg-white overflow-hidden`}>
                        <SkillsEditor 
                            isCreatingNew={isCreatingNew}
                            selectedProfile={selectedProfile}
                            isSystemSelected={isSystemSelected}
                            isDirty={isDirty}
                            saving={saving}
                            newProfileName={newProfileName}
                            activeSkillIds={activeSkillIds}
                            setActiveSkillIds={setActiveSkillIds}
                            onSaveToDB={handleSaveToDB}
                            setNewProfileName={setNewProfileName}
                            customSkills={customSkills}
                            onSaveCustomSkill={handleSaveCustomSkill}
                            onDeleteCustomSkill={handleDeleteCustomSkill}
                            onStartNew={handleStartNew}
                            onImportParsedProfile={handleImportParsedProfile}
                            onGenerateGraph={onGenerateGraph}
                            onGenerateCalcTrace={onGenerateCalcTrace}
                        />

                        {/* Footer Action Bar */}
                        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-white border-t border-border flex justify-end items-center shrink-0">
                            <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                                <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none px-4 sm:px-6 h-10 sm:h-12 font-bold text-muted-foreground hover:text-foreground">
                                    Abbrechen
                                </Button>
                                <Button
                                    onClick={isCreatingNew ? handleSaveToDB : handleApplyToSession}
                                    className="flex-[2] sm:flex-none px-6 sm:px-10 h-10 sm:h-14 bg-primary hover:bg-primary/90 text-white font-black rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20 transition-all"
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

export default SkillsSettingsModal;
