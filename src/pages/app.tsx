import React, { useEffect } from 'react';
import Head from 'next/head';

import Header from '@/components/layout/AppHeader';
import AppLayout from '@/layouts/AppLayout';
import UploadGrid from '@/components/UploadGrid';
import BatchProcessor from '@/components/BatchProcessor';
import { DashboardModals } from '@/components/dashboard/DashboardModals';
import { DemoHintBanner } from '@/components/dashboard/DemoHintBanner';
import { GradingMemoryModal } from '@/components/batch/GradingMemoryModal';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { usePromptGovernance } from '@/hooks/usePromptGovernance';
import { useSkillGovernance } from '@/hooks/useSkillGovernance';
import { useAiGovernance } from '@/hooks/useAiGovernance';
import { useGradingMemories } from '@/hooks/useGradingMemories';
import { useDashboardActions } from '@/hooks/useDashboardActions';
import { useDashboardOrchestrator } from '@/hooks/useDashboardOrchestrator';
import { useDemoScenario } from '@/hooks/useDemoScenario';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { buildModelSolutionFromTasks } from '@/lib/task-utils';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';

// Libs
import { exportTeacherList, exportStudentSummaries, exportIndividualFeedbacks } from '@/lib/excel';
import { exportIndividualPDFs } from '@/lib/pdf';
import { exportSessionToJson } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { isDesktopTarget } from '@/lib/env-context';
import AuthGuard from '@/components/guards/AuthGuard';

export default function Home() {
    // Core Auth & Logic Hooks
    const { userData, setUserData, aiStatus, globalAiSettings, authLoading, checkAuth, fetchAiStatus } = useAuth();
    const [showGradingMemory, setShowGradingMemory] = React.useState(false);
    const [activeGradingMemoryName, setActiveGradingMemoryName] = React.useState<string | undefined>(undefined);
    
    // Instantiate selectMemory hook for on-import restore
    const { selectMemory } = useGradingMemories(userData);
    
    // --- STAGE 7: INDUSTRIAL DASHBOARD ORCHESTRATION ---
    // Extracting 15+ states and compliance gating into a specialized orchestrator.
    // This makes app.tsx a thin controller. 🏮🛡️🏛️
    const { modals, data, actions } = useDashboardOrchestrator(userData, authLoading, fetchAiStatus);
    
    // Core AI Settings from Store (Single Source of Truth)
    const { aiSettings, setAiSettings, hydrateAiSettings } = useDashboardStore();

    // Governance & Actions
    const { profiles, sessionProfileName, setSessionProfileName } = usePromptGovernance(userData, authLoading, aiSettings, setAiSettings);
    const { sessionSkillsProfileName, setSessionSkillsProfileName } = useSkillGovernance(userData, authLoading, aiSettings, setAiSettings);
    const { sessionAiProfileName, setSessionAiProfileName } = useAiGovernance(userData, authLoading, aiSettings, setAiSettings);

    const fileProcessor = useFileProcessor(
        userData, 
        aiSettings, 
        data.modelSolution, 
        data.tasksLayout, 
        setUserData, 
        sessionProfileName,
        data.setModelSolution,
        data.setTasksLayout,
        data.setModelSolutionContext
    );

    const { saveSettings, handleModeSelect, handleUnlockExpert } = useDashboardActions(userData, setUserData, aiSettings, setAiSettings, fetchAiStatus);

    const handleGenerateGraphForTask = async (taskIndex: number, taskText: string, userNotes?: string, disciplineOverride?: string) => {
        try {
            const discipline = disciplineOverride || data.tasksLayout[taskIndex]?.taskType;
            const response = await performAIRequest(
                'generate-graph',
                { taskText, discipline, userNotes },
                userData?.appMode === 'UNSET' ? undefined : userData?.appMode,
                aiSettings
            );
            if (response) {
                data.setTasksLayout(prevTasks => {
                    const updatedTasks = [...prevTasks];
                    if (updatedTasks[taskIndex]) {
                        let determinedType = updatedTasks[taskIndex].taskType || 'default';
                        
                        if (response.discipline === 'computer-science-storage') {
                            determinedType = 'default';
                        } else if (response.discipline === 'computer-science-networking') {
                            determinedType = 'skill-calc-vlsm';
                        }

                        updatedTasks[taskIndex] = {
                            ...updatedTasks[taskIndex],
                            taskType: determinedType,
                            gradingGraph: response
                        };
                    }
                    return updatedTasks;
                });
                return response;
            }
            return null;
        } catch (error: any) {
            console.error('Error generating graph:', error);
            const msg = error.message || error || '';
            const msgLower = String(msg).toLowerCase();
            if (msgLower.includes('422') || msgLower.includes('validation') || msgLower.includes('keinen') || msgLower.includes('bewertungs') || msgLower.includes('gültig')) {
                alert(`Fehler bei der Graph-Generierung:\n\nDie KI konnte keinen Bewertungs-Graphen erstellen.\n\nHinweis: Das PANG-System ist für strukturierte, netzwerkartige Aufgaben (z. B. Subnetting) optimiert. Für rein textuelle/konzeptionelle Fragen (wie z. B. Freitext-Erklärungen) ist kein Rechengraph erforderlich – nutze hierfür einfach die Standard-Korrektur ohne Graph.`);
            } else {
                alert(`Fehler bei der Graph-Generierung: ${msg}`);
            }
            throw error;
        }
    };

    const handleGenerateCalcTraceForTask = async (taskIndex: number, taskText: string, userNotes?: string) => {
        try {
            // Die Punktzahl der Aufgabe ist hier bekannt. Ohne sie muesste die KI sie aus dem
            // Aufgabentext raten — und eine falsch geratene Summe verbiegt alle Einzelpunkte.
            const taskMaxPoints = Number(data.tasksLayout[taskIndex]?.maxPoints ?? 0);

            const response = await performAIRequest(
                'generate-calc-trace',
                { taskText, userNotes, maxPoints: taskMaxPoints > 0 ? taskMaxPoints : undefined },
                userData?.appMode === 'UNSET' ? undefined : userData?.appMode,
                aiSettings
            );
            if (response) {
                data.setTasksLayout(prevTasks => {
                    const updatedTasks = [...prevTasks];
                    if (updatedTasks[taskIndex]) {
                        updatedTasks[taskIndex] = {
                            ...updatedTasks[taskIndex],
                            taskType: 'calc-trace',
                            targetGoal: response
                        };
                    }
                    return updatedTasks;
                });
                return response;
            }
            return null;
        } catch (error: any) {
            console.error('Error generating calc trace:', error);
            alert(`Fehler bei der Rechenketten-Generierung: ${error.message || error}`);
            throw error;
        }
    };

    const handleGenerateGraphFromText = async (taskText: string, discipline?: string, userNotes?: string) => {
        try {
            const response = await performAIRequest(
                'generate-graph',
                { taskText, discipline, userNotes },
                userData?.appMode === 'UNSET' ? undefined : userData?.appMode,
                aiSettings
            );
            return response;
        } catch (error: any) {
            console.error('Error generating custom graph:', error);
            const msg = error.message || error || '';
            const msgLower = String(msg).toLowerCase();
            if (msgLower.includes('422') || msgLower.includes('validation') || msgLower.includes('keinen') || msgLower.includes('bewertungs') || msgLower.includes('gültig')) {
                alert(`Fehler bei der Graph-Generierung:\n\nDie KI konnte keinen Bewertungs-Graphen erstellen.\n\nHinweis: Das PANG-System ist für strukturierte, netzwerkartige Aufgaben (z. B. Subnetting) optimiert. Für rein textuelle/konzeptionelle Fragen (wie z. B. Freitext-Erklärungen) ist kein Rechengraph erforderlich – nutze hierfür einfach die Standard-Korrektur ohne Graph.`);
            } else {
                alert(`Fehler bei der Graph-Generierung: ${msg}`);
            }
            return null;
        }
    };

    const handleGenerateCalcTraceFromText = async (taskText: string, userNotes?: string) => {
        try {
            const response = await performAIRequest(
                'generate-calc-trace',
                { taskText, userNotes },
                userData?.appMode === 'UNSET' ? undefined : userData?.appMode,
                aiSettings
            );
            return response;
        } catch (error: any) {
            console.error('Error generating custom calc trace:', error);
            alert(`Fehler bei der Rechenketten-Generierung: ${error.message || error}`);
            return null;
        }
    };

    // Initial State Effects
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading) {
            hydrateAiSettings(globalAiSettings); // Hydrate Desktop/Ollama settings once after mount, injecting global fallback
        }
    }, [authLoading, globalAiSettings, hydrateAiSettings]);

    // Tauri DevTools Keyboard Shortcut (F12 / Ctrl+Shift+I)
    useEffect(() => {
        if (!isDesktopTarget()) return;

        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I'))) {
                e.preventDefault();
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    await invoke('open_devtools');
                } catch (err) {
                    console.error('Failed to open devtools:', err);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const { showDemoHint, loadDemoData, dismissDemoHint } = useDemoScenario({
        setModelSolution: data.setModelSolution,
        setModelSolutionContext: data.setModelSolutionContext,
        setTasksLayout: data.setTasksLayout,
        setBatchFiles: fileProcessor.setBatchFiles
    });

    // Auto-Scroll Logic: Smooth scroll to BatchProcessor once files are added
    const prevFilesCount = React.useRef(0);
    // Auto-Collapse: Once the first student file lands, fold the upload cards
    // away to give the BatchProcessor more visual room. Reopened via the
    // per-card chevron (CollapseToggleButton) or a full "Neu starten" reset.
    const [isUploadSectionCollapsed, setIsUploadSectionCollapsed] = React.useState(false);
    // Der Demo-Banner und das Einklappen der Upload-Karten wollen beide die Aufmerksamkeit
    // direkt nach dem Laden — das kollabiert bisher im selben Moment und "erschlaegt" den
    // Banner. Waehrend der Banner sichtbar ist, wird das Einklappen zurueckgestellt und erst
    // nachgeholt, sobald er verschwindet (Auto-Timeout oder manuelles Schliessen).
    const demoCollapsePending = React.useRef(false);
    const collapseUploadAndScroll = () => {
        setIsUploadSectionCollapsed(true);
        setTimeout(() => {
            const element = document.getElementById('batch-processor-anchor');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };
    useEffect(() => {
        if (fileProcessor.batchFiles.length > 0 && prevFilesCount.current === 0) {
            if (showDemoHint) {
                demoCollapsePending.current = true;
            } else {
                collapseUploadAndScroll();
            }
        }
        prevFilesCount.current = fileProcessor.batchFiles.length;
    }, [fileProcessor.batchFiles.length]);
    useEffect(() => {
        if (!showDemoHint && demoCollapsePending.current) {
            demoCollapsePending.current = false;
            collapseUploadAndScroll();
        }
    }, [showDemoHint]);

    const handleStartNew = () => {
        if (fileProcessor.batchFiles.length > 0 || data.modelSolution) {
            if (confirm("Möchtest du wirklich alle aktuellen Daten löschen und eine neue Korrektur starten?")) {
                fileProcessor.setBatchFiles([]);
                data.setModelSolution("");
                data.setModelSolutionContext("");
                data.setTasksLayout([]);
                setIsUploadSectionCollapsed(false);
            }
        }
    };

    return (
        <AuthGuard>
            <AppLayout>
                <div className="transition-all duration-300 relative">
                <div className="max-w-[1500px] mx-auto px-4 pt-4 pb-6 md:pt-2 md:px-8 md:pb-8 relative z-10">
                    <Head>
                        <title>Koreki | Fokus auf Pädagogik</title>
                    </Head>

                    <Header
                        userData={userData!}
                        upgrading={data.upgrading}
                        onUpgrade={() => modals.setShowCredits(true)}
                        onLogout={actions.handleLogout}
                        onShowSettings={() => modals.setShowSettings(true)}
                        onShowPrompts={() => modals.setShowPromptSettings(true)}
                        onShowSkills={() => modals.setShowSkillsSettings(true)}
                        onUnlockExpert={handleUnlockExpert}
                        activeProfileName={sessionProfileName}
                        activeSkillsProfileName={sessionSkillsProfileName}
                        activeAiProfileName={sessionAiProfileName}
                        activeGradingMemoryName={activeGradingMemoryName}
                        onLoadDemo={loadDemoData}
                        onReset={handleStartNew}
                        hasActiveWork={!!data.modelSolution || fileProcessor.batchFiles.length > 0}
                        onImportSession={async (file) => {
                            const imported = await fileProcessor.handleKorekiImport(file);
                            if (imported && imported.metadata) {
                                const {
                                    activeProfileId,
                                    activeProfileName,
                                    activeAiProfileId,
                                    activeAiProfileName,
                                    activeGradingMemoryId,
                                    activeGradingMemoryName: targetMemoryName
                                } = imported.metadata;

                                if (activeProfileName) {
                                    setSessionProfileName(activeProfileName);
                                    if (activeProfileId) {
                                        setAiSettings(prev => ({ ...prev, activePromptProfileId: activeProfileId }));
                                    } else {
                                        const found = profiles.find(p => p.name === activeProfileName);
                                        if (found) {
                                            setAiSettings(prev => ({ ...prev, activePromptProfileId: found.id }));
                                        }
                                    }
                                }

                                if (activeAiProfileName) {
                                    setSessionAiProfileName(activeAiProfileName);
                                    if (activeAiProfileId) {
                                        setAiSettings(prev => ({ ...prev, activeAiProfileId: activeAiProfileId }));
                                    } else {
                                        if (activeAiProfileName === 'Standard' || activeAiProfileName === 'system-standard') {
                                            setAiSettings(prev => ({ ...prev, activeAiProfileId: undefined }));
                                        } else if (activeAiProfileName === 'Mathematik' || activeAiProfileName === 'system-math') {
                                            setAiSettings(prev => ({ ...prev, activeAiProfileId: 'system-math' }));
                                        }
                                    }
                                }

                                if (targetMemoryName) {
                                    setActiveGradingMemoryName(targetMemoryName);
                                    localStorage.setItem('koreki_active_grading_memory_name', targetMemoryName);
                                    if (activeGradingMemoryId) {
                                        selectMemory(activeGradingMemoryId);
                                    }
                                    if (imported.metadata?.activeGradingMemoryCases) {
                                        localStorage.setItem('koreki_active_grading_memory_cases', JSON.stringify(imported.metadata.activeGradingMemoryCases));
                                    }
                                }
                            }
                        }}
                        onRelinkFiles={fileProcessor.handleRelinkFiles}
                        isImportedSession={fileProcessor.isImportedSession}
                        hasMissingFiles={fileProcessor.batchFiles.length > 0 && fileProcessor.batchFiles.some(f => !f?.files || f.files.length === 0)}
                        onShowHelp={() => modals.setShowHelp(true)}
                        onShowAiParams={() => modals.setShowAiParamsSettings(true)}
                        onShowGradingMemory={() => setShowGradingMemory(true)}
                    />

                    <DemoHintBanner isOpen={showDemoHint} onDismiss={dismissDemoHint} />

                    <DashboardModals
                        userData={userData!}
                        settings={aiSettings}
                        setSettings={setAiSettings}
                        showSettings={modals.showSettings}
                        setShowSettings={modals.setShowSettings}
                        showPromptSettings={modals.showPromptSettings}
                        setShowPromptSettings={modals.setShowPromptSettings}
                        showSkillsSettings={modals.showSkillsSettings}
                        setShowSkillsSettings={modals.setShowSkillsSettings}
                        showCredits={modals.showCredits}
                        setShowCredits={modals.setShowCredits}
                        showHelp={modals.showHelp}
                        setShowHelp={modals.setShowHelp}
                        showAiSetup={modals.showAiSetup}
                        setShowAiSetup={modals.setShowAiSetup}
                        showAiParamsSettings={modals.showAiParamsSettings}
                        setShowAiParamsSettings={modals.setShowAiParamsSettings}
                        showOnboarding={modals.showOnboarding}
                        setShowOnboarding={modals.setShowOnboarding}
                        showAVVUpload={modals.showAVVUpload}
                        setShowAVVUpload={modals.setShowAVVUpload}
                        showPureKeyModal={modals.showPureKeyModal}
                        setShowPureKeyModal={modals.setShowPureKeyModal}
                        showQuickStart={modals.showQuickStart}
                        setShowQuickStart={modals.setShowQuickStart}
                        showModelTypeModal={modals.showModelTypeModal}
                        setShowModelTypeModal={modals.setShowModelTypeModal}
                        saveSettings={saveSettings}
                        handleModeSelect={handleModeSelect}
                        sessionProfileName={sessionProfileName}
                        setSessionProfileName={setSessionProfileName}
                        sessionSkillsProfileName={sessionSkillsProfileName}
                        setSessionSkillsProfileName={setSessionSkillsProfileName}
                        sessionAiProfileName={sessionAiProfileName}
                        setSessionAiProfileName={setSessionAiProfileName}
                        profiles={profiles}
                        pureApiKey={data.pureApiKey ?? null}
                        setPureApiKey={data.setPureApiKey}
                        pendingModelFile={data.pendingModelFile}
                        setPendingModelFile={data.setPendingModelFile}
                        handleModelUpload={fileProcessor.handleModelUpload}
                        splitIdx={fileProcessor.splitIdx}
                        setSplitIdx={fileProcessor.setSplitIdx}
                        executeSplit={fileProcessor.executeSplit}
                        redactIdx={fileProcessor.redactIdx}
                        setRedactIdx={fileProcessor.setRedactIdx}
                        batchFiles={fileProcessor.batchFiles}
                        setBatchFiles={fileProcessor.setBatchFiles}
                        pdfTypeQueue={fileProcessor.pdfTypeQueue}
                        handlePDFTypeSelect={fileProcessor.handlePDFTypeSelect}
                        handleAiOllamaSave={actions.handleAiOllamaSave}
                        handleAiMistralSave={actions.handleAiMistralSave}
                        handleAiCustomSave={actions.handleAiCustomSave}
                        onGenerateGraph={handleGenerateGraphFromText}
                        onGenerateCalcTrace={handleGenerateCalcTraceFromText}
                    />

                    <GradingMemoryModal 
                        isOpen={showGradingMemory}
                        onClose={() => setShowGradingMemory(false)}
                        modelSolution={data.modelSolution}
                        tasksLayout={data.tasksLayout}
                        settings={aiSettings}
                        userData={userData}
                        setUserData={setUserData}
                        onActiveMemoryChange={setActiveGradingMemoryName}
                    />

                    {(aiStatus?.ocrBrakeActive || aiStatus?.correctionBrakeActive) && (
                        <div className="mb-6 flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl font-semibold shadow-sm animate-pulse">
                            <AlertTriangle size={20} />
                            <span>{aiStatus.message}</span>
                        </div>
                    )}

                    <UploadGrid
                        settings={aiSettings}
                        onGenerateGraph={handleGenerateGraphForTask}
                        onGenerateCalcTrace={handleGenerateCalcTraceForTask}
                        onModelUpload={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                if (file.type === 'application/pdf' || file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.txt')) {
                                    data.setPendingModelFile(file);
                                    modals.setShowModelTypeModal(true);
                                } else {
                                    fileProcessor.handleModelUpload(file, false);
                                }
                            }
                        }}
                        onStudentUpload={(e) => fileProcessor.handleStudentUpload(e)}
                        onReExtractLayout={async () => {
                            const res = await fileProcessor.cleanAndExtractLayout(data.modelSolution, aiSettings);
                            if (res) {
                                if (res.tasks) data.setTasksLayout(res.tasks);
                                const reExtractedContext = typeof res.context === 'string' ? res.context.trim() : '';
                                data.setModelSolutionContext(reExtractedContext);
                                if (res.tasks) data.setModelSolution(buildModelSolutionFromTasks(reExtractedContext, res.tasks));

                                // Industrial Credit Deduction for Re-Extraction
                                const pageCount = (data as any).modelSolutionPageCount || 1;
                                if (userData?.appMode !== 'PURE') {
                                    setUserData((prev: any) => prev ? { ...prev, credits: Math.max(0, prev.credits - pageCount) } : null);
                                }
                            }
                        }}
                        onModelSolutionChange={data.setModelSolution}
                        onModelSolutionContextChange={data.setModelSolutionContext}
                        modelSolutionContext={data.modelSolutionContext}
                        onTasksChange={data.setTasksLayout}
                        isPureMode={userData?.appMode === 'PURE'}
                        isLocked={fileProcessor.batchFiles.some(f => f.status === 'done' || f.status === 'processing')}
                        modelSolution={data.modelSolution}
                        tasksLayout={data.tasksLayout}
                        extractingLayout={fileProcessor.isLoadingModel}
                        batchFilesCount={fileProcessor.batchFiles.length}
                        collapsed={isUploadSectionCollapsed}
                        onToggleCollapse={() => setIsUploadSectionCollapsed(v => !v)}
                    />

                    {fileProcessor.batchFiles.length > 0 && (() => {
                        const getExportName = (f: any) => {
                            if (/^Schüler #\d+$/.test(f.name) && f.originalName) return f.originalName;
                            return f.name || f.originalName || 'Unbekannt';
                        };
                        const mapToStudentResult = (f: any) => {
                            const fullName = getExportName(f);
                            let fName = f.studentFirstName;
                            let lName = f.studentLastName;
                            if (!fName && !lName && fullName && fullName !== 'Unbekannt') {
                                if (fullName.includes(',')) {
                                    const parts = fullName.split(',');
                                    lName = parts[0].trim();
                                    fName = parts[1].trim();
                                } else {
                                    const parts = fullName.split(/\s+/);
                                    if (parts.length > 1) {
                                        fName = parts[0].trim();
                                        lName = parts.slice(1).join(' ').trim();
                                    } else {
                                        lName = fullName;
                                    }
                                }
                            }
                            return {
                                studentFirstName: fName,
                                studentLastName: lName,
                                studentName: fullName,
                                analysis: f.result!,
                                grade: f.grade
                            };
                        };
                        return (
                            <BatchProcessor
                                batchFiles={fileProcessor.batchFiles}
                                tasksLayout={data.tasksLayout}
                                loading={fileProcessor.isLoadingBatch}
                                currentProcessingIndex={fileProcessor.currentProcessingIndex}
                                onProcess={() => fileProcessor.processBatch(aiStatus)}
                                onExtractOCR={() => fileProcessor.handleExtractOCR(fileProcessor.batchFiles)}
                                onExportTeacher={() => exportTeacherList(
                                    fileProcessor.batchFiles.filter(f => f.status === 'done' && f.result).map(mapToStudentResult),
                                    {
                                        expertise: sessionProfileName,
                                        gradingMemory: activeGradingMemoryName || 'Inaktiv / Keine',
                                        aiModel: sessionAiProfileName
                                    }
                                )}
                                onExportStudents={() => exportStudentSummaries(fileProcessor.batchFiles.filter(f => f.status === 'done' && f.result).map(mapToStudentResult))}
                                onExportIndividual={() => exportIndividualFeedbacks(fileProcessor.batchFiles.filter(f => f.status === 'done' && f.result).map(mapToStudentResult))}
                                onExportPDFs={(mode) => void exportIndividualPDFs(fileProcessor.batchFiles.filter(f => f.status === 'done' && f.result).map(mapToStudentResult), mode)}
                                onExportKoreki={() => {
                                    let cases = undefined;
                                    try {
                                        const stored = localStorage.getItem('koreki_active_grading_memory_cases');
                                        if (stored) cases = JSON.parse(stored);
                                    } catch (e) {}
                                    exportSessionToJson(
                                        fileProcessor.batchFiles, 
                                        data.modelSolution, 
                                        data.tasksLayout,
                                        {
                                            activeProfileId: aiSettings.activePromptProfileId,
                                            activeProfileName: sessionProfileName,
                                            activeAiProfileId: aiSettings.activeAiProfileId,
                                            activeAiProfileName: sessionAiProfileName,
                                            activeGradingMemoryId: localStorage.getItem('koreki_active_grading_memory_id') || undefined,
                                            activeGradingMemoryName: activeGradingMemoryName,
                                            activeGradingMemoryCases: cases
                                        }
                                    );
                                }}
                                onExportSL={() => {
                                    let cases = undefined;
                                    try {
                                        const stored = localStorage.getItem('koreki_active_grading_memory_cases');
                                        if (stored) cases = JSON.parse(stored);
                                    } catch (e) {}
                                    exportSessionToJson(
                                        fileProcessor.batchFiles, 
                                        data.modelSolution, 
                                        data.tasksLayout,
                                        {
                                            activeProfileId: aiSettings.activePromptProfileId,
                                            activeProfileName: sessionProfileName,
                                            activeAiProfileId: aiSettings.activeAiProfileId,
                                            activeAiProfileName: sessionAiProfileName,
                                            activeGradingMemoryId: localStorage.getItem('koreki_active_grading_memory_id') || undefined,
                                            activeGradingMemoryName: activeGradingMemoryName,
                                            activeGradingMemoryCases: cases
                                        },
                                        true
                                    );
                                }}
                                onToggleSelect={fileProcessor.onToggleSelect}
                                onToggleType={fileProcessor.onToggleType}
                                onUpdateText={fileProcessor.onUpdateText}
                                onSplit={fileProcessor.setSplitIdx}
                                onRedact={fileProcessor.setRedactIdx}
                                onRemoveFile={fileProcessor.removeFile}
                                onRelinkFiles={fileProcessor.handleRelinkFiles}
                                onResetResults={fileProcessor.onResetResults}
                                credits={userData?.credits || 0}
                                isPureMode={userData?.appMode === 'PURE'}
                                avvAccepted={userData?.avvAccepted || userData?.role === 'ADMIN' || userData?.appMode === 'TRIAL' || userData?.appMode === 'PURE'}
                                settings={aiSettings}
                                onUpdateSettings={setAiSettings}
                                onProcessSingleFile={(idx) => fileProcessor.processSingleFile(idx, aiStatus)}
                                onProcessSingleOCR={(idx) => fileProcessor.processSingleOCR(idx)}
                            />
                        );
                    })()}
                </div>
                </div>
            </AppLayout>
        </AuthGuard>
    );
}
