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
});
