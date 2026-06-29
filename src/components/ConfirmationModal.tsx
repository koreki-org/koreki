import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-in fade-in duration-300"
            onClick={onCancel}
        >
            <div
                className="relative w-full max-w-[500px] bg-white rounded-hero p-8 shadow-glass border border-border animate-in zoom-in-95 duration-500 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-4 mb-6 text-primary">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                        <ShieldCheck size={28} />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
                </div>

                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 mb-8 flex items-start gap-4">
                    <AlertTriangle size={24} className="text-primary shrink-0 mt-0.5" />
                    <div className="text-sm font-medium text-foreground leading-relaxed">
                        {message}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={onCancel} className="px-6 font-semibold">
                        Abbrechen
                    </Button>
                    <Button onClick={onConfirm} className="px-6 font-bold shadow-lg shadow-primary/20">
                        Bestätigen
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
