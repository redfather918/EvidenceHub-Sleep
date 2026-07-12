/**
 * EvidenceHub Demo Video Recorder
 * Uses Playwright to navigate through 4 scenes and record a video.
 * Output: WebM (converted to MP4 by ffmpeg afterwards)
 *
 * Scene timeline:
 *   0-5s   : Homepage — headline + scroll
 *   5-15s  : Claim detail — evidence score + studies + dose
 *   15-25s : API JSON viewer — structured data for AI
 *   25-30s : CTA ending — "Sleep Evidence, Scored."
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const VIDEO_DIR = path.join(__dirname, '..', 'tmp_videos');
const FRAME_DIR = path.join(__dirname, '..', 'tmp_frames');

// Clean up previous runs
if (fs.existsSync(VIDEO_DIR)) {
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
}
if (fs.existsSync(FRAME_DIR)) {
  fs.rmSync(FRAME_DIR, { recursive: true, force: true });
}
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(FRAME_DIR, { recursive: true });

async function smoothScroll(page, totalPixels, steps, delayMs) {
  const stepSize = Math.ceil(totalPixels / steps);
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollBy(0, y), stepSize);
    await page.waitForTimeout(delayMs);
  }
}

async function captureFrames(page, count, intervalMs) {
  for (let i = 0; i < count; i++) {
    await page.screenshot({
      path: path.join(FRAME_DIR, `frame_${String(i).padStart(5, '0')}.png`),
      type: 'png'
    });
    await page.waitForTimeout(intervalMs);
  }
}

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/HUAWEI/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe',
    args: ['--disable-gpu', '--no-sandbox']
  });

  // --- Approach: Take screenshots for high-quality frames ---
  // Then ffmpeg combines them into MP4 at 30fps
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2 // Retina quality
  });
  const page = await context.newPage();

  let frameNum = 0;

  async function shot() {
    await page.screenshot({
      path: path.join(FRAME_DIR, `frame_${String(frameNum).padStart(5, '0')}.png`),
      type: 'png'
    });
    frameNum++;
  }

  // ================================================================
  // Scene 1: Homepage (0-5s) — ~75 frames at 15fps
  // ================================================================
  console.log('Scene 1: Homepage');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);

  // Capture hero section (1s)
  for (let i = 0; i < 15; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  // Scroll down slowly (3s)
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollBy(0, 30));
    await shot();
    await page.waitForTimeout(100);
  }

  // Pause at topics grid (1s)
  for (let i = 0; i < 15; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  // Scroll back to top (0.5s)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(500);
  for (let i = 0; i < 8; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  console.log(`  Scene 1 done: ${frameNum} frames`);

  // ================================================================
  // Scene 2: Claim detail (5-15s) — ~150 frames
  // ================================================================
  console.log('Scene 2: Claim detail');
  await page.goto(`${BASE_URL}/claim/glycine-sleep-latency`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);

  // Capture header + score badge (1.5s)
  for (let i = 0; i < 22; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  // Slow scroll through evidence section (5s)
  for (let i = 0; i < 50; i++) {
    await page.evaluate(() => window.scrollBy(0, 40));
    await shot();
    await page.waitForTimeout(100);
  }

  // Pause on studies (1.5s)
  for (let i = 0; i < 22; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  // Continue scrolling (2s)
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 50));
    await shot();
    await page.waitForTimeout(100);
  }

  // Pause on dose info (1s)
  for (let i = 0; i < 15; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  console.log(`  Scene 2 done: ${frameNum} frames`);

  // ================================================================
  // Scene 3: API JSON viewer (15-25s) — ~150 frames
  // ================================================================
  console.log('Scene 3: API JSON viewer');
  await page.goto(`${BASE_URL}/demo-api`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Capture the JSON viewer (2s)
  for (let i = 0; i < 30; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  // Slow scroll through JSON (4s)
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => window.scrollBy(0, 30));
    await shot();
    await page.waitForTimeout(100);
  }

  // Pause on field explanation cards (2s)
  for (let i = 0; i < 30; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  // Continue scrolling (1s)
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, 40));
    await shot();
    await page.waitForTimeout(67);
  }

  // Scroll back to top (1s)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(500);
  for (let i = 0; i < 15; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  console.log(`  Scene 3 done: ${frameNum} frames`);

  // ================================================================
  // Scene 4: CTA ending (25-30s) — ~75 frames
  // ================================================================
  console.log('Scene 4: CTA ending');
  await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);

  // Hold on CTA (5s)
  for (let i = 0; i < 75; i++) {
    await shot();
    await page.waitForTimeout(67);
  }

  console.log(`  Scene 4 done: ${frameNum} frames`);
  console.log(`\nTotal frames captured: ${frameNum}`);

  await page.close();
  await context.close();
  await browser.close();

  console.log(`\nFrames saved to: ${FRAME_DIR}`);
  console.log('Next step: ffmpeg combines frames into MP4');
})();
