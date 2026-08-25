import React from 'react';
import ConfirmationModal from './ConfirmationModal';
import { useConfirmStore } from '@/lib/confirm-dialog';

/**
 * Zeigt die Rueckfragen aus `useConfirmStore`.
 *
 * Einmal in `_app.tsx` montiert und sonst nirgends. Ohne diesen Wirt bliebe
 * jede Frage unbeantwortet — `askConfirmation` wartet auf ihn.
 */
export const ConfirmationHost: React.FC = () => {
    const request = useConfirmStore((state) => state.request);
    const answer = useConfirmStore((state) => state.answer);

    return (
        <ConfirmationModal
            isOpen={request !== null}
            title={request?.title ?? ''}
            message={request?.message ?? ''}
            onConfirm={() => answer(true)}
            onCancel={() => answer(false)}
        />
    );
};
