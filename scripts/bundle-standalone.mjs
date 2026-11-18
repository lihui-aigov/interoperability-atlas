#!/usr/bin/env node
/**
 * Single-File Standalone Bundler (`scripts/bundle-standalone.mjs`)
 * Inlines built CSS and JS from `dist/` into a self-contained HTML artifact
 * at `dist-standalone/open-atlas-interactive.html` that opens cleanly offline or from Google Drive.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(REPO_ROOT, 'dist');
const OUT_DIR = path.resolve(REPO_ROOT, 'dist-standalone');
const OUT_FILE = path.resolve(OUT_DIR, 'open-atlas-interactive.html');

function resolveDistAsset(href) {
  const cleanRel = href.replace(/^\.?\//, '').split('?')[0];
  return path.resolve(DIST_DIR, cleanRel);
}

function bundleStandalone() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath}. Run "npm run build" before bundling standalone.`);
  }

  let html = fs.readFileSync(indexPath, 'utf-8');

  // Inline local CSS links (rel before href OR href before rel)
  html = html.replace(
    /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (fullTag, href) => {
      if (/^https?:\/\//i.test(href)) return fullTag;
      const assetPath = resolveDistAsset(href);
      if (!fs.existsSync(assetPath)) {
        throw new Error(`Referenced CSS asset missing: ${assetPath}`);
      }
      const cssContent = fs.readFileSync(assetPath, 'utf-8');
      return `<style>\n${cssContent}\n</style>`;
    }
  );

  html = html.replace(
    /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi,
    (fullTag, href) => {
      if (/^https?:\/\//i.test(href)) return fullTag;
      const assetPath = resolveDistAsset(href);
      if (!fs.existsSync(assetPath)) {
        throw new Error(`Referenced CSS asset missing: ${assetPath}`);
      }
      const cssContent = fs.readFileSync(assetPath, 'utf-8');
      return `<style>\n${cssContent}\n</style>`;
    }
  );

  // Strip local modulepreload links since scripts will be inlined
  html = html.replace(
    /<link\s+[^>]*rel=["']modulepreload["'][^>]*href=["'](?:\.?\/)?assets\/[^"']+["'][^>]*>\s*/gi,
    ''
  );

  // Inline local module script tags cleanly without $ pattern replacement corruption
  html = html.replace(
    /<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (fullTag, src) => {
      if (/^https?:\/\//i.test(src)) return fullTag;
      const assetPath = resolveDistAsset(src);
      if (!fs.existsSync(assetPath)) {
        throw new Error(`Referenced JS asset missing: ${assetPath}`);
      }
      const jsContent = fs
        .readFileSync(assetPath, 'utf-8')
        .replace(/<\/script/gi, () => '<\\/script');
      return `<script type="module">\n${jsContent}\n</script>`;
    }
  );

  if (/(href|src)=["']\.?\/?assets\//i.test(html)) {
    throw new Error('Standalone HTML still contains un-inlined local ./assets/ references.');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, 'utf-8');

  const sizeBytes = Buffer.byteLength(html, 'utf-8');
  if (sizeBytes < 150000) {
    throw new Error(`Standalone bundle unexpectedly small (${sizeBytes} bytes).`);
  }

  console.log(
    `[bundle-standalone] Created ${OUT_FILE} (${(sizeBytes / 1024).toFixed(1)} KB, zero external local assets).`
  );
}

bundleStandalone();
