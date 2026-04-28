import { defineConfig, devices } from "@playwright/test";

const appPort = 3210;
const mockApiPort = 3211;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${appPort}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `MOCK_API_PORT=${mockApiPort} node scripts/e2e/mock-api.mjs`,
      url: `http://127.0.0.1:${mockApiPort}/__mock__/attempts`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `NEXT_DIST_DIR=.next-e2e E2E_HARNESS=1 NEXT_PUBLIC_E2E_HARNESS=1 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:${mockApiPort} npm run dev -- -p ${appPort}`,
      url: `http://localhost:${appPort}/e2e-macro`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
