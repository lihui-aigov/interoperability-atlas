#!/usr/bin/env node
/**
 * Headless Chromium Visual & Functional Audit (`scripts/verify-ui-screenshots.mjs`)
 * Verifies SEO/GEO static artifacts in `dist/`, audits the 4-tab workbench across
 * desktop (1440x900), mobile (390x844), deep links, header clause search drawer,
 * and offline `file://` execution, and saves clean visual captures into
 * `dist-standalone/screenshots/`.
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
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
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

function verifySeoArtifacts() {
  const requiredFiles = [
    'sitemap.xml',
    'robots.txt',
    'llms.txt',
    'llms-full.txt',
    'atlas-dataset.json',
    'feed.xml',
    'og-card.svg',
    'a8f4c2e9b1d7463095e2c1a4b8d3f6e1.txt',
    'indexnow-urls.json',
    'directory.html',
    'compare/eu-ai-act-vs-nist-ai-rmf.html',
    'compare/eu-ai-act-vs-iso-42001.html',
    'instruments/eu-ai-act.html',
    'instruments/unesco-ai-ethics.html',
    'spotlights/spot-agentic-public-oversight.html',
    'use-cases/uc-hiring-workforce.html',
  ];

  for (const rel of requiredFiles) {
    const full = path.join(DIST_DIR, rel);
    if (!fs.existsSync(full)) {
      throw new Error(`Expected SEO/GEO artifact missing from dist/: ${full}`);
    }
  }

  const sitemapText = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf-8');
  const locCount = (sitemapText.match(/<loc>/g) || []).length;
  if (locCount < 50) {
    throw new Error(`Expected >= 50 sitemap URLs, found only ${locCount}`);
  }
  console.log(`[verify-ui] Verified ${requiredFiles.length} SEO/GEO artifacts and ${locCount} sitemap URLs.`);
}

async function main() {
  verifySeoArtifacts();
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
        if (!text.includes('fonts.googleapis.com') && !text.includes('fonts.gstatic.com')) {
          consoleErrors.push(`console.error: ${text}`);
        }
      }
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    await page.waitForSelector('#workspace-tabs');
    await page.waitForSelector('#news-spotlight');
    await page.waitForTimeout(300);

    // 1. Verify & Capture true Above-the-Fold Desktop Landing (1440x900, scrollY=0)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const headlineBox = await page.locator('#news-spotlight h2').first().boundingBox();
    if (!headlineBox || headlineBox.y > 320) {
      throw new Error(
        `Above-the-fold failure: primary spotlight headline starts too low (y=${headlineBox?.y})`
      );
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-desktop-masthead-and-tabs.png'),
      fullPage: false,
    });

    // 1a. Capture true Mobile 390x844 above-the-fold first screen BEFORE sandbox mutations
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const mobileHeadlineBox = await page.locator('#news-spotlight h2').first().boundingBox();
    if (!mobileHeadlineBox || mobileHeadlineBox.y > 260) {
      throw new Error(
        `Mobile above-the-fold failure: lead headline starts too low (y=${mobileHeadlineBox?.y})`
      );
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-mobile-task-navigation.png'),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(150);

    // 1b. Verify collapsible header search drawer works end-to-end and closes cleanly
    await page.locator('#header-search-toggle').click();
    await page.waitForSelector('#global-clause-search');
    await page.fill('#global-clause-search', 'Art. 10');
    await page.waitForSelector('#global-clause-finder:has-text("matching clause provisions")');
    await page.locator('#header-search-toggle').click();
    await page.waitForTimeout(150);

    // 2. Tab 1: Click European Union lens in #news-spotlight, reset scrollY=0, capture full #news-spotlight
    await page.locator('#news-spotlight button[role="tab"]:has-text("European Union")').click();
    await page.waitForSelector('#news-spotlight:has-text("EU AI Act Art. 12")');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const spotBox = await page.locator('#news-spotlight').boundingBox();
    if (spotBox) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '02-desktop-news-spotlight.png'),
        fullPage: true,
        clip: {
          x: 0,
          y: Math.max(0, Math.floor(spotBox.y)),
          width: 1440,
          height: Math.ceil(spotBox.height),
        },
      });
    }

    // 3. Tab 2: Switch to Compare Two Frameworks & test Quick Pairs live above-the-fold updates
    await page.locator('#workspace-tab-compare').click();
    await page.waitForSelector('#pairwise-verdict-card');
    await page.locator('#regime-overview button:has-text("EU AI Act × NIST RMF")').click();
    await page.waitForSelector('#pairwise-verdict-card:has-text("78%")');
    await page.locator('#regime-overview button:has-text("EU AI Act × Brazil / Korea Laws")').click();
    await page.waitForSelector('#pairwise-verdict-card:has-text("40%")');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-desktop-compare-frameworks.png'),
      fullPage: true,
      clip: {
        x: 0,
        y: 0,
        width: 1440,
        height: 1420,
      },
    });

    // 4. Tab 3: Check an AI Use Case -> Sticky Crosswalk Matrix + Clause Reader Drawer
    await page.locator('#workspace-tab-use-cases').click();
    await page.waitForSelector('#use-case-quick-picker');
    await page.waitForSelector('#comparison-matrix');
    const matrixSection = page.locator('#comparison-matrix');
    await matrixSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.locator('#comparison-matrix table tbody button').first().click();
    await page.waitForSelector('text=Open Full Clause Reader & Verification Steps');
    await page.locator('button:has-text("Open Full Clause Reader & Verification Steps")').click();
    await page.waitForSelector('#clause-reader-title');
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-desktop-use-case-checklist.png'),
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // 5. Tab 3 Optional Visual Pathway Diagram toggle
    await page.locator('#visual-topology-toggle-bar button').click();
    await page.waitForSelector('#interoperability-flow button');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const flowBox = await page.locator('#interoperability-flow').boundingBox();
    if (flowBox) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05-desktop-visual-topology.png'),
        fullPage: true,
        clip: {
          x: 0,
          y: Math.max(0, Math.floor(flowBox.y)),
          width: 1440,
          height: Math.ceil(flowBox.height),
        },
      });
    }

    // 6. Verify Cite modal opens cleanly
    await page.locator('header button:has-text("Cite")').click();
    await page.waitForSelector('#citation-modal-title');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // 7. Tab 4: Sandbox instant preset switches into Tab 3 with mapped checklist banner
    await page.locator('#workspace-tab-sandbox').click();
    await page.waitForSelector('#use-case-sandbox');
    await page.locator('#use-case-sandbox button:has-text("Run Instant Demo")').first().click();
    await page.waitForSelector('text=Scenario mapped — reviewing your cross-border compliance checklist below.');

    // 8. Verify URL deep link ?tab=compare&pair=eu-ai-act-vs-iso-42001
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}?tab=compare&pair=eu-ai-act-vs-iso-42001`, {
      waitUntil: 'networkidle',
    });
    await page.waitForSelector('#pairwise-verdict-card:has-text("ISO/IEC 42001")');

    // 10. Verify standalone single-file HTML opens cleanly over file:// protocol across tabs
    if (fs.existsSync(STANDALONE_HTML)) {
      const standalonePage = await context.newPage();
      await standalonePage.setViewportSize({ width: 1440, height: 900 });
      standalonePage.on('pageerror', (err) => pageErrors.push(`standalone pageerror: ${err.message}`));
      await standalonePage.goto(pathToFileURL(STANDALONE_HTML).href, { waitUntil: 'load' });
      await standalonePage.waitForSelector('#workspace-tab-compare');
      await standalonePage.locator('#workspace-tab-compare').click();
      await standalonePage.waitForSelector('#pairwise-verdict-card');
      await standalonePage.locator('#workspace-tab-use-cases').click();
      await standalonePage.locator('#visual-topology-toggle-bar button').click();
      await standalonePage.waitForSelector('#interoperability-flow button');
      await standalonePage.close();
    }

    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `Runtime browser errors detected:\n${[...pageErrors, ...consoleErrors].join('\n')}`
      );
    }

    console.log(
      '[verify-ui] Passed all 4-tab desktop (1440x900), mobile (390x844), search toggle, Quick Pairs, SEO/GEO, deep-link, and file:// standalone checks with 0 runtime errors.'
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
