import { chromium } from "playwright";

const baseUrl = process.env.DEMO_URL ?? "http://localhost:3000";

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await page.goto(`${baseUrl}/chat`);
await page.waitForURL("**/chat", { timeout: 300_000 });

await context.storageState({ path: "scripts/demo-video/.auth/state.json" });
await browser.close();