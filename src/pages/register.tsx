import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import AppLayout from '../layouts/AppLayout';

export default function Register() {
    const router = useRouter();
    const { userData, authLoading } = useAuth();

    // --- REDIRECT GUARD: If already logged in, go to App ---
    useEffect(() => {
        if (!authLoading && userData) {
            router.push('/app');
        }
    }, [userData, authLoading, router]);

    const handleLogtoSignUp = () => {
        window.location.href = '/api/logto/sign-up?redirectTo=/app';
    };

    return (
        <AppLayout>
            <Head>
                <title>Registrierung | Koreki</title>
            </Head>

            <div className="flex-grow flex items-center justify-center p-6 text-center">
                <div className="bg-white w-full max-w-[400px] p-10 rounded-[24px] border border-slate-200 shadow-sm animate-fade-up">
                <Link href="/">
                    <Logo
                        showText
                        textLarge
                        size={72}
                        className="mb-8 cursor-pointer hover:opacity-80 transition-opacity"
                        subtitle="Dein KI-Korrektur Assistent"
                    />
                </Link>

                <p className="mb-8 text-slate-500 text-sm">
                    Erstellen Sie jetzt Ihr sicheres Konto und starten Sie mit der automatischen Korrektur.
                </p>

                <Button
                    onClick={handleLogtoSignUp}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto rounded-xl text-base font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5"
                >
                    <UserPlus size={20} />
                    Jetzt Registrieren
                </Button>

                <div className="mt-8">
                    <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1">
                        <ArrowLeft size={12} /> Zurück zur Startseite
                    </Link>
                </div>
                </div>
            </div>
        </AppLayout>
    );
}
