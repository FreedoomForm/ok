import { defineConfig, devices } from '@playwright/test'

const externalBaseUrl = process.env.BASE_URL

/**
 * Playwright configuration for comprehensive website testing.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: externalBaseUrl || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: 'corepack yarn dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
          stdout: 'ignore' as const,
          stderr: 'pipe' as const,
          env: {
            ...process.env,
            AUTH_SECRET: process.env.AUTH_SECRET || 'test-auth-secret',
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-nextauth-secret',
            AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || 'true',
            JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
            DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db',
          },
        },
      }),
})
