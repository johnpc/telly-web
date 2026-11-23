import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Gherkin specs under e2e/features run against the built app over the
// hermetic fixture server (e2e/fixtures/serve.mjs on 127.0.0.1:8090). Every
// step drives the app with KEYBOARD ONLY — arrows, Enter, Escape, PageUp/Down
// — which is the product promise for TV browsers and Xbox.
const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
  // Locally a slice may run before its siblings' steps exist; CI must never hide a missing step.
  missingSteps: process.env.CI ? 'fail-on-gen' : 'skip-scenario',
});

const TAG = process.env.E2E_TAG ? `@${process.env.E2E_TAG}` : undefined;

export default defineConfig({
  testDir,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0, // there is no such thing as a flaky test
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  outputDir: 'test-results',
  ...(TAG ? { grep: new RegExp(TAG) } : {}),
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1920, height: 1080 },
    hasTouch: false,
    video: process.env.E2E_VIDEO ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  // The device preset carries its own 1280×720 viewport; the TV viewport must win.
  projects: [{ name: 'tv', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } }],
  webServer: [
    {
      command: 'npm run fixtures && npm run fixtures:serve',
      port: 8090,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // CI serves the production build; locally the dev server reflects live edits and is shared by parallel runs.
      command: process.env.CI ? 'npx vite preview' : 'npx vite --port 4173 --strictPort',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
