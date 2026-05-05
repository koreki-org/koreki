import handler from '@/pages/api/contact';
import sgMail from '@sendgrid/mail';

jest.mock('@/lib/logto', () => ({
    logtoClient: {
        withLogtoApiRoute: jest.fn((handler) => async (req, res) => {
            // Industrial Mock: Inject empty user context for public routes
            req.user = req.user || { isAuthenticated: false };
            return handler(req, res);
        })
    }
}));

jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{}]),
}));

// Mock the environment variables
process.env.SENDGRID_API_KEY = 'test-key';

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
        expect(sgMail.send).toHaveBeenCalled();
    });

    it('should return 500 if SENDGRID_API_KEY is missing', async () => {
        const originalKey = process.env.SENDGRID_API_KEY;
        delete process.env.SENDGRID_API_KEY;
        
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

        process.env.SENDGRID_API_KEY = originalKey;
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
