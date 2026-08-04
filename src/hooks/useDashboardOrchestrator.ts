import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { AppSettings, Task, User } from '../types';
import { useDashboardStore } from './store/useDashboardStore';
import { isLocalInstance, isKeycloakAuth } from '../lib/env-context';
import { signoutOidc } from '@/lib/auth-keycloak';
import { apiClient } from '../lib/api-client';
/**
 * Industrial Dashboard Orchestrator (Stage 7)
 * 🏮🛡️🏛️
 * Encapsulates all modal visibility states, compliance gating (AVV/Onboarding),
 * and dashboard-level data synchronization.
 */
export const useDashboardOrchestrator = (
    userData: User | null,
    authLoading: boolean,
    fetchAiStatus: () => any
) => {
    const router = useRouter();

    // --- Core Settings State (Consolidated via Store) ---
    const {
        modelSolution, setModelSolution,
        modelSolutionContext, setModelSolutionContext,
        tasksLayout, setTasksLayout,
        aiSettings, setAiSettings,
        isHydrated,
        upgrading, setUpgrading,
        pendingModelFile, setPendingModelFile,
        modelSolutionPageCount, setModelSolutionPageCount
    } = useDashboardStore();


    // --- Logout Logic ---
    const handleLogout = useCallback(() => {
        if (isKeycloakAuth()) {
            signoutOidc();
        } else {
            // Standard OIDC Logout: Redirect to the SDK handler
            window.location.href = '/api/logto/sign-out';
        }
    }, []);

    const syncGlobalSettingsIfAdmin = useCallback(async (newSettings: AppSettings) => {
        if (userData?.role === 'ADMIN' && isLocalInstance()) {
            try {
                await apiClient.post('/api/admin/global-ai-settings', newSettings);
            } catch (err) {
                console.error('Failed to sync global AI settings:', err);
            }
        }
    }, [userData?.role]);

    const handleAiOllamaSave = useCallback((url: string, model: string) => {
        const newSettings = { ...aiSettings, provider: 'ollama' as const, ollamaUrl: url, ollamaModel: model };
        setAiSettings(newSettings);
        syncGlobalSettingsIfAdmin(newSettings);
    }, [aiSettings, setAiSettings, syncGlobalSettingsIfAdmin]);

    const handleAiMistralSave = useCallback((key: string) => {
        const newSettings = { ...aiSettings, provider: 'mistral' as const, mistralKey: key };
        setAiSettings(newSettings);
        syncGlobalSettingsIfAdmin(newSettings);
    }, [aiSettings, setAiSettings, syncGlobalSettingsIfAdmin]);

    const handleAiCustomSave = useCallback((url: string, key: string, model: string, thinking: boolean) => {
        const newSettings = { ...aiSettings, provider: 'openai-compatible' as const, openaiUrl: url, openaiKey: key, openaiModel: model, enableThinking: thinking };
        setAiSettings(newSettings);
        syncGlobalSettingsIfAdmin(newSettings);
    }, [aiSettings, setAiSettings, syncGlobalSettingsIfAdmin]);

    // --- Modal Visibility States ---
    const [showSettings, setShowSettings] = useState(false);
    const [showCredits, setShowCredits] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showAVVUpload, setShowAVVUpload] = useState(false);
    const [showPureKeyModal, setShowPureKeyModal] = useState(false);
    const [showQuickStart, setShowQuickStart] = useState(false);
    const [showPromptSettings, setShowPromptSettings] = useState(false);
    const [showSkillsSettings, setShowSkillsSettings] = useState(false);
    const [showModelTypeModal, setShowModelTypeModal] = useState(false);
    const [showAiSetup, setShowAiSetup] = useState(false);
    const [showAiParamsSettings, setShowAiParamsSettings] = useState(false);

    // --- Compliance & Modal Triage (Auto-Gating) ---
    useEffect(() => {
        if (!authLoading && userData && isHydrated) {
            const isSystemAdmin = userData.role === 'ADMIN';
            const isOrg = userData.activeWorkspaceType === 'ORGANIZATION';
            const hasAcceptedAVV = userData.avvAccepted;

            // 1. Onboarding (Mode Selection)
            if (!isSystemAdmin && (!userData.appMode || userData.appMode === 'UNSET')) {
                if (!showOnboarding) setShowOnboarding(true);
            } else {
                if (showOnboarding) setShowOnboarding(false);
            }

            // 2. AVV (Legal compliance for orgs/standard)
            if (!isSystemAdmin && !hasAcceptedAVV && (isOrg || userData.appMode === 'STANDARD')) {
                if (!showAVVUpload) setShowAVVUpload(true);
            } else {
                if (showAVVUpload) setShowAVVUpload(false);
            }

            // 3. Pure Key vs AI Setup (API logic for PURE mode)
            if (userData.appMode === 'PURE') {
                if (isLocalInstance()) {
                    // Bypass Path (Desktop/Community): If no provider choice made, show Setup
                    const hasOllama = aiSettings.provider === 'ollama' && aiSettings.ollamaUrl;
                    const hasMistral = aiSettings.provider === 'mistral' && aiSettings.mistralKey;
                    const hasCustom = aiSettings.provider === 'openai-compatible' && aiSettings.openaiUrl;
                    const hasGlobalAi = userData?.hasGlobalAiKey;
                    
                    // INDUSTRIAL HARDENING: Only auto-show if both are missing AND no global server key is present.
                    // This prevents the modal from popping up in Community Edition if MISTRAL_API_KEY is set in .env.
                    if (!hasOllama && !hasMistral && !hasCustom && !hasGlobalAi) {
                        if (!showAiSetup && isSystemAdmin) setShowAiSetup(true);
                    } else {
                        // Fix recurring modal: If settings are present, ensure setup is closed
                        if (showAiSetup) setShowAiSetup(false);
                    }
                } else {
                    // SaaS Path: Original Logic
                    if (!aiSettings.mistralKey) {
                        if (!showPureKeyModal && isSystemAdmin) setShowPureKeyModal(true);
                    } else {
                        if (showPureKeyModal) setShowPureKeyModal(false);
                    }
                }
            } else {
                if (showPureKeyModal) setShowPureKeyModal(false);
                if (showAiSetup) setShowAiSetup(false);
            }
        }
    }, [authLoading, userData, aiSettings, isHydrated, showOnboarding, showAVVUpload, showPureKeyModal, showAiSetup]);

    return {
        // Modal States
        modals: {
            showSettings, setShowSettings,
            showCredits, setShowCredits,
            showHelp, setShowHelp,
            showOnboarding, setShowOnboarding,
            showAVVUpload, setShowAVVUpload,
            showPureKeyModal, setShowPureKeyModal,
            showQuickStart, setShowQuickStart,
            showPromptSettings, setShowPromptSettings,
            showSkillsSettings, setShowSkillsSettings,
            showModelTypeModal, setShowModelTypeModal,
            showAiSetup, setShowAiSetup,
            showAiParamsSettings, setShowAiParamsSettings
        },
        // Data States
        data: {
            settings: aiSettings, setSettings: setAiSettings,
            modelSolution, setModelSolution,
            modelSolutionContext, setModelSolutionContext,
            tasksLayout, setTasksLayout,
            pureApiKey: aiSettings.mistralKey, setPureApiKey: (k: any) => setAiSettings((prev: any) => ({ ...prev, mistralKey: k })),
            upgrading, setUpgrading,
            pendingModelFile, setPendingModelFile,
            modelSolutionPageCount, setModelSolutionPageCount
        },
        // Handlers
        actions: {
            handleLogout,
            handleAiOllamaSave,
            handleAiMistralSave,
            handleAiCustomSave
        }
    };
};
