import handler from '@/pages/api/contact';

jest.mock('@/lib/logto', () => ({
    logtoClient: {
        withLogtoApiRoute: jest.fn((handler: any) => async (req: any, res: any) => {
            // Industrial Mock: Inject empty user context for public routes
            req.user = req.user || { isAuthenticated: false };
            return handler(req, res);
        })
    }
}));

// Der Name muss mit `mock` beginnen — sonst verbietet Jest die Referenz in der
// hochgezogenen Modul-Fabrik.
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

jest.mock('nodemailer', () => ({
    __esModule: true,
    default: { createTransport: () => mockCreateTransport() },
    createTransport: () => mockCreateTransport(),
}));

// Mock the environment variables
process.env.SMTP_HOST = 'smtp.example.com';
process.env.SMTP_USER = 'test-user';
process.env.SMTP_PASS = 'test-pass';

describe('Contact API Integration (Layer 2)', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    it('should return 405 for non-POST requests', async () => {
        req = { method: 'GET' };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    it('should return 400 for invalid data', async () => {
        req = {
            method: 'POST',
            body: {
                name: 'A', // Too short
                email: 'invalid',
                subject: 'Hi',
                message: 'Short'
            },
            headers: { 'x-forwarded-for': '1.2.3.4' },
            socket: {}
        };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
    });

    it('should send an email and return 200 for valid data', async () => {
        req = {
            method: 'POST',
            body: {
                name: 'Max Mustermann',
                email: 'max@example.com',
                subject: 'Test Subject',
                message: 'This is a test message that is long enough.'
            },
            headers: { 'x-forwarded-for': '1.2.3.5' },
            socket: {}
        };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockSendMail).toHaveBeenCalled();
    });

    it('should answer the sender via replyTo, not via the From header', async () => {
        req = {
            method: 'POST',
            body: {
                name: 'Max Mustermann',
                email: 'max@example.com',
                subject: 'Test Subject',
                message: 'This is a test message that is long enough.'
            },
            headers: { 'x-forwarded-for': '1.2.3.7' },
            socket: {}
        };
        await handler(req, res);
        // Der Absender muss die eigene, authentifizierte Domain bleiben. Stuende
        // dort die Adresse des Einsenders, wuerde der Relay die Mail ablehnen.
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            replyTo: 'max@example.com',
            from: expect.not.stringContaining('max@example.com'),
        }));
    });

    it('should strip line breaks from the subject before it becomes a header', async () => {
        req = {
            method: 'POST',
            body: {
                name: 'Max Mustermann',
                email: 'max@example.com',
                subject: 'Hallo\r\nBcc: opfer@example.com',
                message: 'This is a test message that is long enough.'
            },
            headers: { 'x-forwarded-for': '1.2.3.8' },
            socket: {}
        };
        await handler(req, res);
        const sent = mockSendMail.mock.calls[0][0];
        expect(sent.subject).not.toMatch(/[\r\n]/);
    });

    it('should return 500 if the SMTP configuration is incomplete', async () => {
        const originalPass = process.env.SMTP_PASS;
        delete process.env.SMTP_PASS;

        req = {
            method: 'POST',
            body: {
                name: 'Max Mustermann',
                email: 'max@example.com',
                subject: 'Test Subject',
                message: 'This is a test message that is long enough.'
            },
            headers: { 'x-forwarded-for': '1.2.3.6' },
            socket: {}
        };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Mail service not configured'
        }));

        process.env.SMTP_PASS = originalPass;
    });

    it('should trigger rate limiting after multiple requests', async () => {
        const uniqueIp = '1.2.3.99';
        req = {
            method: 'POST',
            body: {
                name: 'Max Mustermann',
                email: 'max@example.com',
                subject: 'Test Subject',
                message: 'This is a test message that is long enough.'
            },
            headers: { 'x-forwarded-for': uniqueIp },
            socket: {}
        };

        // Send 10 requests (limit for AI/Sensitive is 10)
        for (let i = 0; i < 10; i++) {
            await handler(req, res);
            expect(res.status).not.toHaveBeenCalledWith(429);
        }

        // 11th request should be blocked
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(429);
    });
});
