import React, { useEffect } from 'react';
import Head from 'next/head';

import Header from '@/components/layout/AppHeader';
import AppLayout from '@/layouts/AppLayout';
import UploadGrid from '@/components/UploadGrid';
import BatchProcessor from '@/components/BatchProcessor';
import { DashboardModals } from '@/components/dashboard/DashboardModals';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { usePromptGovernance } from '@/hooks/usePromptGovernance';
import { useAiGovernance } from '@/hooks/useAiGovernance';
import { useDashboardActions } from '@/hooks/useDashboardActions';
import { useDashboardOrchestrator } from '@/hooks/useDashboardOrchestrator';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';

// Libs
import { exportTeacherList, exportStudentSummaries, exportIndividualFeedbacks } from '@/lib/excel';
import { exportIndividualPDFs } from '@/lib/pdf';
import { exportSessionToJson } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import AuthGuard from '@/components/guards/AuthGuard';

export default function Home() {
    // Core Auth & Logic Hooks
    const { userData, setUserData, aiStatus, authLoading, checkAuth, fetchAiStatus } = useAuth();
    
    // --- STAGE 7: INDUSTRIAL DASHBOARD ORCHESTRATION ---
    // Extracting 15+ states and compliance gating into a specialized orchestrator.
    // This makes app.tsx a thin controller. 🏮🛡️🏛️
    const { modals, data, actions } = useDashboardOrchestrator(userData, authLoading, fetchAiStatus);
    
    // Core AI Settings from Store (Single Source of Truth)
    const { aiSettings, setAiSettings, hydrateAiSettings } = useDashboardStore();

    // Governance & Actions
    const { profiles, sessionProfileName, setSessionProfileName } = usePromptGovernance(userData, aiSettings, setAiSettings);
    const { sessionAiProfileName, setSessionAiProfileName } = useAiGovernance(userData, aiSettings, setAiSettings);

    const fileProcessor = useFileProcessor(
        userData, 
        aiSettings, 
        data.modelSolution, 
        data.tasksLayout, 
        setUserData, 
        sessionProfileName,
        data.setModelSolution, 
        data.setTasksLayout
    );

    const { saveSettings, handleModeSelect, handleUnlockExpert } = useDashboardActions(userData, setUserData, aiSettings, setAiSettings, fetchAiStatus);


    // Initial State Effects
    useEffect(() => {
        checkAuth();
        hydrateAiSettings(); // Hydrate Desktop/Ollama settings once after mount
    }, [checkAuth, hydrateAiSettings]);

    // Auto-Scroll Logic: Smooth scroll to BatchProcessor once files are added
    const prevFilesCount = React.useRef(0);
    useEffect(() => {
        if (fileProcessor.batchFiles.length > 0 && prevFilesCount.current === 0) {
            setTimeout(() => {
                const element = document.getElementById('batch-processor-anchor');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
        prevFilesCount.current = fileProcessor.batchFiles.length;
    }, [fileProcessor.batchFiles.length]);

    const loadDemoData = () => {
        const demoTasks = [
            { name: "Aufgabe 1", maxPoints: 4, content: `### Aufgabe 1: Wahlen (AFB I) (4 P) ###\nFragestellung: Nenne vier Wahlrechtsgrundsätze der Bundesrepublik Deutschland.\n\nMusterlösung: Erwartet wird die Nennung von vier Wahlrechtsgrundsätzen (z.B. allgemein, unmittelbar, frei, gleich, geheim). Für jeden korrekten Grundsatz gibt es 1 Punkt.` },
            { name: "Aufgabe 2", maxPoints: 6, content: `### Aufgabe 2: Bedeutung von Wahlen (AFB II) (6 P) ###\nFragestellung: Erkläre, warum regelmäßige Wahlen für das Funktionieren einer Demokratie essenziell sind.\n\nMusterlösung: Erwartet wird eine Erklärung, warum Wahlen für eine Demokratie wichtig sind (z.B. Legitimation der Macht, Kontrolle der Regierung, friedlicher Machtwechsel, Repräsentation des Volkswillens). Die Erklärung sollte strukturiert und schlüssig sein.` },
            { name: "Aufgabe 3", maxPoints: 10, content: `### Aufgabe 3: Herrschaft des Volkes (AFB III) (10 P) ###\nFragestellung: Setze dich kritisch mit der Aussage "Demokratie ist die Herrschaft des Volkes" auseinander.\n\nMusterlösung: Erwartet wird eine kritische Auseinandersetzung mit der Aussage "Demokratie ist die Herrschaft des Volkes".\nMögliche Aspekte:\n- Pro: Wahlen, Volksbegehren, repräsentative Demokratie (Volksvertreter).\n- Contra: Einfluss von Lobbyismus, geringe Wahlbeteiligung, komplexe Entscheidungsprozesse, in denen sich Einzelne oft nicht wiederfinden.\n- Fazit: Eine differenzierte Bewertung, die zeigt, dass das Volk die Macht legitimiert, aber nicht direkt jeden Schritt lenkt.` }
        ];
        const fullSolution = `Musterlösung zum Thema "Demokratie und Mitbestimmung":\n\n` + demoTasks.map(t => `### ${t.name} ###\n${t.content}`).join('\n\n');
        data.setModelSolution(fullSolution);
        data.setTasksLayout(demoTasks);
        const demoStudentText = `=== TASK: Aufgabe 1 ===\nDie vier Wahlrechtsgrundsätze sind: allgemein, unmittelbar, frei und geheim. Ich glaube, gleich gehört auch noch dazu.\n\n=== TASK: Aufgabe 2 ===\nWahlen sind wichtig, weil das Volk so bestimmen kann, wer regiert. Ohne Wahlen gäbe es keine Kontrolle und jemand könnte einfach immer an der Macht bleiben. Das wäre dann wie eine Diktatur. Durch Wahlen wird die Regierung also legitimiert.\n\n=== TASK: Aufgabe 3 ===\nDemokratie heißt Herrschaft des Volkes. Das stimmt einerseits, weil wir wählen gehen. Aber andererseits haben Reiche und Lobbyisten oft mehr zu sagen als normale Bürger. Außerdem gehen viele Leute gar nicht wählen, dann entscheidet ja nicht das ganze Volk. Trotzdem ist es die beste Form, die wir haben.`;

        fileProcessor.setBatchFiles([{
            name: "Schüler #1",
            originalName: "Moritz Beispielfeld",
            status: 'pending',
            result: null,
            error: null,
            fileText: demoStudentText,
            tasks: [],
            documentType: 'typed',
            pageCount: 1,
            estimatedCredits: 1,
            selected: true,
            ocrDone: true
        }]);
    };

    const handleStartNew = () => {
        if (fileProcessor.batchFiles.length > 0 || data.modelSolution) {
            if (confirm("Möchtest du wirklich alle aktuellen Daten löschen und eine neue Korrektur starten?")) {
                fileProcessor.setBatchFiles([]);
                data.setModelSolution("");
                data.setTasksLayout([]);
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
                        onUnlockExpert={handleUnlockExpert}
                        activeProfileName={sessionProfileName}
                        activeAiProfileName={sessionAiProfileName}
                        onLoadDemo={loadDemoData}
                        onReset={handleStartNew}
                        onImportSession={fileProcessor.handleKorekiImport}
                        onRelinkFiles={fileProcessor.handleRelinkFiles}
                        isImportedSession={fileProcessor.isImportedSession}
                        hasMissingFiles={fileProcessor.batchFiles.length > 0 && fileProcessor.batchFiles.some(f => !f.files || f.files.length === 0)}
                        onShowHelp={() => modals.setShowHelp(true)}
                        onShowAiParams={() => modals.setShowAiParamsSettings(true)}
                    />

                    <DashboardModals 
                        userData={userData!}
                        settings={aiSettings}
                        setSettings={setAiSettings}
                        showSettings={modals.showSettings}
                        setShowSettings={modals.setShowSettings}
                        showPromptSettings={modals.showPromptSettings}
                        setShowPromptSettings={modals.setShowPromptSettings}
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
                        sessionAiProfileName={sessionAiProfileName}
                        setSessionAiProfileName={setSessionAiProfileName}
                        profiles={profiles}
                        pureApiKey={data.pureApiKey}
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
                    />

                    {(aiStatus?.ocrBrakeActive || aiStatus?.correctionBrakeActive) && (
                        <div className="mb-6 flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl font-semibold shadow-sm animate-pulse">
                            <AlertTriangle size={20} />
                            <span>{aiStatus.message}</span>
                        </div>
                    )}

                    <UploadGrid
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
                                if (res.cleanedText) data.setModelSolution(res.cleanedText);
                                
                                // Industrial Credit Deduction for Re-Extraction
                                const pageCount = (data as any).modelSolutionPageCount || 1;
                                if (userData?.appMode !== 'PURE') {
                                    setUserData((prev: any) => prev ? { ...prev, credits: Math.max(0, prev.credits - pageCount) } : null);
                                }
                            }
                        }}
                        onModelSolutionChange={data.setModelSolution}
                        onTasksChange={data.setTasksLayout}
                        isPureMode={userData?.appMode === 'PURE'}
                        isLocked={fileProcessor.batchFiles.some(f => f.status === 'done' || f.status === 'processing')}
                        modelSolution={data.modelSolution}
                        tasksLayout={data.tasksLayout}
                        extractingLayout={fileProcessor.isLoadingModel}
                        batchFilesCount={fileProcessor.batchFiles.length}
                    />

                    {fileProcessor.batchFiles.length > 0 && (() => {
                        const getExportName = (f: any) => {
                            if (f.splitInfo) return f.name;
                            if (/^Schüler #\d+$/.test(f.name) && f.originalName) return f.originalName;
                            return f.name || f.originalName || 'Unbekannt';
                        };
                        return (
                            <BatchProcessor
                                batchFiles={fileProcessor.batchFiles}
                                tasksLayout={data.tasksLayout}
                                loading={fileProcessor.isLoadingBatch}
                                currentProcessingIndex={fileProcessor.currentProcessingIndex}
                                onProcess={() => fileProcessor.processBatch(aiStatus)}
                                onExtractOCR={() => fileProcessor.handleExtractOCR(fileProcessor.batchFiles)}
                                onExportTeacher={() => exportTeacherList(fileProcessor.batchFiles.filter(f => f.status === 'done' && f.result).map(f => ({ studentName: getExportName(f), analysis: f.result!, grade: f.grade })))}
                                onExportStudents={() => exportStudentSummaries(fileProcessor.batchFiles.filter(f => f.status === 'done' && f.result).map(f => ({ studentName: getExportName(f), analysis: f.result!, grade: f.grade })))}
                                onExportIndividual={() => exportIndividualFeedbacks(fileProcessor.batchFiles.filter(f => f.status === 'done' && f.result).map(f => ({ studentName: getExportName(f), analysis: f.result!, grade: f.grade })))}
                                onExportPDFs={() => exportIndividualPDFs(fileProcessor.batchFiles.filter(f => f.status === 'done' && f.result).map(f => ({ studentName: getExportName(f), analysis: f.result!, grade: f.grade })))}
                                onExportKoreki={() => exportSessionToJson(fileProcessor.batchFiles, data.modelSolution, data.tasksLayout)}
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
                            />
                        );
                    })()}
                </div>
                </div>
            </AppLayout>
        </AuthGuard>
    );
}
