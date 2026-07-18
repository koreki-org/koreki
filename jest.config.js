const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    // Integration tests require live external APIs (Ollama, Mistral) and are excluded from the
    // default test run (CI / pre-push). Run them manually via: npm run test:integration
    roots: ['<rootDir>/tests/unit'],
    testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/tests/e2e/',
        '<rootDir>/tests/fixtures/',
        '<rootDir>/tests/integration/',
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
        '!src/lib/**/*.d.ts',
        '!src/lib/prisma.ts',
        '!src/lib/logto.ts',
        '!src/lib/logto-mgmt.ts',
        '!src/lib/stripe.ts',
        '!src/lib/file-utils.ts',
    ],
    coverageThreshold: {
        './src/lib/': {
            branches: 50,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
