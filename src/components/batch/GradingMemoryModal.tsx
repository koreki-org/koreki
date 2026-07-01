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
                    {step === 'calibrate' && syntheticAnswers.length > 0 && (() => {
                        const activeCase = syntheticAnswers[activeCaseIndex];
                        const activeKey = activeCase ? activeCase.uid : '';
                        const cal = calibrations[activeKey];
                        if (!activeCase || !cal) return null;

                        return (
                            <div className="flex-1 flex flex-col gap-5 min-h-0">
                                
                                {/* Wizard Progress Indicator */}
                                <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 shrink-0 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                                            {activeCaseIndex + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 font-outfit">
                                                Kalibrierung: Fall {activeCaseIndex + 1} von {syntheticAnswers.length}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                                Zugeordnete Aufgabe: <span className="text-indigo-600 font-extrabold">{activeCase.taskName || 'Allgemein'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {syntheticAnswers.map((_, idx) => {
                                            const isCompleted = idx < activeCaseIndex;
                                            const isActive = idx === activeCaseIndex;
                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`h-2.5 rounded-full transition-all duration-300 ${isActive ? 'w-10 bg-indigo-600' : isCompleted ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fullscreen 2-Spalten-Layout */}
                                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
                                    
                                    {/* Left Column: Spacious Student Answer Text */}
                                    <div className="w-full lg:w-1/2 flex flex-col bg-slate-50/50 border border-slate-150 rounded-xl p-5 md:p-6 min-h-[220px] lg:h-full overflow-hidden">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${getCharacterBadgeStyle(activeCase.character)}`}>
                                                    {getCharacterTitle(activeCase.character)}
                                                </span>
                                                <h4 className="text-sm font-extrabold text-slate-800 font-outfit">
                                                    Simulierter Text
                                                </h4>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Abgabe editieren</span>
                                        </div>

                                        <Textarea 
                                            value={activeCase.text || ''}
                                            onChange={(e) => {
                                                const newText = e.target.value;
                                                setSyntheticAnswers(prev => prev.map((ans, idx) => idx === activeCaseIndex ? { ...ans, text: newText } : ans));
                                            }}
                                            placeholder="Simulierter Schülertext..."
                                            className="flex-1 bg-white border border-slate-200 rounded-xl p-4 md:p-5 font-mono text-xs md:text-sm text-slate-700 leading-relaxed overflow-y-auto custom-scrollbar resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all"
                                        />
                                    </div>

                                    {/* Right Column: Calibration Form Cockpit */}
                                    <div className="w-full lg:w-1/2 flex flex-col bg-white border border-slate-150 rounded-xl p-5 md:p-6 lg:h-full overflow-y-auto custom-scrollbar gap-5">
                                        <div className="border-b border-slate-100 pb-3 shrink-0 flex items-center justify-between">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 font-outfit">
                                                <BookOpen size={16} className="text-indigo-500" />
                                                Bewertungs-Cockpit
                                            </h4>
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                                KI-Vorschlag geladen
                                            </span>
                                        </div>

                                        {/* 1. Task Association Dropdown */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                                                Zugeordnete Aufgabe aus der Musterlösung:
                                            </label>
                                            {tasksLayout && tasksLayout.length > 0 ? (
                                                <select 
                                                    value={cal.taskName}
                                                    onChange={(e) => {
                                                        const selectedName = e.target.value;
                                                        const matched = tasksLayout.find(t => t.name === selectedName);
                                                        if (matched) {
                                                            const maxP = Number(matched.maxPoints || 5);
                                                            handleUpdateCalibration(activeKey, {
                                                                taskName: selectedName,
                                                                maxPoints: maxP,
                                                                pointsObtained: Math.min(cal.pointsObtained, maxP)
                                                            });
                                                        }
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                >
                                                    {tasksLayout.map(t => (
                                                        <option key={t.name} value={t.name}>
                                                            {t.name} (max. {t.maxPoints} Punkte)
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Input 
                                                        type="text" 
                                                        value={cal.taskName} 
                                                        onChange={e => handleUpdateCalibration(activeKey, { taskName: e.target.value })}
                                                        placeholder="z.B. Aufgabe 1a"
                                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                    />
                                                    <Input 
                                                        type="number" 
                                                        min="1"
                                                        value={cal.maxPoints} 
                                                        onChange={e => {
                                                            const maxP = Math.max(1, parseInt(e.target.value) || 5);
                                                            handleUpdateCalibration(activeKey, { 
                                                                maxPoints: maxP,
                                                                pointsObtained: Math.min(cal.pointsObtained, maxP)
                                                            });
                                                        }}
                                                        placeholder="Max"
                                                        className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. Interactive Points Slider */}
                                        <div className="space-y-3 pt-3 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                                                <span>Menschliche Wertung (Slider):</span>
                                                <span className="text-indigo-600 font-extrabold text-sm md:text-base bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 shadow-sm font-mono">
                                                    {cal.pointsObtained} von {cal.maxPoints} Punkten
                                                </span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max={cal.maxPoints} 
                                                step="0.5"
                                                value={cal.pointsObtained}
                                                onChange={e => handleUpdateCalibration(activeKey, { pointsObtained: parseFloat(e.target.value) })}
                                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                                                <span>0 Punkte (Deduction)</span>
                                                <span>{Math.round(cal.maxPoints / 2)} P (Hälfte)</span>
                                                <span>{cal.maxPoints} P (Full Score)</span>
                                            </div>
                                        </div>

                                        {/* 3. Pedagogical Correction Notes */}
                                        <div className="space-y-2 pt-3 border-t border-slate-100 flex-1 flex flex-col min-h-[140px]">
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                                                Korrekturbegründung (correctionNotes):
                                            </label>
                                            <Textarea 
                                                rows={4}
                                                value={cal.correctionNotes}
                                                onChange={e => handleUpdateCalibration(activeKey, { correctionNotes: e.target.value })}
                                                placeholder="Ausformulierte Begründung für den Punktabzug..."
                                                className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none font-medium leading-relaxed shadow-sm"
                                            />
                                        </div>

                                        {/* 4. Student Feedback Input */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                                                Feedback an Schüler (Optional):
                                            </label>
                                            <Input 
                                                type="text"
                                                value={cal.feedback}
                                                onChange={e => handleUpdateCalibration(activeKey, { feedback: e.target.value })}
                                                placeholder="Pädagogischer Ratschlag zur Fehlervermeidung..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Calibration Controls Footer */}
                                <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 shrink-0">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => {
                                            if (activeCaseIndex > 0) {
                                                setActiveCaseIndex(prev => prev - 1);
                                            } else {
                                                setStep('start');
                                            }
                                        }}
                                        className="text-xs text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1.5"
                                    >
                                        Zurück
                                    </Button>
                                    
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <Button 
                                            variant="ghost" 
                                            onClick={handleSkip}
                                            className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold px-4 h-11 rounded-xl transition-all"
                                        >
                                            Fall überspringen
                                        </Button>
                                        
                                        {activeCaseIndex < syntheticAnswers.length - 1 ? (
                                            <Button 
                                                onClick={() => setActiveCaseIndex(prev => prev + 1)}
                                                className="px-6 py-3 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100/50 text-xs md:text-sm border-0 transition-all"
                                            >
                                                Nächster Fall
                                                <ArrowRight size={14} />
                                            </Button>
                                        ) : (
                                            <Button 
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-6 py-3 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100/50 text-xs md:text-sm border-0 transition-all"
                                            >
                                                {isSaving ? (
                                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                                                ) : (
                                                    <Save size={16} />
                                                )}
                                                Erfahrungsschatz sichern
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
