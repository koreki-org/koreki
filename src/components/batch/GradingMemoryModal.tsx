import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Sliders, Save, CheckCircle, ArrowRight, Bot, ShieldCheck, AlertCircle, Trash2, Check, HelpCircle, BookOpen, Upload, Download, PlusCircle, Pencil, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { FloatingActions } from '../ui/FloatingActions';
import { PointInput } from '../ui/PointInput';
import { AppSettings, GradingMemory, GradingMemoryCase, Task } from '../../types';
import { useGradingMemories } from '../../hooks/useGradingMemories';
import { useGradingMemoryModalState } from '../../hooks/useGradingMemoryModalState';
import { GradingMemoryStartScreen } from './GradingMemoryStartScreen';
import { GradingMemoryGeneratingScreen } from './GradingMemoryGeneratingScreen';
import { GradingMemoryCalibrateScreen } from './GradingMemoryCalibrateScreen';
import { resolveTaskName, resolveMaxPoints } from '../../lib/grading-memory-utils';

import { isDesktopTarget } from '../../lib/env-context';
import { apiClient } from '../../lib/api-client';
import { downloadFile } from '../../lib/file-utils';
import { exportGradingMemoryToMarkdown, parseMarkdownGradingMemory } from '../../lib/parsers/markdown-grading-memory-parser';
import { cn } from '../../lib/utils';

interface GradingMemoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    modelSolution: string;
    tasksLayout?: Task[];
    settings?: AppSettings;
    userData?: any;
    setUserData?: React.Dispatch<React.SetStateAction<any>>;
    onActiveMemoryChange?: (name: string | undefined) => void;
}

export const GradingMemoryModal: React.FC<GradingMemoryModalProps> = ({
    isOpen,
    onClose,
    modelSolution,
    tasksLayout,
    settings,
    userData,
    setUserData,
    onActiveMemoryChange
}) => {
    const state = useGradingMemoryModalState({
        isOpen, onClose, modelSolution, tasksLayout, settings, userData, setUserData, onActiveMemoryChange
    });
    const {
        mounted,
        setMounted,
        step,
        setStep,
        profileName,
        setProfileName,
        syntheticAnswers,
        setSyntheticAnswers,
        activeCaseIndex,
        setActiveCaseIndex,
        selectedTasks,
        setSelectedTasks,
        calibrations,
        setCalibrations,
        memories,
        setMemories,
        editingActiveName,
        setEditingActiveName,
        editingMemoryId,
        setEditingMemoryId,
        editingName,
        setEditingName,
        fileInputRef,
        isSaving,
        setIsSaving,
        isGenerating,
        setIsGenerating,
        error,
        setError,
        hookMemories,
        loadingMemories,
        activeMemoryId,
        selectMemory,
        deleteMemory,
        addLocalMemory,
        refreshMemories,
        getActiveMemory,
        activeMemory,
        isImportedAndUnsaved,
        hasChanges,
        handleImportClick,
        handleImportFile,
        handleExportMemory,
        handleConfirmRename,
        handleUpdateCaseField,
        handleDeleteCase,
        handleSaveActiveMemoryChanges,
        handleSaveImportedMemory,
        handleGenerate,
        handleCreateEmptyMemory,
        handleAddCaseManually,
        handleSkip,
        handleSave,
        handleUpdateCalibration,
        getCharacterBadgeStyle,
        getCharacterTitle
    } = state;

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div 
                className="relative w-full md:max-w-[1200px] h-full md:h-[88vh] bg-white border-none md:border md:border-white rounded-none md:rounded-hero shadow-2xl flex flex-col overflow-hidden animate-fade-in text-foreground text-left"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="px-4 sm:px-8 py-4 sm:pt-8 sm:pb-4 flex justify-between items-center border-b border-slate-100 bg-white/50 backdrop-blur shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden shrink-0">
                            <img src="/logo.png" alt="Koreki Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-black font-outfit text-slate-900 tracking-tight truncate">
                                GradingMemory Center
                            </h2>
                            <p className="text-xxs sm:text-sm text-slate-500 font-medium italic truncate">
                                Kalibrierung von Few-Shot Beispielen
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 shrink-0" onClick={onClose}>
                        <X size={24} />
                    </Button>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 sm:px-8 py-4 sm:py-6">
                    
                    {error && (
                        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs md:text-sm flex items-center gap-2.5 shrink-0 animate-pulse">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* STEP 1: START SCREEN (CRUD + CALIBRATE CTA) */}
                    {step === 'start' && (
                        <GradingMemoryStartScreen 
                            state={state} 
                            onClose={onClose} 
                            modelSolution={modelSolution} 
                            tasksLayout={tasksLayout} 
                        />
                    )}

                    {/* STEP 2: GENERATING ANIMATION */}
                    {step === 'generating' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center animate-pulse">
                            <div className="relative mb-6">
                                <div className="w-16 h-16 rounded-full border-4 border-indigo-600/10 border-t-indigo-600 animate-spin" />
                                <Bot size={28} className="absolute inset-0 m-auto text-indigo-600 animate-bounce" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 font-outfit">Simuliere virtuelle Schülerabgaben...</h3>
                            <p className="text-slate-500 text-xs md:text-sm max-w-[450px]">
                                Die KI analysiert deine Musterlösung und schlüpft in die Rollen verschiedener Schüler-Avatare, um Tippfehler, lückenhafte Rechenwege und schwammige Sprache zu simulieren und zu bewerten.
                            </p>
                        </div>
                    )}

                    {/* STEP 3: ACTIVE CALIBRATION (REDESIGNED EXTRA-LARGE COCKPIT) */}
                    {step === 'calibrate' && syntheticAnswers.length > 0 && (
                        <GradingMemoryCalibrateScreen 
                            state={state} 
                            tasksLayout={tasksLayout} 
                        />
                    )}

                    {/* STEP 4: SUCCESS / SAVED */}
                    {step === 'saved' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-emerald-100 animate-bounce">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 font-outfit">Erfahrungsschatz erfolgreich kalibriert!</h3>
                            <p className="text-slate-500 text-xs md:text-sm max-w-[500px] mb-6 font-medium">
                                Der neue Erfahrungsschatz <strong>&quot;{profileName}&quot;</strong> wurde sicher gespeichert und ist ab sofort als aktives Few-Shot-Modul für deine Korrekturen vorausgewählt!
                            </p>
                            <Button 
                                onClick={onClose}
                                className="px-6 py-3 h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl border border-slate-200 text-xs md:text-sm shadow-sm"
                            >
                                Schließen & Zurück zur Korrektur
                            </Button>
                        </div>
                    )}

                </div>

            </div>
        </div>,
        document.body
    );
};
export default GradingMemoryModal;
