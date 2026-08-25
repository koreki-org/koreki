import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { useDialogA11y } from '@/hooks/useDialogA11y';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
}

const TITLE_ID = 'confirmation-modal-title';
const MESSAGE_ID = 'confirmation-modal-message';

/**
 * Rueckfrage vor einer folgenreichen Aktion.
 *
 * Anders als das Onboarding-Modal ist dieser Dialog schliessbar — es gibt einen
 * Abbruch-Weg, also muss er auch ueber Escape und den Backdrop erreichbar sein.
 * Deshalb der eigene Escape-Handler: `useDialogA11y` liefert bewusst keinen,
 * weil er auch blockierende Dialoge bedient.
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel
}) => {
    const { mounted, dialogRef } = useDialogA11y<HTMLDivElement>(isOpen);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancel();
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onCancel]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-fade-in"
            onClick={onCancel}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={TITLE_ID}
                aria-describedby={MESSAGE_ID}
                tabIndex={-1}
                className="relative w-full max-w-[500px] bg-white rounded-hero p-8 shadow-glass border border-border overflow-hidden focus:outline-none"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-4 mb-6 text-primary">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldCheck size={28} />
                    </div>
                    <h2 id={TITLE_ID} className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
                </div>

                <div className="bg-primary/5 p-5 rounded-xl border border-primary/20 mb-8 flex items-start gap-4">
                    <AlertTriangle size={24} className="text-primary shrink-0 mt-0.5" />
                    <div id={MESSAGE_ID} className="text-sm font-medium text-foreground leading-relaxed">
                        {message}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={onCancel} className="px-6 font-semibold">
                        Abbrechen
                    </Button>
                    <Button data-testid="bestaetigen" onClick={onConfirm} className="px-6 font-bold shadow-lg shadow-primary/20">
                        Bestätigen
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
