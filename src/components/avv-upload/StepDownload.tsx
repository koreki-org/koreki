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
            <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl text-xs text-primary text-left mb-5">
                <AlertCircle size={24} className="text-primary shrink-0" />
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
                className="group flex items-center gap-4 p-6 bg-muted border-2 border-dashed border-border rounded-hero decoration-transparent hover:border-primary hover:bg-primary/10 transition-all duration-300 mb-8"
            >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:shadow-md transition-all">
                    <FileText size={24} />
                </div>
                <div className="flex-1 text-left">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">Auftragsverarbeitungsvertrag (AVV)</h3>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary/70">Ansehen, ausdrucken und unterzeichnen</span>
                </div>
                <ExternalLink size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </a>

            <Button className="w-full py-6 font-bold shadow-lg shadow-primary/20 gap-2 mt-auto" onClick={onNext}>
                Ich habe das Dokument unterzeichnet <Upload size={18} />
            </Button>
        </div>
    );
};
