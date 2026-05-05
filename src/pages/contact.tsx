import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Mail, Send, CheckCircle2, AlertCircle, User, MessageSquare, Info, ShieldAlert } from 'lucide-react';
import MarketingLayout from '../layouts/MarketingLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { LEGAL_CONFIG } from '@/config/legal-contact';
import { getKorekiMode } from '@/lib/env-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSaas, setIsSaas] = useState(true);

    useEffect(() => {
        setIsSaas(getKorekiMode() === 'saas');
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Etwas ist schiefgelaufen.');
            }

            setStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message);
        }
    };

    if (!isSaas) {
        return (
            <MarketingLayout>
                <div className="max-w-4xl mx-auto px-8 py-24 text-center">
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-foreground mb-4 font-outfit">Kontaktformular deaktiviert</h1>
                    <p className="text-muted-foreground text-lg mb-8">
                        In der lokalen Community- oder Desktop-Edition ist das zentrale Kontaktformular deaktiviert. 
                        Bitte nutzen Sie für Support-Anfragen die offizielle Dokumentation oder das GitHub Repository.
                    </p>
                    <Link href="/" className={cn(buttonVariants({ variant: 'default' }), "rounded-full px-8")}>
                        Zurück zur Startseite
                    </Link>
                </div>
            </MarketingLayout>
        );
    }

    return (
        <MarketingLayout>
            <Head>
                <title>Kontakt | Koreki</title>
                <meta name="description" content="Haben Sie Fragen oder Feedback zu Koreki? Kontaktieren Sie uns über unser Formular." />
            </Head>

            <div className="max-w-4xl mx-auto px-8 pt-6 pb-12 md:pt-12 md:pb-24 animate-fade-in">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/10">
                        <Mail className="w-4 h-4" /> Kontakt
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 tracking-tighter font-outfit">
                        Wie können wir Ihnen <span className="text-primary">helfen?</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                        Egal ob technischer Support, Feedback zur KI oder Anfragen für Institutionen – wir freuen uns auf Ihre Nachricht.
                    </p>
                </div>

                <div className="grid md:grid-cols-5 gap-12 items-start">
                    {/* Contact Form */}
                    <div className="md:col-span-3">
                        <div className="bg-background rounded-2xl p-8 md:p-10 border border-border shadow-glass relative overflow-hidden transition-all duration-300">
                            {/* Subtle Decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 -z-0" />
                            
                            {status === 'success' ? (
                                <div className="text-center py-12 relative z-10 animate-fade-up">
                                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">Nachricht gesendet!</h2>
                                    <p className="text-muted-foreground mb-8">Vielen Dank für Ihre Anfrage. Wir werden uns so schnell wie möglich bei Ihnen melden.</p>
                                    <Button onClick={() => setStatus('idle')} variant="outline" className="rounded-xl transition-all duration-300">
                                        Weitere Nachricht senden
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-foreground/80 ml-1 flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" /> Name
                                            </label>
                                            <Input 
                                                name="name" 
                                                value={formData.name} 
                                                onChange={handleChange} 
                                                placeholder="Max Mustermann" 
                                                required 
                                                className="rounded-xl border-border focus:border-primary transition-all duration-300 h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-foreground/80 ml-1 flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-muted-foreground" /> E-Mail
                                            </label>
                                            <Input 
                                                type="email" 
                                                name="email" 
                                                value={formData.email} 
                                                onChange={handleChange} 
                                                placeholder="max@beispiel.de" 
                                                required 
                                                className="rounded-xl border-border focus:border-primary transition-all duration-300 h-12"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-foreground/80 ml-1 flex items-center gap-2">
                                            <Info className="w-4 h-4 text-muted-foreground" /> Betreff
                                        </label>
                                        <Input 
                                            name="subject" 
                                            value={formData.subject} 
                                            onChange={handleChange} 
                                            placeholder="Worum geht es?" 
                                            required 
                                            className="rounded-xl border-border focus:border-primary transition-all duration-300 h-12"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-foreground/80 ml-1 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-muted-foreground" /> Nachricht
                                        </label>
                                        <Textarea 
                                            name="message" 
                                            value={formData.message} 
                                            onChange={handleChange} 
                                            placeholder="Ihre Nachricht an uns..." 
                                            required 
                                            className="rounded-xl border-border focus:border-primary transition-all duration-300 min-h-[150px] pt-3"
                                        />
                                    </div>

                                    {status === 'error' && (
                                        <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-start gap-3 border border-destructive/20 text-sm animate-fade-up">
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <p>{errorMessage}</p>
                                        </div>
                                    )}

                                    <Button 
                                        type="submit" 
                                        disabled={status === 'loading'} 
                                        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-primary/20"
                                    >
                                        {status === 'loading' ? (
                                            <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                Nachricht senden <Send className="w-5 h-5" />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="md:col-span-2 space-y-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
                        <div className="bg-muted/30 rounded-2xl p-8 border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-4 font-outfit">Warum uns kontaktieren?</h3>
                            <ul className="space-y-4">
                                {[
                                    { title: 'Feedback', desc: 'Sagen Sie uns, was wir besser machen können.' },
                                    { title: 'Bugs', desc: 'Fehler im System? Wir beheben sie schnell.' },
                                    { title: 'Kooperation', desc: 'Interesse an einer Partnerschaft für Schulen?' },
                                ].map((item, i) => (
                                    <li key={i} className="flex gap-4">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-primary rounded-2xl p-8 text-primary-foreground shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02]">
                            <h3 className="text-lg font-bold mb-2 font-outfit">Lieber direkt?</h3>
                            <p className="text-primary-foreground/80 text-sm mb-6">Wir antworten normalerweise innerhalb von 24 Stunden.</p>
                            <a href={`mailto:${LEGAL_CONFIG.contact.email}`} className="flex items-center gap-3 font-bold hover:opacity-80 transition-all duration-300">
                                <div className="p-2 bg-white/10 rounded-lg"><Mail className="w-5 h-5" /></div>
                                {LEGAL_CONFIG.contact.email}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </MarketingLayout>
    );
}

// Helper for button variants if needed
const buttonVariants = ({ variant }: { variant: string }) => {
    if (variant === 'default') return 'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center font-bold h-10 px-4 py-2';
    return '';
};
