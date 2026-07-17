import { defineConfig, devices } from "@playwright/test";

// 전용 포트(3100). Next 16은 한 프로젝트 디렉터리당 dev 서버 1개만 허용하므로
// (동시 실행 시 "Another next dev server is already running"), 이미 떠 있는
// 개발 서버가 있으면 그것을 재사용하고, 없으면 Playwright가 직접 띄운다.
// reuseExistingServer로 Next의 단일 서버 제약을 자연스럽게 우회한다.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
