import React from 'react';
import type { GradingGraph } from '../../lib/grading/types';
import type { TargetGoal } from '../../lib/grading/calc-trace-types';
import { useQueryClient } from '@tanstack/react-query';
import SettingsModal from '../SettingsModal';
import PromptSettingsModal from '../PromptSettingsModal';
import SkillsSettingsModal from '../SkillsSettingsModal';
import CreditsModal from '../CreditsModal';
import { useDashboardStore } from '../../hooks/store/useDashboardStore';

import PDFSplitModal from '../PDFSplitModal';
import RedactionModal from '../RedactionModal';
import PDFTypeModal from '../PDFTypeModal';
import OnboardingModal from '../OnboardingModal';
import QuickStartModal from '../QuickStartModal';
import AVVUploadModal from '../AVVUploadModal';
import PureKeyModal from '../PureKeyModal';
import ModelTypeModal from '../ModelTypeModal';
import AiSetupModal from '../AiSetupModal';
import { AiParamsModal } from '../AiParamsModal';
import { AppSettings, Task, BatchFile, User, PromptProfile } from '../../types';
import { isLocalInstance } from '../../lib/env-context';
import { useRedactionBroadcast, isBroadcastTarget } from '../../hooks/useRedactionBroadcast';

/**
 * Der Nutzer, wie ihn der Abfrage-Zwischenspeicher haelt.
 *
 * Die Antwort von /api/user umschliesst den Datensatz — die optimistischen
 * Aktualisierungen unten muessen diese Huelle mitschreiben, nicht ersetzen.
 */
interface NutzerCache {
    user?: User;
    [key: string]: unknown;
}

interface DashboardModalsProps {
    userData: User | null;
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    
    // Visibility States
    showSettings: boolean;
    setShowSettings: (v: boolean) => void;
    showPromptSettings: boolean;
    setShowPromptSettings: (v: boolean) => void;
    showSkillsSettings: boolean;
    setShowSkillsSettings: (v: boolean) => void;
    showCredits: boolean;
    setShowCredits: (v: boolean) => void;
    showHelp: boolean;
    setShowHelp: (v: boolean) => void;
    showOnboarding: boolean;
    setShowOnboarding: (v: boolean) => void;
    showAVVUpload: boolean;
    setShowAVVUpload: (v: boolean) => void;
    showPureKeyModal: boolean;
    setShowPureKeyModal: (v: boolean) => void;
    showQuickStart: boolean;
    setShowQuickStart: (v: boolean) => void;
    showModelTypeModal: boolean;
    setShowModelTypeModal: (v: boolean) => void;
    showAiSetup: boolean;
    setShowAiSetup: (v: boolean) => void;
    showAiParamsSettings: boolean;
    setShowAiParamsSettings: (v: boolean) => void;
    
    // Action Handlers
    saveSettings: (s: AppSettings) => void;
    handleModeSelect: (m: 'STANDARD' | 'PURE' | 'TRIAL') => void;
    sessionProfileName: string;
    setSessionProfileName: (n: string) => void;
    sessionSkillsProfileName: string;
    setSessionSkillsProfileName: (n: string) => void;
    sessionAiProfileName: string;
    setSessionAiProfileName: (n: string) => void;
    profiles: PromptProfile[];
    
    // File/Task State
    pureApiKey: string | null;
    setPureApiKey: (k: string | null) => void;
    pendingModelFile: File | null;
    setPendingModelFile: (f: File | null) => void;
    handleModelUpload: (f: File, isScan: boolean) => void;
    
    // Split/Redact
    splitIdx: number | null;
    setSplitIdx: (i: number | null) => void;
    executeSplit: (students: { firstName?: string; lastName?: string; name?: string; pageCount: number }[]) => void;
    redactIdx: number | null;
    setRedactIdx: (i: number | null) => void;
    batchFiles: BatchFile[];
    setBatchFiles: React.Dispatch<React.SetStateAction<BatchFile[]>>;
    
    // AI/Queue State
    pdfTypeQueue: { idx: number, fileName: string }[];
    handlePDFTypeSelect: (type: 'typed' | 'scanned', applyToAll: boolean) => Promise<void>;
    handleAiOllamaSave: (url: string, model: string) => void;
    handleAiMistralSave: (key: string) => void;
    handleAiCustomSave: (url: string, key: string, model: string, thinking: boolean) => void;
    onGenerateGraph?: (taskText: string, discipline?: string) => Promise<GradingGraph | null>;
    onGenerateCalcTrace?: (taskText: string, userNotes?: string) => Promise<TargetGoal | null>;
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
    userData, settings, setSettings,
    showSettings, setShowSettings,
    showPromptSettings, setShowPromptSettings,
    showSkillsSettings, setShowSkillsSettings,
    showCredits, setShowCredits,
    showHelp, setShowHelp,
    showOnboarding, setShowOnboarding,
    showAVVUpload, setShowAVVUpload,
    showPureKeyModal, setShowPureKeyModal,
    showQuickStart, setShowQuickStart,
    showModelTypeModal, setShowModelTypeModal,
    saveSettings, handleModeSelect,
    sessionProfileName, setSessionProfileName,
    sessionSkillsProfileName, setSessionSkillsProfileName,
    sessionAiProfileName, setSessionAiProfileName,
    profiles,
    pureApiKey, setPureApiKey,
    pendingModelFile, setPendingModelFile, handleModelUpload,
    splitIdx, setSplitIdx, executeSplit,
    redactIdx, setRedactIdx, batchFiles, setBatchFiles,
    pdfTypeQueue, handlePDFTypeSelect,
    showAiSetup, setShowAiSetup,
    showAiParamsSettings, setShowAiParamsSettings,
    handleAiOllamaSave, handleAiMistralSave, handleAiCustomSave,
    onGenerateGraph, onGenerateCalcTrace
}) => {
    const queryClient = useQueryClient();
    const { tasksLayout, setTasksLayout } = useDashboardStore();
    const { applyRedaction } = useRedactionBroadcast(batchFiles, setBatchFiles);

    // Weitere Scans, auf die eine Schwärzung übertragen werden kann (ohne den
    // gerade geöffneten).
    const otherScanCount = redactIdx === null
        ? 0
        : batchFiles.filter((f, i) => i !== redactIdx && isBroadcastTarget(f)).length;

    // Bereits erkannte Arbeiten, deren Text eine nachträgliche Schwärzung
    // verwirft — das Modal warnt damit vor dem Klick statt danach.
    const otherRecognizedCount = redactIdx === null
        ? 0
        : batchFiles.filter((f, i) => i !== redactIdx && isBroadcastTarget(f) && f.ocrDone).length;

    return (
        <>
            {showSettings && (
                <SettingsModal
                    settings={settings}
                    onSave={saveSettings}
                    onClose={() => setShowSettings(false)}
                    userRole={userData?.role}
                    isAdminView={false}
                    appMode={userData?.appMode || 'STANDARD'}
                    avvAccepted={userData?.avvAccepted || false}
                    onModeChange={handleModeSelect}
                    username={userData?.username}
                />
            )}

            {showPromptSettings && (
                <PromptSettingsModal
                    settings={settings}
                    currentProfileRef={settings.activePromptProfileId || sessionProfileName}
                    availableProfiles={profiles}
                    onSave={async (newSettings, profileName, profileId) => {
                        setSettings(newSettings);
                        if (profileName) setSessionProfileName(profileName);
                        setShowPromptSettings(false);
                        
                        const targetProfileId = profileId && profileId !== 'system-standard' ? profileId : null;
                        
                        if (targetProfileId) {
                            localStorage.setItem('koreki_active_prompt_profile_id', targetProfileId);
                        } else {
                            localStorage.removeItem('koreki_active_prompt_profile_id');
                        }
                        
                        // Optimistically update query data cache
                        queryClient.setQueryData(['user'], (prev: NutzerCache | undefined) => {
                            if (!prev || !prev.user) return prev;
                            return {
                                ...prev,
                                user: {
                                    ...prev.user,
                                    activePromptProfileId: targetProfileId
                                }
                            };
                        });
 
                        // Hybrid Sync (Arch §2): SaaS → DB
                        if (!isLocalInstance()) {
                            await fetch('/api/user/update-profile', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ profileId: targetProfileId })
                            }).catch(err => console.error('Prompt profile reset failed', err));
                        }
                    }}
                    onClose={() => setShowPromptSettings(false)}
                />
            )}

            {showSkillsSettings && (
                <SkillsSettingsModal
                    settings={settings}
                    // Kennung bevorzugt; der Name greift nur, solange in den
                    // Einstellungen noch eine Altreferenz steht.
                    currentProfileRef={settings.activeSkillProfileId || sessionSkillsProfileName}
                    onGenerateGraph={onGenerateGraph}
                    onGenerateCalcTrace={onGenerateCalcTrace}
                    onSave={async (newSettings, profileName, profileId) => {
                        setSettings(newSettings);
                        if (profileName) setSessionSkillsProfileName(profileName);
                        setShowSkillsSettings(false);

                        // SYNC BRIDGE: Update tasksLayout inline graphs/traces with updated custom skill configurations
                        const customSkills = newSettings.customSkills; // const: Verengung gilt sonst nicht im Callback
                        if (tasksLayout && customSkills) {
                            const updatedTasks = tasksLayout.map(t => {
                                if (t.taskType && t.taskType.startsWith('custom-skill-') && customSkills[t.taskType]) {
                                    const customSkill = customSkills[t.taskType];
                                    return {
                                        ...t,
                                        gradingGraph: customSkill.isCalcTrace ? undefined : customSkill.gradingGraph,
                                        calcTrace: customSkill.isCalcTrace ? customSkill.calcTrace : undefined
                                    };
                                }
                                return t;
                            });
                            setTasksLayout(updatedTasks);
                        }
                        
                        const targetProfileId = profileId && profileId !== 'system-standard' ? profileId : null;
                        
                        if (targetProfileId) {
                            localStorage.setItem('koreki_active_skill_profile_id', targetProfileId);
                        } else {
                            localStorage.removeItem('koreki_active_skill_profile_id');
                        }
                        
                        // Optimistically update query data cache
                        queryClient.setQueryData(['user'], (prev: NutzerCache | undefined) => {
                            if (!prev || !prev.user) return prev;
                            return {
                                ...prev,
                                user: {
                                    ...prev.user,
                                    activeSkillProfileId: targetProfileId
                                }
                            };
                        });

                        // Hybrid Sync (Arch §2): SaaS → DB
                        if (!isLocalInstance()) {
                            await fetch('/api/user/update-skill-profile', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ profileId: targetProfileId })
                            }).catch(err => console.error('Skill profile reset failed', err));
                        }
                    }}
                    onClose={() => setShowSkillsSettings(false)}
                />
            )}

            {showPureKeyModal && (
                <PureKeyModal
                    onSave={(key) => {
                        setPureApiKey(key);
                        setShowPureKeyModal(false);
                    }}
                    onClose={() => setShowPureKeyModal(false)}
                />
            )}

            {showAiSetup && (
                <AiSetupModal
                    onSaveOllama={(url, model) => {
                        handleAiOllamaSave(url, model);
                        setShowAiSetup(false);
                    }}
                    onSaveMistral={(key) => {
                        handleAiMistralSave(key);
                        setShowAiSetup(false);
                    }}
                    onSaveCustom={(url, key, model, thinking) => {
                        handleAiCustomSave(url, key, model, thinking);
                        setShowAiSetup(false);
                    }}
                    onClose={() => setShowAiSetup(false)}
                    initialSettings={settings}
                />
            )}

            {showModelTypeModal && (
                <ModelTypeModal
                    isOpen={showModelTypeModal}
                    fileName={pendingModelFile?.name || ''}
                    isPureMode={userData?.appMode === 'PURE'}
                    onClose={() => setShowModelTypeModal(false)}
                    onSelect={(type) => {
                        if (pendingModelFile) handleModelUpload(pendingModelFile, type === 'scanned');
                        setShowModelTypeModal(false);
                        setPendingModelFile(null);
                    }}
                />
            )}

            {showCredits && (
                <CreditsModal 
                    onClose={() => setShowCredits(false)} 
                    onSelect={() => setShowCredits(false)} 
                    upgrading={false}
                    appMode={userData?.appMode || 'STANDARD'}
                />
            )}

            {showHelp && (
                <QuickStartModal onClose={() => setShowHelp(false)} />
            )}

            {splitIdx !== null && (
                <PDFSplitModal
                    fileName={batchFiles[splitIdx].name}
                    totalPageCount={batchFiles[splitIdx].pageCount || 1}
                    onClose={() => setSplitIdx(null)}
                    onSplit={(students) => executeSplit(students)}
                />
            )}

            {redactIdx !== null && (
                <RedactionModal
                    isOpen={redactIdx !== null}
                    file={batchFiles[redactIdx].files?.[0] || null}
                    fileName={batchFiles[redactIdx].name}
                    pageRange={batchFiles[redactIdx].pageRange}
                    initialRects={batchFiles[redactIdx].redactionRects}
                    otherScanCount={otherScanCount}
                    hasRecognizedText={!!batchFiles[redactIdx].ocrDone}
                    otherRecognizedCount={otherRecognizedCount}
                    onClose={() => setRedactIdx(null)}
                    onSave={(redactedDataUrls, rects, applyToAllScans) => {
                        const sourceIdx = redactIdx!;
                        setRedactIdx(null);
                        void applyRedaction(sourceIdx, redactedDataUrls, rects, applyToAllScans);
                    }}
                />
            )}

            {pdfTypeQueue.length > 0 && (
                <PDFTypeModal
                    isOpen={pdfTypeQueue.length > 0}
                    onClose={() => handlePDFTypeSelect('typed', false)} 
                    fileName={pdfTypeQueue[0].fileName}
                    onSelect={(type, applyToAll) => handlePDFTypeSelect(type, applyToAll)}
                    isPureMode={userData?.appMode === 'PURE'}
                />
            )}

            {showOnboarding && (
                <OnboardingModal 
                    onSelectMode={(mode) => {
                        handleModeSelect(mode);
                        setShowOnboarding(false);
                        setShowQuickStart(true);
                    }} 
                />
            )}

            {showQuickStart && (
                <QuickStartModal onClose={() => setShowQuickStart(false)} />
            )}

            {showAVVUpload && (
                <AVVUploadModal 
                    onComplete={() => {
                        setShowAVVUpload(false);
                        window.location.reload();
                    }}
                    onCancel={() => setShowAVVUpload(false)}
                    isOrganization={userData?.activeWorkspaceType === 'ORGANIZATION'}
                    workspaceId={userData?.activeWorkspaceId}
                    organizationName={userData?.activeWorkspaceName}
                />
            )}

            {showAiParamsSettings && (
                <AiParamsModal
                    isOpen={showAiParamsSettings}
                    onClose={() => setShowAiParamsSettings(false)}
                    settings={settings}
                    sessionAiProfileName={sessionAiProfileName}
                    setSessionAiProfileName={setSessionAiProfileName}
                    onSave={(newSettings, profileName) => {
                        setSettings(newSettings);
                        saveSettings(newSettings);
                        if (profileName) setSessionAiProfileName(profileName);
                        
                        const targetAiProfileId = newSettings.activeAiProfileId && newSettings.activeAiProfileId !== 'system-standard' ? newSettings.activeAiProfileId : null;

                        if (targetAiProfileId) {
                            localStorage.setItem('koreki_active_ai_profile_id', targetAiProfileId);
                        } else {
                            localStorage.removeItem('koreki_active_ai_profile_id');
                        }

                        // Optimistically update query data cache
                        queryClient.setQueryData(['user'], (prev: NutzerCache | undefined) => {
                            if (!prev || !prev.user) return prev;
                            return {
                                ...prev,
                                user: {
                                    ...prev.user,
                                    activeAiProfileId: targetAiProfileId
                                }
                            };
                        });

                        // Hybrid Sync (Arch §2): SaaS → DB persist for AI profile selection
                        if (!isLocalInstance()) {
                            fetch('/api/user/update-ai-profile', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ profileId: targetAiProfileId })
                            }).catch(err => console.error('AI Profile persist failed', err));
                        }
                    }}
                />
            )}
        </>
    );
};
