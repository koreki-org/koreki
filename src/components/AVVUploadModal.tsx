import React from 'react';
import { Shield, X, AlertCircle, FileText, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useLegalVault } from '../hooks/useLegalVault';

/**
 * Industrial AVV Consent Modal (Stage 12 - Simplified) ⚖️🛡️
 * Replaces the multi-step upload with a legally solid checkbox workflow.
 * Design optimized for Koreki Industrial Aesthetics.
 */

interface AVVUploadModalProps {
    onComplete: (version?: string) => void;
    onCancel: () => void;
    isOrganization?: boolean;
    workspaceId?: string;
    organizationName?: string;
    isTeacherView?: boolean;
}

const AVVUploadModal: React.FC<AVVUploadModalProps> = ({ 
    onComplete, 
    onCancel, 
    isOrganization = false, 
    workspaceId, 
    organizationName,
    isTeacherView = false 
}) => {
    const { state, handlers } = useLegalVault(isOrganization, workspaceId, onComplete);
    const { isAccepted, isProcessing, error } = state;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 md:p-4 bg-background/80 backdrop-blur-glass overflow-y-auto">
            <div className="relative w-full max-w-[500px] my-auto bg-white rounded-hero p-8 md:p-10 shadow-2xl border border-border flex flex-col items-center animate-in zoom-in-95 duration-500 overflow-hidden text-center">
                
                {!isTeacherView && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all duration-200 z-10"
                        onClick={onCancel}
                    >
                        <X size={20} />
                    </Button>
                )}

                <div className="mb-6 flex flex-col items-center w-full">
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 shadow-inner ring-4 ring-primary/5">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">
                        {isOrganization ? 'Instituts-AVV' : 'Rechtssicherheit'}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-[340px]">
                        {isOrganization 
                            ? `Für "${organizationName}" sind folgende Dokumente gesetzlich zwingend erforderlich:`
                            : 'Für den vollen Funktionsumfang benötigen wir Ihre Zustimmung zu den Compliance-Dokumenten.'
                        }
                    </p>
                </div>

                <div className="w-full flex flex-col gap-4 mb-8">
                    {/* Download Alert */}
                    <div className="flex items-start gap-4 p-4 bg-muted border border-border rounded-2xl text-xs text-muted-foreground text-left">
                        <AlertCircle size={20} className="text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-foreground mb-1">Digitale Unterzeichnung</p>
                            <p className="leading-relaxed mb-3">
                                Lesen Sie die folgenden Dokumente und bestätigen Sie diese digital.
                            </p>
                            <div className="flex flex-col gap-2">
                                <a 
                                    href="/app/compliance/avv" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline group"
                                >
                                    <FileText size={14} />
                                    AVV-Muster lesen
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                                <a 
                                    href="/app/compliance/manual" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline group"
                                >
                                    <FileText size={14} />
                                    Betriebsanleitung (Art. 13 AI Act) lesen
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                                <a 
                                    href="/app/compliance/tom" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline group"
                                >
                                    <FileText size={14} />
                                    TOM (Sicherheitskatalog) einsehen
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Checkbox Section */}
                    <label 
                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                            isAccepted 
                                ? 'bg-primary/5 border-primary shadow-sm' 
                                : 'bg-white border-border hover:border-border'
                        }`}
                        onClick={() => handlers.toggleAccepted(!isAccepted)}
                    >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isAccepted ? 'bg-primary border-primary' : 'bg-white border-border'
                        }`}>
                            {isAccepted && <CheckCircle size={16} className="text-white" />}
                        </div>
                        <span className="flex-1 text-left text-xs font-bold text-foreground/80 leading-snug">
                            Ich akzeptiere den AVV sowie die Betriebsanleitung und TOM in der aktuellen Version.
                        </span>
                    </label>

                    {error && (
                        <p className="text-destructive text-xs font-bold mt-1 bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                            ⚠️ {error}
                        </p>
                    )}
                </div>

                <Button 
                    className="w-full py-7 text-lg font-black shadow-xl shadow-primary/20 gap-2 mb-2 rounded-2xl disabled:opacity-50 disabled:grayscale transition-all" 
                    disabled={!isAccepted || isProcessing}
                    onClick={handlers.executeConsent}
                >
                    {isProcessing ? (
                        <>Wird gespeichert... <Loader2 className="animate-spin" /></>
                    ) : (
                        <>Jetzt bestätigen <Shield size={20} /></>
                    )}
                </Button>
                
                <p className="text-xxs text-muted-foreground font-medium tracking-tighter">
                    Ihre Zustimmung wird kryptografisch (SHA-256) im Audit-Log archiviert.
                </p>
            </div>
        </div>
    );
};

export default AVVUploadModal;
