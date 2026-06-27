import React from 'react';
import { AlertCircle, FileText, ExternalLink, Upload } from 'lucide-react';
import { Button } from '../ui/Button';

interface StepDownloadProps {
    isOrganization: boolean;
    onNext: () => void;
}

export const StepDownload: React.FC<StepDownloadProps> = ({ isOrganization, onNext }) => {
    return (
        <div className="w-full flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start gap-4 p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl text-[11px] text-blue-800 text-left mb-5">
                <AlertCircle size={24} className="text-blue-500 shrink-0" />
                <p className="leading-relaxed">
                    {isOrganization 
                      ? 'Laden Sie unser Muster für Ihr Institut herunter, lassen Sie es von der Schulleitung unterzeichnen und laden Sie es hier hoch.'
                      : 'Laden Sie unser Muster herunter, lassen Sie es von Ihrer Schulleitung unterzeichnen und laden den Scan im nächsten Schritt wieder hoch.'
                    }
                </p>
            </div>

            <a 
                href="/app/compliance/avv" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-hero decoration-transparent hover:border-blue-600 hover:bg-blue-50 transition-all duration-300 mb-8"
            >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:shadow-md transition-all">
                    <FileText size={24} />
                </div>
                <div className="flex-1 text-left">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">AVV_Muster_Koreki.pdf</h3>
                    <span className="text-xs font-medium text-slate-500 group-hover:text-blue-600/70">Herunterladen & Signieren</span>
                </div>
                <ExternalLink size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
            </a>

            <Button className="w-full py-6 font-bold shadow-lg shadow-primary/20 gap-2 mt-auto" onClick={onNext}>
                Ich habe das Dokument unterzeichnet <Upload size={18} />
            </Button>
        </div>
    );
};
