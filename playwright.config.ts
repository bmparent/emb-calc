import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./qa",
  // WebKit + axe can be slow on the Windows verification host. Keep functional
  // assertions intact without treating instrumentation time as an app timing SLA.
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: (process.env.QA_ARTIFACT_DIR || "artifacts/release") + "/browser-results.json" }],
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
