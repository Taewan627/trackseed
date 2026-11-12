import { defineConfig } from '@playwright/test';

// Never attach to a server that is already listening on 5173/5174 (it may serve another checkout, RT3 R1-6): Playwright starts its own servers and
// fails if the ports are busy. Set TRACKSEED_REUSE_SERVER=1 to reuse running servers on purpose (local development only).
const reuseExistingServer = process.env.TRACKSEED_REUSE_SERVER === '1';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 960 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173',
      reuseExistingServer, timeout: 30000 },
    { command: 'npm run preview -- --port 5174 --strictPort', url: 'http://127.0.0.1:5174',
      reuseExistingServer, timeout: 30000 },
  ],
});
