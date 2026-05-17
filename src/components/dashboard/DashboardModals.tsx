import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import SettingsModal from '../SettingsModal';
import PromptSettingsModal from '../PromptSettingsModal';
import SkillsSettingsModal from '../SkillsSettingsModal';
import CreditsModal from '../CreditsModal';

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
import { AppSettings, Task, BatchFile } from '../../types';
import { isLocalInstance } from '../../lib/env-context';

interface DashboardModalsProps {
    userData: any;
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
    handleModeSelect: (m: any) => void;
    sessionProfileName: string;
    setSessionProfileName: (n: string) => void;
    sessionSkillsProfileName: string;
    setSessionSkillsProfileName: (n: string) => void;
    sessionAiProfileName: string;
    setSessionAiProfileName: (n: string) => void;
    profiles: any[];
    
    // File/Task State
    pureApiKey: string | null;
    setPureApiKey: (k: string | null) => void;
    pendingModelFile: File | null;
    setPendingModelFile: (f: File | null) => void;
    handleModelUpload: (f: File, isScan: boolean) => void;
    
    // Split/Redact
    splitIdx: number | null;
    setSplitIdx: (i: number | null) => void;
    executeSplit: (students: any[], autoRedact?: boolean) => void; // Finalized for Industrial Grade Stage 3
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
    handleAiOllamaSave, handleAiMistralSave, handleAiCustomSave
}) => {
    const queryClient = useQueryClient();

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
                    currentProfileName={sessionProfileName}
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
                        queryClient.setQueryData(['user'], (prev: any) => {
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
                    currentProfileName={sessionSkillsProfileName}
                    onSave={async (newSettings, profileName, profileId) => {
                        setSettings(newSettings);
                        if (profileName) setSessionSkillsProfileName(profileName);
                        setShowSkillsSettings(false);
                        
                        const targetProfileId = profileId && profileId !== 'system-standard' ? profileId : null;
                        
                        if (targetProfileId) {
                            localStorage.setItem('koreki_active_skill_profile_id', targetProfileId);
                        } else {
                            localStorage.removeItem('koreki_active_skill_profile_id');
                        }
                        
                        // Optimistically update query data cache
                        queryClient.setQueryData(['user'], (prev: any) => {
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
                    onSplit={(students, autoRedact) => executeSplit(students, autoRedact)}
                />
            )}

            {redactIdx !== null && (
                <RedactionModal
                    isOpen={redactIdx !== null}
                    file={batchFiles[redactIdx].files?.[0] || null}
                    fileName={batchFiles[redactIdx].name}
                    pageRange={batchFiles[redactIdx].pageRange}
                    initialRects={batchFiles[redactIdx].redactionRects}
                    onClose={() => setRedactIdx(null)}
                    onSave={(redactedDataUrls, rects) => {
                        setBatchFiles(prev => {
                            const next = [...prev];
                            next[redactIdx!] = { 
                                ...next[redactIdx!], 
                                redactedDataUrls, 
                                redactionRects: rects,
                                isRedacted: true,
                                fileText: "",
                                ocrDone: false,
                                documentType: 'scanned'
                            };
                            return next;
                        });
                        setRedactIdx(null);
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
                    workspaceId={userData.activeWorkspaceId}
                    organizationName={userData.activeWorkspaceName}
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
                        queryClient.setQueryData(['user'], (prev: any) => {
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
