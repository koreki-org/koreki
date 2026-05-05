import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import Home from '@/pages/app';
import { useRouter } from 'next/router';
import React from 'react';
import '@testing-library/jest-dom';

/**
 * Industrial Dashboard Integration Test
 * 🏮🛡️🏛️
 * Verification of the thin-controller architecture (Stage 7).
 */



jest.mock('next/router', () => ({
    useRouter: jest.fn()
}));

// Mock Auth
jest.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        userData: { logtoId: 'u1', role: 'USER', appMode: 'STANDARD', avvAccepted: true, activeWorkspaceType: 'PERSONAL' },
        authLoading: false, aiStatus: { status: 'OK' },
        checkAuth: jest.fn(), fetchAiStatus: jest.fn(), setUserData: jest.fn()
    })
}));

// Mock File Processor
jest.mock('@/hooks/useFileProcessor', () => ({
    useFileProcessor: () => ({
        batchFiles: [], setBatchFiles: jest.fn(),
        isLoadingModel: false, isLoadingBatch: false, currentProcessingIndex: -1,
        pdfTypeQueue: [], setPdfTypeQueue: jest.fn(),
        splitIdx: null, setSplitIdx: jest.fn(), redactIdx: null, setRedactIdx: jest.fn(),
        handleExtractOCR: jest.fn(), processBatch: jest.fn(), executeSplit: jest.fn(),
        handleStudentUpload: jest.fn(), handleModelUpload: jest.fn(),
        handlePDFTypeSelect: jest.fn(), cleanAndExtractLayout: jest.fn(),
        removeFile: jest.fn(), handleKorekiImport: jest.fn(), handleRelinkFiles: jest.fn(),
        isImportedSession: false
    })
}));

// Mock Orchestrator (The Controller brain)
const mockActions = { 
    handleLogout: jest.fn() 
};

jest.mock('@/hooks/useDashboardOrchestrator', () => ({
    useDashboardOrchestrator: () => ({
        modals: {
            showSettings: false, setShowSettings: jest.fn(),
            showPromptSettings: false, setShowPromptSettings: jest.fn(),
            showCredits: false, setShowCredits: jest.fn(),
            showHelp: false, setShowHelp: jest.fn(),
            showOnboarding: false, setShowOnboarding: jest.fn(),
            showAVVUpload: false, setShowAVVUpload: jest.fn(),
            showPureKeyModal: false, setShowPureKeyModal: jest.fn(),
            showQuickStart: false, setShowQuickStart: jest.fn(),
            showModelTypeModal: false, setShowModelTypeModal: jest.fn(),
            showAiSetup: false, setShowAiSetup: jest.fn()
        },
        data: {
            upgrading: false, pureApiKey: '', setPureApiKey: jest.fn(),
            modelSolution: '', setModelSolution: jest.fn(),
            tasksLayout: [], setTasksLayout: jest.fn(),
            pendingModelFile: null, setPendingModelFile: jest.fn()
        },
        actions: mockActions
    })
}));

// Simple UI Mocks
jest.mock('@/components/layout/AppHeader', () => ({ onLogout }: any) => (
    <button onClick={onLogout}>Logout</button>
));
jest.mock('@/layouts/AppLayout', () => ({ children }: any) => <div>{children}</div>);
jest.mock('@/components/UploadGrid', () => () => <div data-testid="upload-grid" />);
jest.mock('@/components/BatchProcessor', () => () => <div data-testid="batch-processor" />);
jest.mock('@/components/dashboard/DashboardModals', () => ({
    DashboardModals: () => null
}));

describe('App Dashboard Integration (Industrial Logic)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), reload: jest.fn(), isReady: true, query: {} });
    });

    afterEach(cleanup);

    it('should correctly trigger the logout handler in the new facade pattern', async () => {
        render(<Home />);
        const logoutBtn = screen.getByText(/Logout/i);
        fireEvent.click(logoutBtn);
        
        expect(mockActions.handleLogout).toHaveBeenCalled();
    });
});
