import { defineConfig } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://${host}:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://${host}:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
