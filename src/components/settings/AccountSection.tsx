import React from 'react';
import { User, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AccountSectionProps {
    username: string;
    role: string;
    inviteCode: string;
    setInviteCode: (v: string) => void;
    onJoin: () => void;
    joinLoading: boolean;
}

export const AccountSection: React.FC<AccountSectionProps> = ({ 
    username, 
    role, 
    inviteCode, 
    setInviteCode, 
    onJoin, 
    joinLoading 
}) => (
    <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700">Aktueller Account</h3>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between mb-8">
            <span className="text-sm font-semibold text-slate-600 truncate mr-2">{username}</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-md">{role}</span>
        </div>

        <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
                <KeyRound size={18} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">Einem Institut beitreten</h3>
            </div>
            <div className="flex gap-2">
                <Input placeholder="JOIN-ABC123..." value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="h-10 text-sm font-mono uppercase" />
                <Button onClick={onJoin} disabled={joinLoading || !inviteCode} className="h-10 px-6 font-bold">
                    {joinLoading ? <Loader2 size={16} className="animate-spin" /> : 'Beitreten'}
                </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic leading-relaxed">
                * Hiermit werden Sie Mitglied des gewählten Instituts und nutzen dessen Kontingent.
            </p>
        </div>
    </div>
);
