import { defineConfig, devices } from "@playwright/test";

const developmentServerPort = 4173;
const developmentServerBaseUrl = `http://127.0.0.1:${developmentServerPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: developmentServerBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${developmentServerPort}`,
    url: developmentServerBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "MobileChromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
    {
      name: "MobileSafari",
      use: {
        ...devices["iPhone 14"],
      },
    },
  ],
});
