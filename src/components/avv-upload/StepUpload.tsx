import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/Button';

interface StepUploadProps {
    file: File | null;
    isUploading: boolean;
    isDragging: boolean;
    onBack: () => void;
    onUpload: () => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDragEvent: (isOver: boolean) => (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
}

export const StepUpload: React.FC<StepUploadProps> = ({
    file,
    isUploading,
    isDragging,
    onBack,
    onUpload,
    handleFileChange,
    handleDragEvent,
    handleDrop
}) => {
    return (
        <div className="w-full flex-1 flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div
                className={`flex-1 border-2 border-dashed rounded-hero p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 mb-6 ${file ? 'border-primary bg-primary/5' : (isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border hover:border-primary hover:bg-muted')}`}
                onClick={() => document.getElementById('avv-file')?.click()}
                onDragOver={handleDragEvent(true)}
                onDragLeave={handleDragEvent(false)}
                onDrop={handleDrop}
            >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-all ${file ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-white text-muted-foreground shadow-sm border border-border'}`}>
                    <Upload size={32} />
                </div>

                {file ? (
                    <div className="flex flex-col items-center text-center">
                        <span className="font-bold text-foreground mb-1">{file.name}</span>
                        <span className="text-xs font-medium text-muted-foreground px-3 py-1 bg-white rounded-full border border-border">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                ) : (
                    <>
                        <p className="font-bold text-foreground/80 mb-1">Klicken oder PDF hierher ziehen</p>
                        <p className="text-xs font-medium text-muted-foreground">Max. 10 MB, nur PDFs</p>
                    </>
                )}
                <input type="file" id="avv-file" className="hidden" accept=".pdf" onChange={handleFileChange} />
            </div>

            <div className="flex gap-4 w-full mt-auto">
                <Button 
                    variant="outline" 
                    className="flex-1 py-6 font-bold rounded-xl" 
                    onClick={onBack}
                    disabled={isUploading}
                >
                    Zurück
                </Button>
                <Button 
                    className="flex-[2] py-6 font-bold rounded-xl shadow-lg shadow-primary/20" 
                    disabled={!file || isUploading} 
                    onClick={onUpload}
                >
                    {isUploading ? 'Wird verarbeitet...' : 'Absenden & Aktivieren'}
                </Button>
            </div>
        </div>
    );
};
