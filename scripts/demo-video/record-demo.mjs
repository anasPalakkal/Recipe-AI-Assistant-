import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.DEMO_URL ?? "http://localhost:3000";
const PROMPT = process.env.DEMO_PROMPT ?? "Creamy garlic mushroom pasta";
const VIEWPORT = { width: 1600, height: 900 };
const AUTH_STATE = "scripts/demo-video/.auth/state.json";
const OUTPUT_DIR = "scripts/demo-video/output";
const OUTPUT_FILE = `${OUTPUT_DIR}/cookloom-demo-raw.webm`;
const MARKS_FILE = `${OUTPUT_DIR}/marks.json`;
const GENERATION_TIMEOUT_MS = 60_000;

const zoomState = { scale: 1, tx: 0, ty: 0 };
let cursorPosition = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };

function installOverlay() {
  const style = document.createElement("style");
  style.textContent = "html{overflow:hidden!important}";

  const cursor = document.createElement("div");
  cursor.style.cssText =
    "position:fixed;top:0;left:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)";
  cursor.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 14 21"><path d="M0 0 L0 17 L4.5 13 L7.5 20 L10 19 L7 12 L13 12 Z" fill="#111" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  const ensureMounted = () => {
    const root = document.documentElement;
    if (!root) return;
    if (!style.isConnected) root.appendChild(style);
    if (!cursor.isConnected) root.appendChild(cursor);
  };

  ensureMounted();
  new MutationObserver(ensureMounted).observe(document, { childList: true, subtree: true });
  window.addEventListener(
    "mousemove",
    (event) => {
      cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    },
    true,
  );
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

async function applyZoom(page, next, durationMs) {
  await page.evaluate(
    ({ scale, tx, ty, duration }) => {
      const body = document.body;
      body.style.transformOrigin = "0 0";
      body.style.transition = `transform ${duration}ms cubic-bezier(0.65, 0, 0.35, 1)`;
      body.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    },
    { ...next, duration: durationMs },
  );
  Object.assign(zoomState, next);
  await page.waitForTimeout(durationMs + 150);
}

async function zoomTo(page, locator, scale, durationMs = 800) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Zoom target is not visible");

  // boundingBox is in on-screen coordinates; convert back to unscaled layout coordinates.
  const centerX = (box.x + box.width / 2 - zoomState.tx) / zoomState.scale;
  const centerY = (box.y + box.height / 2 - zoomState.ty) / zoomState.scale;

  const tx = clamp(VIEWPORT.width / 2 - centerX * scale, VIEWPORT.width * (1 - scale), 0);
  const ty = clamp(VIEWPORT.height / 2 - centerY * scale, VIEWPORT.height * (1 - scale), 0);
  await applyZoom(page, { scale, tx, ty }, durationMs);
}

const zoomOut = (page, durationMs = 800) => applyZoom(page, { scale: 1, tx: 0, ty: 0 }, durationMs);

async function moveCursorTo(page, target, durationMs = 350) {
  const from = cursorPosition;
  const frames = Math.max(1, Math.round(durationMs / 16));
  for (let i = 1; i <= frames; i++) {
    const t = easeInOut(i / frames);
    await page.mouse.move(from.x + (target.x - from.x) * t, from.y + (target.y - from.y) * t);
    await page.waitForTimeout(16);
  }
  cursorPosition = target;
}

async function clickWithCursor(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Click target is not visible");
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await moveCursorTo(page, point);
  await page.waitForTimeout(120);
  await page.mouse.click(point.x, point.y, { delay: 60 });
}

async function scrollMessages(page, position) {
  const scroller = page.locator("div.relative.min-h-0.flex-1 > div.h-full.overflow-y-auto");
  const scrolled = await scroller.evaluate((element, target) => {
    const maxTop = element.scrollHeight - element.clientHeight;
    if (maxTop <= 0) return false;
    element.scrollTo({ top: target === "top" ? 0 : maxTop, behavior: "smooth" });
    return true;
  }, position);
  if (scrolled) await page.waitForTimeout(1000);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  colorScheme: "light",
  storageState: AUTH_STATE,
  recordVideo: { dir: OUTPUT_DIR, size: VIEWPORT },
});
await context.addInitScript(installOverlay);
const page = await context.newPage();
const video = page.video();
const startedAt = Date.now();

const marks = {};
const mark = (label) => {
  const seconds = (Date.now() - startedAt) / 1000;
  marks[label] = Number(seconds.toFixed(2));
  console.log(`[${seconds.toFixed(1)}s] ${label}`);
};

page.on("response", (response) => {
  if (response.url().includes("/api/")) {
    console.log(`  ${response.status()} ${response.request().method()} ${response.url()}`);
  }
});
page.on("console", (message) => {
  if (message.type() === "error") console.log(`  console error: ${message.text()}`);
});

try {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    throw new Error("Redirected to login. Session expired; re-run save-auth.mjs.");
  }

  const heading = page.getByRole("heading", { name: "What do you want to cook today?" });
  await heading.waitFor({ timeout: 10_000 }).catch(() => {
    throw new Error("Empty chat screen not found. Delete existing conversations for this account first.");
  });

  await page.mouse.move(cursorPosition.x, cursorPosition.y);
  await page.waitForTimeout(1200);

  const input = page.getByPlaceholder("Describe a recipe, an ingredient, or a craving...");
  const composer = page.locator("form").filter({ has: input });

  await zoomTo(page, composer, 2);
  await clickWithCursor(page, input);
  await input.pressSequentially(PROMPT, { delay: 55 });
  await page.waitForTimeout(500);
  await input.press("Enter");
  mark("promptSent");

  await zoomOut(page);

  const saveButton = page.getByRole("button", { name: "Save recipe" });
  const errorMessage = page.locator("p.text-destructive");
  const outcome = await Promise.race([
    saveButton.waitFor({ timeout: GENERATION_TIMEOUT_MS }).then(() => "ok"),
    errorMessage.waitFor({ timeout: GENERATION_TIMEOUT_MS }).then(() => "error"),
  ]);
  if (outcome === "error") {
    throw new Error(`App showed an error: ${await errorMessage.first().innerText()}`);
  }
  mark("recipeVisible");

  await page
    .waitForFunction(
      () => {
        const img = document.querySelector("img.h-48.w-full");
        return Boolean(img && img.complete && img.naturalWidth > 0);
      },
      null,
      { timeout: 20_000 },
    )
    .catch(() => {
      throw new Error("Recipe photo did not load. Re-run with a prompt that returns an image.");
    });

  await page.waitForTimeout(1200);
  await scrollMessages(page, "top");
  await page.waitForTimeout(2200);
  await scrollMessages(page, "bottom");
  await page.waitForTimeout(500);

  await zoomTo(page, saveButton, 2.2);
  await clickWithCursor(page, saveButton);
  await zoomOut(page);

  await page.getByRole("link", { name: "View saved recipe" }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);

  const recipesLink = page.getByRole("link", { name: "Recipes", exact: true });
  await recipesLink.waitFor({ timeout: 5_000 }).catch(() => {
    throw new Error("Sidebar 'Recipes' link not found. Paste chat-sidebar.tsx so the selector can be fixed.");
  });

  await zoomTo(page, recipesLink, 2.2);
  await clickWithCursor(page, recipesLink);
  await zoomOut(page);

  await page.waitForURL(/\/recipes\/?$/, { timeout: 15_000 });
  await page.locator("h2 a[href^='/recipes/']").first().waitFor({ timeout: 15_000 });
  await page
    .waitForFunction(() =>
      [...document.querySelectorAll("img[loading='lazy']")].every((img) => img.complete),
    )
    .catch(() => undefined);
  await page.waitForTimeout(3500);
  mark("done");
} catch (error) {
  await page.screenshot({ path: `${OUTPUT_DIR}/failure.png` });
  throw error;
} finally {
  await context.close();
  await video.saveAs(OUTPUT_FILE);
  await video.delete();
  await browser.close();
  await writeFile(MARKS_FILE, JSON.stringify(marks, null, 2));
  console.log(`Saved ${OUTPUT_FILE}`);
}