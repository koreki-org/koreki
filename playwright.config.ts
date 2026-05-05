import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Industrial-grade environment loader.
 * Reads .env.local manually to avoid external dependencies (e.g. dotenv)
 * and ensure resilience during network-restricted builds.
 */
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
    }
  });
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 240000,
  expect: {
    timeout: 30000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { outputFolder: 'tests/reports/html' }]],
  outputDir: './tests/reports/results',
  use: {
    baseURL: 'https://koreki.org',
    screenshot: 'on',
    trace: 'on',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './tests/auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
