import type { AppProps } from 'next/app';
import '../styles/globals.css';
import 'katex/dist/katex.min.css';

import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmationHost } from '../components/ConfirmationHost';
import { ToastHost } from '../components/ToastHost';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false, // Prevents annoying refetching when switching tabs
            retry: 1,
        },
    },
});

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <Head>
                <link rel="icon" href="/favicon.png?v=1.0.1" />
            </Head>
            <Component {...pageProps} />
            <ConfirmationHost />
            {/* NACH dem Dialog-Wirt: bei gleicher Stapelebene entscheidet die
                Reihenfolge im Dokument, und eine Meldung, die ein Dialog
                ausgeloest hat, muss ueber ihm liegen. */}
            <ToastHost />
        </QueryClientProvider>
    );
}

export default MyApp;
