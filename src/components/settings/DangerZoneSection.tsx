import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DangerZoneSectionProps {
    onDelete: () => void;
    loading: boolean;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({ onDelete, loading }) => (
    <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6 relative overflow-hidden mb-6 group transition-colors hover:bg-red-50/50 hover:border-red-200">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 opacity-20 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <h3 className="text-sm font-bold text-red-600 mb-2 relative z-10 flex items-center gap-2">
            <AlertTriangle size={16} /> Danger Zone
        </h3>
        <p className="text-xs text-red-800/70 mb-5 relative z-10 leading-relaxed pr-6">
            Hier können Sie Ihr Konto dauerhaft löschen (DSGVO-konform). Alle Daten und verbleibenden Credits verfallen sofort.
        </p>
        <Button variant="destructive" className="w-full text-sm font-bold shadow-sm relative z-10" onClick={onDelete} disabled={loading}>
            {loading ? 'wird gelöscht...' : 'Konto unwiderruflich löschen'}
        </Button>
    </div>
);
