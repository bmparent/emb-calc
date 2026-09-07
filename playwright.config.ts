import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./qa",
  timeout: 60000,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/release/browser-results.json" }],
  ],
  use: { baseURL: "http://127.0.0.1:4322", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium-phone",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
    {
      name: "webkit-phone",
      use: { browserName: "webkit", viewport: { width: 390, height: 844 } },
    },
    {
      name: "chromium-tablet",
      use: { browserName: "chromium", viewport: { width: 1024, height: 1366 } },
    },
  ],
  webServer: {
    command: "node scripts/serve-preview.mjs",
    url: "http://127.0.0.1:4322",
    reuseExistingServer: false,
  },
});
