import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Check, Loader2, HelpCircle, Award, MessageSquare, Send, Scale, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { MathMarkdown } from '@/components/ui/MathMarkdown';

interface SecondOpinionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    taskName: string;
    studentText: string;
    currentPoints: number;
    maxPoints: number;
    currentFeedback: string;
    onApply: (suggestedPoints: number, suggestedFeedback: string) => void;
    onSubmit: (teacherDoubt: string, chatHistory?: ChatMessage[]) => Promise<any>;
    isSaaSService: boolean;
}

interface DisplayMessage {
    role: 'user' | 'assistant';
    content: string;
    cleanContent: string;
}

export const SecondOpinionDrawer: React.FC<SecondOpinionDrawerProps> = ({
    isOpen,
    onClose,
    taskName,
    studentText,
    currentPoints,
    maxPoints,
    currentFeedback,
    onApply,
    onSubmit,
    isSaaSService
}) => {
    const [messages, setMessages] = React.useState<DisplayMessage[]>([]);
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [activeProposal, setActiveProposal] = React.useState<{ points: number; feedback: string } | null>(null);
    const chatEndRef = React.useRef<HTMLDivElement>(null);

    // Initialisiere die Besprechung mit einer freundlichen Begrüßung durch Koreki
    React.useEffect(() => {
        if (isOpen) {
            const welcomeText = `Hallo! Ich bin Koreki, dein kollegialer Assistent für die Korrektur. 

Ich habe mir die Aufgabe **"${taskName}"** und die Schülerantwort angesehen. Bisher hast du **${currentPoints} von ${maxPoints} Punkten** vergeben.

Wo genau hast du Zweifel oder wo soll ich dir helfen? Frag mich z.B.:
* *"Ist diese Formulierung fachlich noch als richtig zu werten?"*
* *"Der Rechenweg stimmt, aber das Ergebnis ist falsch. Welcher Abzug ist angemessen?"*
* *"Schreibe mir ein motivierendes, aber präzises Schüler-Feedback."*`;

            setMessages([
                {
                    role: 'assistant',
                    content: welcomeText,
                    cleanContent: welcomeText
                }
            ]);
            setActiveProposal(null);
            setError(null);
            setLoading(false);
            setInput('');
        }
    }, [isOpen, taskName, currentPoints, maxPoints]);

    // Automatisches Herunterscrollen im Chat
    React.useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    if (!isOpen || typeof window === 'undefined') return null;

    // Parser für das <grading_proposal> XML Tag
    const parseProposal = (text: string): { points: number; feedback: string; cleanText: string } | null => {
        const regex = /<grading_proposal\s+points="([\d.,]+)">([\s\S]*?)<\/grading_proposal>/i;
        const match = text.match(regex);
        if (match) {
            const points = parseFloat(match[1].replace(',', '.'));
            const feedback = match[2].trim();
            const cleanText = text.replace(regex, '').trim();
            return { points, feedback, cleanText };
        }
        return null;
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const cleanInput = input.trim();
        if (!cleanInput || loading) return;

        setError(null);
        setLoading(true);
        setInput('');

        // 1. Füge Benutzer-Nachricht dem Verlauf hinzu
        const userMsg: DisplayMessage = {
            role: 'user',
            content: cleanInput,
            cleanContent: cleanInput
        };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);

        try {
            // 2. Sende Chatverlauf an das Backend
            // Transformiere zu API-Typen ChatMessage[]
            const payloadHistory = updatedMessages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const data = await onSubmit(cleanInput, payloadHistory);

            if (data && data.response) {
                const aiResponseText = data.response;
                
                // 3. Scanne nach XML Noten-Vorschlag
                const proposalMatch = parseProposal(aiResponseText);
                let cleanText = aiResponseText;

                if (proposalMatch) {
                    cleanText = proposalMatch.cleanText;
                    setActiveProposal({
                        points: proposalMatch.points,
                        feedback: proposalMatch.feedback
                    });
                }

                // 4. Füge KI-Antwort hinzu
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: aiResponseText,
                        cleanContent: cleanText
                    }
                ]);
            } else {
                throw new Error('Ungültiges Antwortformat vom KI-Service.');
            }
        } catch (err: any) {
            console.error('[SecondOpinionDrawer] Chat error:', err);
            setError(err.message || 'Verbindung zum KI-Dienst fehlgeschlagen. Bitte versuche es erneut.');
            // Entferne die letzte Benutzernachricht bei Fehler, damit der Verlauf sauber bleibt
            setMessages(prev => prev.slice(0, -1));
            setInput(cleanInput); // Gib dem Nutzer seinen Text zurück
        } finally {
            setLoading(false);
        }
    };

    const renderFormattedText = (text: string) => {
        return text.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
                {line}
                {idx < text.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    // Prüft, ob es sich um eine kostenlose Folgefrage handelt
    const isFollowUp = messages.filter(m => m.role === 'user').length >= 1;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-md animate-in fade-in duration-300">


            {/* Backdrop (Accidental close protection) */}
            <div className="absolute inset-0" />

            {/* Modal Body Panel */}
            <div className={cn(
                "relative bg-background border border-border/80 shadow-2xl rounded-hero max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden",
                "animate-in zoom-in-95 duration-300"
            )}>
                {/* Header Section */}
                <div className="px-4 sm:px-8 py-4 sm:pt-8 sm:pb-4 flex justify-between items-center border-b border-border/50 bg-background/50 backdrop-blur shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-background rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-border overflow-hidden shrink-0">
                            <img src="/logo.png" alt="Koreki Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 text-left">
                            <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight truncate font-outfit flex items-center gap-2">
                                Mit Koreki besprechen
                                <span className="hidden sm:inline-block text-xs font-bold bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                                    Copilot
                                </span>
                            </h2>
                            <p className="text-xxs sm:text-sm text-muted-foreground font-medium italic truncate">Dialogische Zweitmeinung &amp; Feedback-Optimierung</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted shrink-0" onClick={onClose} disabled={loading}>
                        <X size={24} />
                    </Button>
                </div>

                {/* Main Interactive Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[65vh]">
                    
                    {/* Left Column: Context & live suggestions (5 columns) */}
                    <div className="lg:col-span-5 border-r border-border/50 bg-muted/20 p-5 flex flex-col gap-4 overflow-y-auto">
                        
                        {/* Task info card */}
                        <div className="bg-background border border-border/50 rounded-xl p-4 space-y-3 shadow-xs">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-outfit">Kompakter Kontext</span>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-foreground font-outfit leading-tight">{taskName}</p>
                                <p className="text-xs text-primary font-bold">Maximal {maxPoints} P. | Aktuell: {currentPoints} P.</p>
                            </div>
                            <div className="pt-2 border-t border-border/30">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-outfit block mb-1">Schülerantwort (Auszug)</span>
                                <p className="text-sm text-muted-foreground font-inter italic line-clamp-3 leading-relaxed">
                                    &quot;{studentText}&quot;
                                </p>
                            </div>
                        </div>

                        {/* Live XML suggestion display */}
                        <div className="flex-1 flex flex-col">
                            <div className={cn(
                                "flex-1 rounded-xl border p-5 flex flex-col justify-between gap-4 transition-all duration-300",
                                activeProposal 
                                    ? "border-primary/20 bg-primary/5 shadow-xs" 
                                    : "border-dashed border-border/60 bg-transparent justify-center items-center text-center p-8"
                            )}>
                                {activeProposal ? (
                                    <div className="flex flex-col h-full justify-between gap-4 animate-in fade-in duration-500">
                                        <div className="space-y-3.5">
                                            <div className="flex items-center justify-between pb-2 border-b border-primary/10">
                                                <span className="text-xs font-bold text-primary uppercase tracking-widest font-outfit flex items-center gap-1.5">
                                                    <Award size={14} /> Aktueller Vorschlag
                                                </span>
                                                <span className="text-sm font-black bg-primary text-primary-foreground rounded-lg px-2.5 py-0.5 font-outfit">
                                                    {activeProposal.points} / {maxPoints} P.
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-1.5">
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-outfit block">Empfohlenes Feedback:</span>
                                                <div className="text-sm text-foreground font-inter leading-relaxed whitespace-pre-wrap max-h-[160px] overflow-y-auto bg-background/50 p-3.5 rounded-lg border border-border/40">
                                                    {activeProposal.feedback}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => {
                                                onApply(activeProposal.points, activeProposal.feedback);
                                                onClose();
                                            }}
                                            className="w-full font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 shadow-md text-sm flex items-center justify-center gap-1.5 transition-all"
                                        >
                                            <Check size={14} />
                                            Vorschlag übernehmen
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-w-[220px]">
                                        <div className="mx-auto w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                                            <Scale size={20} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-foreground font-outfit">Noch kein Vorschlag</p>
                                            <p className="text-xs text-muted-foreground leading-normal font-inter">
                                                Diskutiere mit der KI. Sobald ein konkreter Notenvorschlag generiert wird, erscheint er hier zur Übernahme.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Dynamic interactive Chat (7 columns) */}
                    <div className="lg:col-span-7 flex flex-col overflow-hidden bg-background">
                        
                        {/* Conversation Thread */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex flex-col max-w-[85%] animate-in fade-in duration-300",
                                        msg.role === 'user' ? "ml-auto items-end" : "items-start"
                                    )}
                                >
                                    <span className="text-xs text-muted-foreground font-bold font-outfit mb-1 px-1">
                                        {msg.role === 'user' ? 'Du' : 'Koreki'}
                                    </span>
                                    <div
                                        className={cn(
                                            "p-3.5 rounded-2xl text-sm font-inter leading-relaxed",
                                            msg.role === 'user'
                                                ? "bg-primary text-primary-foreground rounded-tr-none shadow-xs whitespace-pre-wrap"
                                                : "bg-muted/60 border border-border/40 text-foreground rounded-tl-none"
                                        )}
                                    >
                                        {msg.role === 'user' ? (
                                            renderFormattedText(msg.cleanContent)
                                        ) : (
                                            <MathMarkdown content={msg.cleanContent} className="text-sm text-foreground" />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Loading / ChatGPT-style pulsing dots */}
                            {loading && (
                                <div className="flex flex-col items-start max-w-[85%] animate-in fade-in duration-300">
                                    <span className="text-xs text-muted-foreground font-bold font-outfit mb-1 px-1">
                                        Koreki schreibt...
                                    </span>
                                    <div className="bg-muted/60 border border-border/40 text-foreground rounded-2xl rounded-tl-none py-3 px-4 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full chatgpt-dot" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full chatgpt-dot" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full chatgpt-dot" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-xs text-destructive font-inter leading-normal">
                                    ⚠️ {error}
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Message Input Form */}
                        <form onSubmit={handleSendMessage} className="border-t border-border/60 p-4 bg-muted/20 flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Mit Koreki besprechen..."
                                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground/90 font-inter focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/20 transition-all h-10"
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={loading || !input.trim()}
                                    className="rounded-xl h-[34px] w-[34px] p-0 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-xs flex items-center justify-center transition-all disabled:opacity-50"
                                >
                                    <Send size={14} />
                                </Button>
                            </div>
                            
                            {/* Billing & disclaimer info */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground font-inter px-1">
                                <span>
                                    {isSaaSService ? (
                                        isFollowUp ? (
                                            <span className="text-success font-bold flex items-center gap-0.5">
                                                <ChevronRight size={12} /> Folgefrage kostenlos (0 Credits)
                                            </span>
                                        ) : (
                                            <span>* Startet die Besprechung (1 Credit flat)</span>
                                        )
                                    ) : (
                                        <span>* Offline/Community Modus (0 Credits)</span>
                                    )}
                                </span>
                                <span>Änderungen erst wirksam bei Klick auf Übernehmen</span>
                            </div>
                        </form>

                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
};
