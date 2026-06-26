import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck, GraduationCap, Calendar, Info, Printer } from 'lucide-react';
import { decodeFeedback, FeedbackData, parseStatus } from '@/lib/distribution';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Logo from '@/components/Logo';

export default function StudentFeedbackView() {
    const [data, setData] = useState<FeedbackData | null>(null);
    const [rawEncoded, setRawEncoded] = useState<string | null>(null);
    const [pin, setPin] = useState('');
    const [isPinRequired, setIsPinRequired] = useState(false);
    const [pinError, setPinError] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (!hash) {
            setError('Keine Feedback-Daten gefunden. Bitte scanne den QR-Code erneut.');
            setLoading(false);
            return;
        }
        setRawEncoded(hash);

        const decoded = decodeFeedback(hash);
        if (decoded) {
            if (decoded.pin) {
                setIsPinRequired(true);
            } else {
                setData(decoded);
            }
        } else {
            setError('Die Daten konnten nicht gelesen werden. Möglicherweise ist der Link beschädigt.');
        }
        setLoading(false);
    }, []);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rawEncoded) return;
        
        const decoded = decodeFeedback(rawEncoded);
        if (decoded && decoded.pin === pin) {
            setData(decoded);
            setIsPinRequired(false);
            setPinError(false);
        } else {
            setPinError(true);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-outfit">
                <div className="text-center animate-pulse">
                    <div className="mb-6 flex justify-center">
                        <Logo size={48} />
                    </div>
                    <p className="text-slate-600 font-medium">Lade dein Feedback...</p>
                </div>
            </div>
        );
    }

    if (error || (isPinRequired && !data)) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-outfit">
                {isPinRequired ? (
                    <Card className="max-w-md w-full border-none shadow-2xl overflow-hidden animate-fade-up">
                        <div className="bg-primary p-8 text-center text-white">
                            <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-90" />
                            <h1 className="text-2xl font-bold tracking-tight">Sicherheits-Check</h1>
                            <p className="text-primary-foreground/80 text-sm mt-2">
                                Bitte gib den 4-stelligen PIN von deinem Rückgabeschein ein.
                            </p>
                        </div>
                        <CardContent className="p-8">
                            <form onSubmit={handlePinSubmit} className="space-y-6">
                                <div className="flex justify-center gap-3">
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={4}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        placeholder="0000"
                                        className={`w-full text-center text-4xl font-extrabold tracking-[0.5em] py-4 bg-slate-50 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all ${
                                            pinError 
                                            ? 'border-red-200 focus:ring-red-100 text-red-500 animate-shake' 
                                            : 'border-slate-100 focus:ring-primary/10 focus:border-primary/20 text-slate-900'
                                        }`}
                                        autoFocus
                                    />
                                </div>
                                {pinError && (
                                    <p className="text-center text-red-500 text-xs font-bold uppercase tracking-wider animate-fade-in">
                                        Falscher PIN. Bitte prüfe die Angabe auf deinem Slip.
                                    </p>
                                )}
                                <Button 
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 border-none transition-all"
                                >
                                    Feedback anzeigen
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="max-w-md w-full border-red-100 shadow-xl overflow-hidden">
                        <div className="bg-red-50 p-4 flex justify-center">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <CardContent className="p-8 text-center">
                            <h1 className="text-xl font-bold text-slate-900 mb-2">Hoppla!</h1>
                            <p className="text-slate-600 mb-6">{error}</p>
                            <Button 
                                onClick={() => window.location.reload()}
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl font-bold shadow-sm border-none transition-all active:scale-95"
                            >
                                Erneut versuchen
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-outfit pb-12">
            <Head>
                <title>Koreki | Dein Feedback</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
            </Head>
 
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[100vw] h-[100vw] bg-indigo-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[100vw] h-[100vw] bg-blue-500/5 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8">
                <div className="mb-8 text-center animate-fade-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full mb-4">
                        <Logo size={14} />
                        <span className="text-xs font-extrabold uppercase tracking-widest">Digitales Feedback</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                        Koreki<span className="text-primary">.</span>
                    </h1>

                    <div className="flex items-center justify-center gap-4 text-slate-500 text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                            <GraduationCap size={16} className="text-slate-400" />
                            <span>{data.studentName}</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        {data.points !== undefined && data.maxPoints !== undefined && (
                            <>
                                <div className="flex items-center gap-1.5 text-primary font-bold">
                                    <span>{data.points} / {data.maxPoints} Pkt.</span>
                                </div>
                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            </>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Calendar size={16} className="text-slate-400" />
                            <span>{data.date}</span>
                        </div>
                    </div>
                </div>

                {/* Overall Feedback Card */}
                <Card className="mb-8 border-none shadow-glass bg-white/80 backdrop-blur-xl animate-fade-up print:shadow-none print:bg-white print:border print:border-slate-100">
                    <CardContent className="p-6">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Info size={16} /> Gesamtfeedback
                        </h2>
                        <p className="text-slate-700 leading-relaxed font-medium">
                            {data.overallFeedback}
                        </p>
                    </CardContent>
                </Card>

                <div className="space-y-4 mb-12">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 print:text-slate-900">Detaillierte Rückmeldung</h3>
                    {data.tasks.map((task, idx) => {
                        const { status, cleanText } = parseStatus(task.feedback);
                        return (
                            <Card key={task.id} className="border-none shadow-sm animate-fade-up overflow-hidden print:shadow-none print:border print:border-slate-100 print:break-inside-avoid">
                                <div className="flex">
                                    <div className={`w-1.5 shrink-0 ${
                                        status === 'r' ? 'bg-emerald-500' : 
                                        status === 'f' ? 'bg-red-500' : 
                                        status === 'Ff' ? 'bg-orange-400' : 
                                        'bg-slate-200'
                                    }`} />
                                    <CardContent className="p-5 flex-1 bg-white">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{task.id}</h4>
                                                {task.points !== undefined && task.maxPoints !== undefined && (
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                        Erreicht: <span className="text-primary">{task.points} / {task.maxPoints} Pkt.</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {status === 'r' && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-2 py-0.5 whitespace-nowrap"><CheckCircle2 size={12} className="mr-1" /> Richtig</Badge>}
                                                {status === 'f' && <Badge className="bg-red-50 text-red-700 border-red-100 font-bold px-2 py-0.5 whitespace-nowrap"><XCircle size={12} className="mr-1" /> Korrektur</Badge>}
                                                {status === 'Ff' && <Badge className="bg-orange-50 text-orange-700 border-orange-100 font-bold px-2 py-0.5 whitespace-nowrap"><AlertCircle size={12} className="mr-1" /> Folgefehler</Badge>}
                                            </div>
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed">{cleanText}</p>
                                    </CardContent>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Print Button & Privacy Footer */}
                <div className="text-center px-8 animate-fade-up">
                    <div className="flex flex-col items-center gap-6 mb-8 print:hidden">
                        <Button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-8 py-3 rounded-2xl font-bold shadow-xl border border-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Printer size={18} /> Feedback drucken
                        </Button>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 mb-4 shadow-sm">
                        <ShieldCheck size={18} />
                        <span className="text-sm font-bold">100% Sicher & Privat</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Dieses Feedback wurde lokal auf deinem Gerät entschlüsselt.<br />
                        Deine Daten wurden nicht auf Koreki-Servern gespeichert.
                    </p>
                    <div className="mt-8 pt-8 border-t border-slate-200/50">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.2em]">Powered by Koreki.org</p>
                    </div>
                </div>
            </div>

            {/* Global Print Styles for Student View */}
            <style jsx global>{`
                @media print {
                    .min-h-screen { background: white !important; padding: 0 !important; }
                    .max-w-2xl { max-width: none !important; width: 100% !important; padding: 0 !important; }
                    .shadow-glass, .shadow-sm { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
                    .animate-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
                    .bg-white\/80 { background: white !important; }
                    .fixed { display: none !important; }
                    .pb-12 { padding-bottom: 0 !important; }
                    .pt-8 { padding-top: 0 !important; }
                }
            `}</style>
        </div>
    );
}
