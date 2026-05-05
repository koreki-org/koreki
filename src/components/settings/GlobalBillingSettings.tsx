import React, { useState } from 'react';
import { Shield, TrendingUp, Users, Info, CreditCard, Layers } from 'lucide-react';
import { AppSettings, DbUser } from '@/types';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { calculateUserCost, formatEuro } from '@/lib/billing-logic';

interface GlobalBillingSettingsProps {
    settings: AppSettings;
    users: DbUser[];
    onSave: (updates: Partial<AppSettings>) => void;
}

export const GlobalBillingSettings: React.FC<GlobalBillingSettingsProps> = ({ settings, users, onSave }) => {
    // Local state for input values to prevent jumping cursor/decimal issues
    const [localInputs, setLocalInputs] = useState<Record<string, string>>({});

    const handleLocalChange = (key: string, value: string) => {
        setLocalInputs(prev => ({ ...prev, [key]: value }));
        const numValue = parseFloat(value.replace(',', '.'));
        if (!isNaN(numValue)) {
            onSave({ [key]: numValue });
        }
    };

    const getValue = (key: keyof AppSettings) => {
        if (localInputs[key] !== undefined) return localInputs[key];
        return settings[key]?.toString() || '0';
    };

    // Calculate system-wide totals
    const systemCosts = users.reduce((acc, user) => {
        const cost = calculateUserCost(user, settings);
        return {
            ocr: acc.ocr + cost.ocr,
            ki: acc.ki + cost.ki,
            total: acc.total + cost.total
        };
    }, { ocr: 0, ki: 0, total: 0 });

    return (
        <div className="space-y-8 animate-fade-in">
            {/* 1. Global Rates Section */}
            <Card className="border-border/50 shadow-glass backdrop-blur-glass overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Shield className="text-primary w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-outfit font-bold">Abrechnung & Budgets</CardTitle>
                                <p className="text-xs text-muted-foreground">Konfiguration der Token-Preise und monatlichen Limits</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* OCR Pricing */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                <span>OCR-Modul (Tokens)</span>
                                <div className="h-px flex-1 bg-slate-100" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Input Preis / 1M (€)</label>
                                    <Input 
                                        type="text"
                                        placeholder="0.00"
                                        value={getValue('ocrInputCostPerMillion')}
                                        onChange={e => handleLocalChange('ocrInputCostPerMillion', e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Output Preis / 1M (€)</label>
                                    <Input 
                                        type="text"
                                        placeholder="0.00"
                                        value={getValue('ocrOutputCostPerMillion')}
                                        onChange={e => handleLocalChange('ocrOutputCostPerMillion', e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Monatliches OCR-Budget (€)</label>
                                <Input 
                                    type="text"
                                    placeholder="100"
                                    value={getValue('ocrBudget')}
                                    onChange={e => handleLocalChange('ocrBudget', e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* KI Pricing */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                <span>KI-Korrektur (Tokens)</span>
                                <div className="h-px flex-1 bg-slate-100" />
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Input Preis / 1M (€)</label>
                                    <Input 
                                        type="text"
                                        placeholder="0.00"
                                        value={getValue('correctionInputCostPerMillion')}
                                        onChange={e => handleLocalChange('correctionInputCostPerMillion', e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Output Preis / 1M (€)</label>
                                    <Input 
                                        type="text"
                                        placeholder="0.00"
                                        value={getValue('correctionOutputCostPerMillion')}
                                        onChange={e => handleLocalChange('correctionOutputCostPerMillion', e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Monatliches KI-Budget (€)</label>
                                <Input 
                                    type="text"
                                    placeholder="100"
                                    value={getValue('correctionBudget')}
                                    onChange={e => handleLocalChange('correctionBudget', e.target.value)} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
                        <Info className="text-primary w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600 leading-relaxed">
                            <span className="font-bold text-primary uppercase mr-1">Hinweis:</span> 
                            Die Kosten werden in Echtzeit berechnet. Wenn die Preise auf 0 stehen, werden in der Analyse unten keine Kosten ausgewiesen, auch wenn Tokens verbraucht wurden.
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. User Analysis Section */}
            <Card className="border-border/50 shadow-glass backdrop-blur-glass overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Users className="text-blue-500 w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-outfit font-bold">Nutzer-Kosten-Analyse</CardTitle>
                                <p className="text-xs text-muted-foreground">Individuelle Verbrauchsdaten und Kostenäquivalente</p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100">
                            System Gesamt: {formatEuro(systemCosts.total)}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-border/40">
                                    <th className="px-6 py-4 font-black">Nutzer</th>
                                    <th className="px-4 py-4 font-black text-right">OCR (Euro)</th>
                                    <th className="px-4 py-4 font-black text-right">KI (Euro)</th>
                                    <th className="px-6 py-4 font-black text-right">Gesamt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400 font-medium italic">
                                            Keine Nutzerdaten verfügbar
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(user => {
                                        const costs = calculateUserCost(user, settings);
                                        return (
                                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors duration-200 group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                                                            {user.username || user.email || 'Unbekannt'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            ID: {user.id.slice(-8)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-bold text-slate-700">{formatEuro(costs.ocr)}</span>
                                                        <div className="text-[9px] text-slate-500 font-medium flex flex-col items-end gap-0.5 mt-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-slate-400">In:</span> 
                                                                <span>{formatEuro(costs.ocrInput)}</span>
                                                                <span className="text-slate-300">({(user.ocrInputTokens / 1000).toFixed(1)}k)</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-slate-400">Out:</span> 
                                                                <span>{formatEuro(costs.ocrOutput)}</span>
                                                                <span className="text-slate-300">({(user.ocrOutputTokens / 1000).toFixed(1)}k)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-bold text-slate-700">{formatEuro(costs.ki)}</span>
                                                        <div className="text-[9px] text-slate-500 font-medium flex flex-col items-end gap-0.5 mt-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-slate-400">In:</span> 
                                                                <span>{formatEuro(costs.kiInput)}</span>
                                                                <span className="text-slate-300">({(user.correctionInputTokens / 1000).toFixed(1)}k)</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-slate-400">Out:</span> 
                                                                <span>{formatEuro(costs.kiOutput)}</span>
                                                                <span className="text-slate-300">({(user.correctionOutputTokens / 1000).toFixed(1)}k)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Badge variant="outline" className="font-outfit font-bold border-primary/20 text-primary bg-primary/5">
                                                        {formatEuro(costs.total)}
                                                    </Badge>
                                                </td>

                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

};
