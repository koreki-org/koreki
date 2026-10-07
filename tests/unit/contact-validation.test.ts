import { contactSchema } from '@/lib/validation';

describe('Contact Form Validation (Layer 1)', () => {
    it('should validate a correct contact payload', () => {
        const payload = {
            name: 'Max Mustermann',
            email: 'max@example.com',
            subject: 'Test Subject',
            message: 'This is a test message that is long enough.'
        };
        const res = contactSchema.safeParse(payload);
        expect(res.success).toBe(true);
    });

    it('should fail if name is too short', () => {
        const payload = {
            name: 'A',
            email: 'max@example.com',
            subject: 'Test Subject',
            message: 'This is a test message that is long enough.'
        };
        const res = contactSchema.safeParse(payload);
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues[0].message).toBe('Name ist zu kurz');
        }
    });

    it('should fail if email is invalid', () => {
        const payload = {
            name: 'Max Mustermann',
            email: 'invalid-email',
            subject: 'Test Subject',
            message: 'This is a test message that is long enough.'
        };
        const res = contactSchema.safeParse(payload);
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues[0].message).toBe('Ungültige E-Mail-Adresse');
        }
    });

    it('should fail if subject is too short', () => {
        const payload = {
            name: 'Max Mustermann',
            email: 'max@example.com',
            subject: 'Hi',
            message: 'This is a test message that is long enough.'
        };
        const res = contactSchema.safeParse(payload);
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues[0].message).toBe('Betreff ist zu kurz');
        }
    });

    it('should fail if message is too short', () => {
        const payload = {
            name: 'Max Mustermann',
            email: 'max@example.com',
            subject: 'Test Subject',
            message: 'Short'
        };
        const res = contactSchema.safeParse(payload);
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues[0].message).toBe('Nachricht ist zu kurz');
        }
    });

    /**
     * Obergrenzen — der Riegel vor dem Adressparser
     * 🧯
     *
     * Bis zum 07.10.2026 hatte kein Feld eine Obergrenze. Die untere Schranke
     * allein ist hier wertlos: Der Endpunkt ist anonym erreichbar, und
     * `contact.ts` reicht `email` als `replyTo` an nodemailer weiter, dessen
     * Adressparser quadratisch laeuft. Eine lange, formal gueltige Adresse
     * kam durch — `z.string().email()` prueft die FORM, nicht die LAENGE.
     *
     * Die Faelle unten pruefen deshalb nicht "Zod funktioniert", sondern dass
     * die Grenze an JEDEM der vier Felder haengt. Genau die Asymmetrie — die
     * Regel gilt an drei Feldern und fehlt am vierten — ist die wiederkehrende
     * Fehlerklasse dieses Projekts.
     */
    const gueltig = {
        name: 'Max Mustermann',
        email: 'max@example.com',
        subject: 'Test Subject',
        message: 'This is a test message that is long enough.'
    };

    it.each([
        ['name', 'name', 101, 'Name ist zu lang'],
        ['subject', 'subject', 201, 'Betreff ist zu lang'],
        ['message', 'message', 5001, 'Nachricht ist zu lang']
    ])('should fail if %s exceeds its upper bound', (_label, feld, laenge, meldung) => {
        const res = contactSchema.safeParse({ ...gueltig, [feld as string]: 'a'.repeat(laenge as number) });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues.map(i => i.message)).toContain(meldung);
        }
    });

    it('should fail if the email address exceeds the RFC 5321 forward-path limit', () => {
        // Formal gueltig, nur zu lang: 250 Zeichen lokaler Teil + '@a.de' = 255.
        const zuLang = `${'a'.repeat(250)}@a.de`;
        expect(zuLang.length).toBeGreaterThan(254);

        const res = contactSchema.safeParse({ ...gueltig, email: zuLang });
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues.map(i => i.message)).toContain('E-Mail-Adresse ist zu lang');
        }
    });

    it('should still accept an address at exactly the limit', () => {
        // Die Grenze darf nicht zu streng sein: 249 + '@a.de' = genau 254.
        const genauAnDerGrenze = `${'a'.repeat(249)}@a.de`;
        expect(genauAnDerGrenze.length).toBe(254);

        const res = contactSchema.safeParse({ ...gueltig, email: genauAnDerGrenze });
        expect(res.success).toBe(true);
    });
});
