/**
 * @jest-environment node
 *
 * Der Vertrag mit nodemailer — gegen die ECHTE Bibliothek
 * ✉️🤝
 *
 * Die Node-Umgebung oben ist Pflicht, nicht Geschmack: Die Testkette laeuft
 * standardmaessig unter jsdom, und dort fehlt `setImmediate`, das nodemailer
 * intern benutzt. Ohne die Zeile scheitert der Versandpfad mit einem
 * ReferenceError, der aussieht wie ein Bibliotheksfehler und keiner ist.
 *
 * WARUM DIESE DATEI EXISTIERT (07.10.2026)
 * ----------------------------------------
 * `contact-api.test.ts` mockt nodemailer vollstaendig weg
 * (`jest.mock('nodemailer', ...)`). Das ist dort richtig — geprueft wird die
 * Logik der Route, nicht der Mailversand. Es bedeutet aber: Beim
 * Versionssprung von nodemailer 9 auf 10 waeren alle Tests gruen geblieben,
 * auch wenn sich die API der Bibliothek geaendert haette. Der Mock antwortet
 * ja immer.
 *
 * Genau diese Fehlerklasse — ein Test, der aus dem falschen Grund gruen ist —
 * ist in diesem Projekt mehrfach aufgetreten. Deshalb fasst diese Datei die
 * echte Bibliothek an.
 *
 * WARUM OHNE SMTP-SERVER
 * ----------------------
 * nodemailer kennt `jsonTransport`: Die Nachricht wird vollstaendig gebaut —
 * Adressen geparst, Header gesetzt, Rumpf zusammengesetzt — und dann als JSON
 * zurueckgegeben statt verschickt. Damit laeuft derselbe Pfad, auf dem ein
 * API-Bruch auffallen wuerde, ohne Netz, ohne Zugangsdaten und ohne dass
 * irgendwo eine Mail ankommt.
 *
 * WAS DIESER TEST NICHT BEANTWORTET
 * ---------------------------------
 * Ob der echte SMTP-Server die Mail annimmt. Das haengt an Zugangsdaten und
 * Netz und gehoert nicht in die Testkette — es bleibt ein Handgriff vor dem
 * Release.
 */

import nodemailer from 'nodemailer';
import { contactSchema } from '@/lib/validation';

describe('nodemailer-Vertrag (echte Bibliothek, kein Versand)', () => {
    it('baut die Kontakt-Nachricht so, wie contact.ts sie uebergibt', async () => {
        const transporter = nodemailer.createTransport({ jsonTransport: true });

        // Dieselbe Form wie in src/pages/api/contact.ts — inklusive `replyTo`,
        // dem Feld mit Nutzereingabe.
        const info = await transporter.sendMail({
            to: 'support@example.com',
            from: 'noreply@example.com',
            replyTo: 'lehrkraft@example.com',
            subject: '[Koreki Kontakt] Testbetreff',
            text: 'Name: Max Mustermann\n\nNachricht:\nInhalt.',
            html: '<p>Inhalt.</p>'
        });

        expect(info).toBeDefined();
        const gebaut = JSON.parse((info as unknown as { message: string }).message);

        // Die Adressen muessen geparst sein — nicht bloss durchgereicht.
        expect(gebaut.to).toEqual([expect.objectContaining({ address: 'support@example.com' })]);
        expect(gebaut.replyTo).toEqual([expect.objectContaining({ address: 'lehrkraft@example.com' })]);
        expect(gebaut.subject).toBe('[Koreki Kontakt] Testbetreff');
        expect(gebaut.html).toContain('Inhalt.');
    });

    it('verlangt weiterhin `secure` und `auth` in der Form, die contact.ts nutzt', () => {
        // Kein Versand, nur der Aufbau: Bricht die Signatur von
        // createTransport, faellt das hier auf.
        const transporter = nodemailer.createTransport({
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: { user: 'u', pass: 'p' }
        });

        expect(typeof transporter.sendMail).toBe('function');
        expect(typeof transporter.verify).toBe('function');
    });

    it('nimmt eine Adresse an der Laengengrenze noch an', async () => {
        // Die Obergrenze in contactSchema ist der Riegel VOR dem Adressparser.
        // Dieser Fall prueft, dass die Grenze nicht so eng gesetzt ist, dass
        // sie etwas abweist, das nodemailer problemlos verarbeitet.
        const anDerGrenze = `${'a'.repeat(249)}@a.de`;
        expect(contactSchema.shape.email.safeParse(anDerGrenze).success).toBe(true);

        const transporter = nodemailer.createTransport({ jsonTransport: true });
        const info = await transporter.sendMail({
            to: 'support@example.com',
            from: 'noreply@example.com',
            replyTo: anDerGrenze,
            subject: 'Grenzfall',
            text: 'Inhalt.'
        });

        const gebaut = JSON.parse((info as unknown as { message: string }).message);
        expect(gebaut.replyTo).toEqual([expect.objectContaining({ address: anDerGrenze })]);
    });
});
