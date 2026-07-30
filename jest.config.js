const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    // Unit tests and mocked integration tests run by default (CI / pre-push).
    // Live API integration tests (CalcDeterminism) require KOREKI_REAL_FETCH=true and are skipped by default.
    roots: ['<rootDir>/tests/unit', '<rootDir>/tests/integration'],
    testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/tests/e2e/',
        '<rootDir>/tests/fixtures/',
    ],
    modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/tests/reports/'],
    coverageDirectory: 'tests/reports/coverage',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/pages/(.*)$': '<rootDir>/pages/$1',
    },
    transform: {
        '\\.md$': '<rootDir>/tests/unit/__mocks__/markdownTransformer.js',
    },
    collectCoverageFrom: [
        'src/lib/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/pages/api/**/*.{ts,tsx}',
        '!src/lib/**/*.d.ts',
        '!src/lib/prisma.ts',
        '!src/lib/logto.ts',
        '!src/lib/logto-mgmt.ts',
        '!src/lib/stripe.ts',
        '!src/lib/file-utils.ts',
        '!src/**/*.d.ts',
    ],
    coverageThreshold: {
        './src/lib/': {
            branches: 45,
            functions: 65,
            lines: 63,
            statements: 63,
        },
        './src/hooks/': {
            branches: 25,
            functions: 30,
            lines: 30,
            statements: 30,
        },
        './src/pages/api/': {
            branches: 35,
            functions: 40,
            lines: 55,
            statements: 55,
        },
    },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
