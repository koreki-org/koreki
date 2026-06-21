import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import AppLayout from '../layouts/AppLayout';
import { signinOidc } from '../lib/auth-keycloak';
import { isKeycloakAuth } from '../lib/env-context';

export default function Login() {
  const router = useRouter();
  const { userData, authLoading } = useAuth();
 
  // --- REDIRECT GUARD: If already logged in, go to App ---
  useEffect(() => {
    if (!authLoading && userData) {
      router.push('/app');
    }
  }, [userData, authLoading, router]);

  const handleLogin = () => {
    if (isKeycloakAuth()) {
      signinOidc();
    } else {
      window.location.href = '/api/logto/sign-in?redirectTo=/app';
    }
  };

  return (
    <AppLayout>
      <Head>
        <title>Login | Koreki</title>
      </Head>

      <div className="flex-grow flex items-center justify-center p-6 text-center">
        <div className="bg-white w-full max-w-[400px] p-10 rounded-2xl border border-slate-200 shadow-sm animate-fade-up">
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
          Willkommen zurück! Bitte verwenden Sie Ihren sicheren Account zum Anmelden.
        </p>

        <Button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto rounded-xl text-base font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5"
        >
          <LogIn size={20} />
          Mit Account anmelden
        </Button>

        <div className="mt-4">
          <Button
            variant="link"
            onClick={() => window.location.href = '/api/logto/forgot-password'}
            className="text-slate-400 hover:text-blue-600 transition-colors text-xs p-0 h-auto"
          >
            Passwort vergessen?
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <p className="text-sm text-slate-500 mb-4">Noch keinen Account?</p>
          <Button
            variant="link"
            onClick={() => router.push('/register')}
            className="text-blue-600 font-bold hover:text-blue-700 transition-colors p-0 h-auto"
          >
            Hier kostenlos registrieren
          </Button>
        </div>

        <div className="mt-6">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1">
            <ArrowLeft size={12} /> Zurück zur Startseite
          </Link>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}
