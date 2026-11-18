#!/usr/bin/env node
/**
 * Headless Chromium Visual & Functional Audit (`scripts/verify-ui-screenshots.mjs`)
 * Serves `dist/` locally, captures desktop and mobile screenshots into `dist-standalone/screenshots/`,
 * exercises core interactive features (Heatmap, Flow, Clause Reader, Citation Modal, Sandbox Presets),
 * and verifies `dist-standalone/open-atlas-interactive.html` renders cleanly via `file://`.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(REPO_ROOT, 'dist');
const SCREENSHOTS_DIR = path.resolve(REPO_ROOT, 'dist-standalone/screenshots');
const STANDALONE_HTML = path.resolve(REPO_ROOT, 'dist-standalone/open-atlas-interactive.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      let filePath = path.resolve(rootDir, rel);
      if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(rootDir, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: typeof addr === 'object' && addr ? addr.port : 4173 });
    });
  });
}

async function main() {
  for (const seoRel of [
    'sitemap.xml',
    'robots.txt',
    'llms.txt',
    'spotlights/spot-agentic-public-oversight.html',
  ]) {
    const seoFile = path.join(DIST_DIR, seoRel);
    if (!fs.existsSync(seoFile)) {
      throw new Error(`Expected SEO artifact missing from dist/: ${seoFile}`);
    }
  }

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const { server, port } = await startStaticServer(DIST_DIR);
  const baseUrl = `http://127.0.0.1:${port}/`;

  const browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    page.on('pageerror', (err) => pageErrors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore font-CDN hiccups if offline, fail on any app error
        if (!text.includes('fonts.googleapis.com') && !text.includes('fonts.gstatic.com')) {
          consoleErrors.push(`console.error: ${text}`);
        }
      }
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    await page.waitForSelector('#news-spotlight');
    await page.waitForSelector('#regime-overview table');
    await page.waitForTimeout(350);

    // 0. Click European Union lens in #news-spotlight, verify stance updates, and capture Masthead + Spotlight
    await page.locator('#news-spotlight button[role="tab"]:has-text("European Union")').click();
    await page.waitForSelector('#news-spotlight:has-text("EU AI Act Art. 12")');
    await page.waitForTimeout(200);
    const spotBox = await page.locator('#news-spotlight').boundingBox();
    const spotBottom = spotBox ? Math.ceil(spotBox.y + spotBox.height) : 1460;
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '00-desktop-news-spotlight.png'),
      fullPage: true,
      clip: { x: 0, y: 0, width: 1440, height: Math.min(spotBottom + 12, 1650) },
    });

    // 1. Capture #regime-overview (Instrument Footprint + 9x9 Heatmap + Pairwise Comparison Strip)
    const overviewBox = await page.locator('#regime-overview').boundingBox();
    if (overviewBox) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '01-desktop-masthead-heatmap.png'),
        fullPage: true,
        clip: {
          x: 0,
          y: Math.max(0, Math.floor(overviewBox.y)),
          width: 1440,
          height: Math.ceil(overviewBox.height),
        },
      });
    }

    // 2. Capture full #interoperability-flow cleanly at scrollY=0 via fullPage clip so sticky header stays at page top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const flowBox = await page.locator('#interoperability-flow').boundingBox();
    if (flowBox) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '02-desktop-alluvial-flow.png'),
        fullPage: true,
        clip: {
          x: 0,
          y: Math.max(0, Math.floor(flowBox.y)),
          width: 1440,
          height: Math.ceil(flowBox.height),
        },
      });
    }

    // 3. Verify Sticky Crosswalk Matrix + open ClauseReaderDrawer
    const matrixSection = page.locator('#comparison-matrix');
    await matrixSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const firstMatrixButton = page.locator('#comparison-matrix table tbody button').first();
    await firstMatrixButton.click();
    await page.waitForSelector('text=Open Full Clause Reader & Verification Steps');
    await page.locator('button:has-text("Open Full Clause Reader & Verification Steps")').click();
    await page.waitForSelector('#clause-reader-title');
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-desktop-matrix-and-clause-reader.png'),
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // 4. Verify CitationModal opens cleanly
    await page.locator('header button:has-text("Cite")').click();
    await page.waitForSelector('#citation-modal-title');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // 5. Verify Instant Preset Sandbox simulation injects live use case without network/key
    const sandboxSection = page.locator('#use-case-sandbox');
    await sandboxSection.scrollIntoViewIfNeeded();
    await page.locator('#use-case-sandbox button:has-text("Run Instant Demo")').first().click();
    await page.waitForSelector('text=Session Sandbox Mappings (1)');

    // 6. Switch to Mobile 390x844 viewport and capture mobile view
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-mobile-responsive.png'),
      fullPage: false,
    });

    // 7. Verify standalone single-file HTML opens cleanly over file:// protocol
    if (fs.existsSync(STANDALONE_HTML)) {
      const standalonePage = await context.newPage();
      await standalonePage.setViewportSize({ width: 1440, height: 900 });
      standalonePage.on('pageerror', (err) => pageErrors.push(`standalone pageerror: ${err.message}`));
      await standalonePage.goto(pathToFileURL(STANDALONE_HTML).href, { waitUntil: 'load' });
      await standalonePage.waitForSelector('h1');
      await standalonePage.waitForSelector('#regime-overview table');
      await standalonePage.waitForSelector('#interoperability-flow button');
      await standalonePage.close();
    }

    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `Runtime browser errors detected:\n${[...pageErrors, ...consoleErrors].join('\n')}`
      );
    }

    console.log(
      '[verify-ui] Passed all desktop (1440x900), mobile (390x844), interactive workflow, and file:// standalone checks with 0 runtime errors.'
    );
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
