import { cn, isValidRedirectUrl } from '../../src/lib/utils';

describe('Utils tests', () => {

    describe('cn', () => {
        it('should merge tailwind classes correctly', () => {
            expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
            expect(cn('p-4 p-2')).toBe('p-2'); // tailwind-merge handles overrides
            expect(cn('flex', false && 'hidden', 'items-center')).toBe('flex items-center');
        });
    });

    describe('isValidRedirectUrl', () => {
        const OLD_ENV = process.env;

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...OLD_ENV, NEXT_PUBLIC_BASE_URL: 'https://koreki.de' };
        });

        afterAll(() => {
            process.env = OLD_ENV;
        });

        it('should allow relative URLs', () => {
            expect(isValidRedirectUrl('/dashboard')).toBe(true);
            expect(isValidRedirectUrl('/settings/profile')).toBe(true);
        });

        it('should block protocol-relative URLs', () => {
            expect(isValidRedirectUrl('//evil.com')).toBe(false);
        });

        it('should allow allowed domains', () => {
            expect(isValidRedirectUrl('https://koreki.de/success')).toBe(true);
            expect(isValidRedirectUrl('https://checkout.stripe.com/pay')).toBe(true);
        });

        it('should block unknown domains', () => {
            expect(isValidRedirectUrl('https://malicious.com')).toBe(false);
            expect(isValidRedirectUrl('https://koreki.de-evil.com')).toBe(false);
        });

        it('should handle invalid URLs gracefully', () => {
            expect(isValidRedirectUrl('not-a-url')).toBe(false);
            expect(isValidRedirectUrl('')).toBe(false);
        });
    });

    describe('exportSessionToJson', () => {
        // Mocking browser globals for export testing
        let createObjectURLMock: jest.Mock;
        let revokeObjectURLMock: jest.Mock;

        beforeEach(() => {
            createObjectURLMock = jest.fn(() => 'blob:mock-url');
            revokeObjectURLMock = jest.fn();
            global.URL.createObjectURL = createObjectURLMock;
            global.URL.revokeObjectURL = revokeObjectURLMock;
            
            // Mock document.createElement and click
            document.createElement = jest.fn().mockImplementation((tag) => {
                if (tag === 'a') {
                    return {
                        href: '',
                        download: '',
                        click: jest.fn(),
                        style: {}
                    };
                }
                return {};
            }) as any;
            document.body.appendChild = jest.fn();
            document.body.removeChild = jest.fn();
        });

        it('should filter out binary data and large files during export', () => {
            const { exportSessionToJson } = require('../../src/lib/utils');
            
            const mockBatchFiles = [{
                studentName: 'Max',
                previewDataUrls: ['data:image/jpeg;base64,...'],
                redactedDataUrl: 'data:image/jpeg;base64,...',
                file: new File([], 'test.pdf'),
                analysis: { tasks: [] }
            }];

            // Capture the Blob content
            let capturedData = '';
            (global.Blob as any) = jest.fn().mockImplementation(([content]) => {
                capturedData = content;
                return { type: 'application/json' };
            });

            exportSessionToJson(mockBatchFiles as any, 'Musterlösung', []);

            const parsed = JSON.parse(capturedData);
            const exportedFile = parsed.batchFiles[0];

            expect(exportedFile.studentName).toBe('Max');
            expect(exportedFile.previewDataUrls).toBeUndefined();
            expect(exportedFile.redactedDataUrl).toBeUndefined();
            expect(exportedFile.file).toBeUndefined();
            expect(parsed.modelSolution).toBe('Musterlösung');
        });
    });
});
