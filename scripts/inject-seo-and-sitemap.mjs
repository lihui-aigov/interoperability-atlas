#!/usr/bin/env node
/**
 * Organic Search & AI-Crawler SEO Engine (`scripts/inject-seo-and-sitemap.mjs`)
 * Runs after `vite build` to enrich `dist/` for silent organic discovery:
 *   1. Injects canonical link, keywords, Schema.org Dataset + WebApplication JSON-LD,
 *      and a semantic `<noscript>` catalog into `dist/index.html`.
 *   2. Generates static crawlable long-tail HTML landing pages for every News Spotlight
 *      (`dist/spotlights/<id>.html`) and Concrete Use Case (`dist/use-cases/<id>.html`).
 *   3. Writes `dist/sitemap.xml`, `dist/robots.txt`, and `dist/llms.txt`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(REPO_ROOT, 'dist');
const ATLAS_PATH = path.resolve(REPO_ROOT, 'src/data/atlas.json');

const BASE_URL = 'https://lihui-aigov.github.io/interoperability-atlas/';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeJsonLd(obj) {
  return JSON.stringify(obj, null, 2).replace(/<\//g, '<\\/');
}

function renderStaticShell({ title, description, canonicalUrl, jsonLd, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <script type="application/ld+json">${safeJsonLd(jsonLd)}</script>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #F7F8FA; color: #0B1220; margin: 0; line-height: 1.6; }
      .wrap { max-width: 920px; margin: 0 auto; padding: 32px 20px 64px; }
      .cta-bar { background: #0B1220; color: #ffffff; padding: 14px 20px; border-radius: 8px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 28px; }
      .cta-btn { background: #10B981; color: #06281E; font-weight: 700; text-decoration: none; padding: 9px 16px; border-radius: 6px; font-size: 14px; }
      .card { background: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 18px; }
      .pill { display: inline-block; font-family: ui-monospace, monospace; font-size: 12px; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 2px 8px; border-radius: 4px; margin: 2px 4px 2px 0; }
      .badge-eq { color: #065F46; font-weight: 700; }
      .badge-dl { color: #92400E; font-weight: 700; }
      .badge-fr { color: #9F1239; font-weight: 700; }
      h1 { font-family: Georgia, serif; font-size: 2rem; line-height: 1.2; margin: 0 0 12px; }
      h2 { font-family: Georgia, serif; font-size: 1.3rem; margin: 20px 0 10px; }
      a { color: #0B1220; }
      .muted { color: #475569; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      ${bodyHtml}
    </div>
  </body>
</html>
`;
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`Missing build directory ${DIST_DIR}. Run vite build first.`);
  }
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath}.`);
  }

  const dataset = JSON.parse(fs.readFileSync(ATLAS_PATH, 'utf-8'));
  const spotlights = Array.isArray(dataset.spotlights) ? dataset.spotlights : [];
  const lastModDate = String(dataset.metadata?.lastUpdated || new Date().toISOString()).slice(0, 10);

  const instMap = new Map(dataset.instruments.map((i) => [i.id, i]));
  const ctrlMap = new Map(dataset.controls.map((c) => [c.id, c]));

  // 1. Enrich root dist/index.html (idempotent)
  let indexHtml = fs.readFileSync(indexPath, 'utf-8');

  if (!indexHtml.includes('id="atlas-seo-jsonld"')) {
    const graphJsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Dataset',
          name: dataset.metadata.atlasName,
          description:
            'Use-case-anchored computational atlas mapping shared operational controls, jurisdictional deltas, and regulatory friction across UNESCO Ethics of AI, EU AI Act, Council of Europe CETS 225, ISO/IEC 42001, NIST AI RMF, Singapore Agentic AI Framework, ASEAN Guide, AU Continental Strategy, Brazil PL 2338, and South Korea AI Basic Act.',
          url: BASE_URL,
          version: dataset.metadata.datasetVersion,
          dateModified: dataset.metadata.lastUpdated,
          license: 'https://creativecommons.org/licenses/by/4.0/',
          isAccessibleForFree: true,
          creator: {
            '@type': 'Person',
            name: 'Lihui Xu',
            url: 'https://github.com/lihui-aigov',
          },
          keywords: [
            'AI governance interoperability',
            'EU AI Act compliance crosswalk',
            'UNESCO AI Ethics EIA',
            'ISO/IEC 42001 controls',
            'NIST AI RMF mapping',
            'agentic AI governance',
            'public sector AI procurement',
          ],
          distribution: {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: 'https://raw.githubusercontent.com/lihui-aigov/interoperability-atlas/main/src/data/atlas.json',
          },
        },
        {
          '@type': 'WebApplication',
          name: dataset.metadata.atlasName,
          url: BASE_URL,
          applicationCategory: 'ReferenceApplication',
          operatingSystem: 'Any',
          isAccessibleForFree: true,
        },
      ],
    };

    const headInjection = `    <link rel="canonical" href="${BASE_URL}" />
    <meta name="keywords" content="AI governance interoperability, EU AI Act, UNESCO Ethics of AI, ISO 42001, NIST AI RMF, Singapore Agentic AI, CoE CETS 225, ASEAN AI Guide, AI policy analysis" />
    <meta property="og:url" content="${BASE_URL}" />
    <script id="atlas-seo-jsonld" type="application/ld+json">${safeJsonLd(graphJsonLd)}</script>`;

    indexHtml = indexHtml.replace('</head>', () => `${headInjection}\n  </head>`);
  }

  if (!indexHtml.includes('id="atlas-seo-noscript"')) {
    const spotlightLinks = spotlights
      .map(
        (s) =>
          `<li><a href="./spotlights/${encodeURIComponent(s.id)}.html">${escapeHtml(s.headline)}</a> (${escapeHtml(s.publishedDate)})</li>`
      )
      .join('\n          ');

    const useCaseLinks = dataset.useCases
      .map(
        (u) =>
          `<li><a href="./use-cases/${encodeURIComponent(u.id)}.html">${escapeHtml(u.title)}</a> — ${escapeHtml(u.sector)}</li>`
      )
      .join('\n          ');

    const instrumentItems = dataset.instruments
      .map(
        (i) =>
          `<li><strong>${escapeHtml(i.title)}</strong> (${escapeHtml(i.jurisdictionOrScope)}, ${escapeHtml(i.adoptionYear)})</li>`
      )
      .join('\n          ');

    const noscriptBlock = `    <noscript id="atlas-seo-noscript">
      <main style="max-width:900px;margin:24px auto;padding:16px;font-family:system-ui,sans-serif;">
        <h1>${escapeHtml(dataset.metadata.atlasName)} (v${escapeHtml(dataset.metadata.datasetVersion)})</h1>
        <p>Independent personal-capacity research by Lihui Xu (@lihui-aigov) mapping ${dataset.useCases.length} concrete AI use cases, ${dataset.controls.length} operational controls, ${dataset.instruments.length} global regimes, and ${dataset.mappings.length} cited clauses.</p>
        <h2>In-the-News Governance Spotlights</h2>
        <ul>
          ${spotlightLinks}
        </ul>
        <h2>Concrete AI Deployment Use Cases</h2>
        <ul>
          ${useCaseLinks}
        </ul>
        <h2>Tracked Governance Instruments</h2>
        <ul>
          ${instrumentItems}
        </ul>
      </main>
    </noscript>`;

    indexHtml = indexHtml.replace('<div id="root"></div>', () => `<div id="root"></div>\n${noscriptBlock}`);
  }

  fs.writeFileSync(indexPath, indexHtml, 'utf-8');

  // 2. Generate static crawlable landing pages for Spotlights and Use Cases
  const spotlightsDir = path.join(DIST_DIR, 'spotlights');
  const useCasesDir = path.join(DIST_DIR, 'use-cases');
  fs.mkdirSync(spotlightsDir, { recursive: true });
  fs.mkdirSync(useCasesDir, { recursive: true });

  const sitemapEntries = [
    { loc: BASE_URL, lastmod: lastModDate, priority: '1.0' },
  ];

  for (const spot of spotlights) {
    const fileName = `${spot.id}.html`;
    const canonicalUrl = `${BASE_URL}spotlights/${encodeURIComponent(fileName)}`;
    const appDeepLink = `../?spotlight=${encodeURIComponent(spot.id)}`;

    const argsHtml = spot.evidenceArguments
      .map(
        (a) =>
          `<li><p>${escapeHtml(a.claim)}</p><div>${a.supportingCitations
            .map((c) => `<span class="pill">${escapeHtml(c)}</span>`)
            .join('')}</div></li>`
      )
      .join('\n');

    const viewsHtml = spot.jurisdictionViews
      .map(
        (v) => `<div class="card">
          <h3>${escapeHtml(v.lensLabel)}</h3>
          <p>${escapeHtml(v.stanceSummary)}</p>
          <p>${v.citedClauses.map((c) => `<span class="pill">${escapeHtml(c)}</span>`).join('')}</p>
          <p class="muted"><strong>Leverage / Blind Spot:</strong> ${escapeHtml(v.leverageOrBlindSpot)}</p>
        </div>`
      )
      .join('\n');

    const html = renderStaticShell({
      title: `${spot.headline} | Open Atlas of AI Governance`,
      description: spot.eventSummary.slice(0, 155),
      canonicalUrl,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: spot.headline,
        datePublished: spot.publishedDate,
        author: { '@type': 'Person', name: 'Lihui Xu' },
        about: spot.regionTag,
        url: canonicalUrl,
      },
      bodyHtml: `
        <div class="cta-bar">
          <div>
            <strong>Open Atlas of AI Governance Interoperability</strong><br/>
            <span style="font-size:13px;opacity:0.85;">In-the-News Policy Brief · ${escapeHtml(spot.publishedDate)} · ${escapeHtml(spot.regionTag)}</span>
          </div>
          <a class="cta-btn" href="${escapeHtml(appDeepLink)}">Open Interactive Visual Atlas &rarr;</a>
        </div>
        <h1>${escapeHtml(spot.headline)}</h1>
        <p class="muted">Source: <a href="${escapeHtml(spot.newsSourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(spot.newsSourceTitle)}</a></p>
        <div class="card">
          <p>${escapeHtml(spot.eventSummary)}</p>
          <p><strong>Core Governance Question:</strong> ${escapeHtml(spot.coreGovernanceQuestion)}</p>
        </div>
        <h2>Evidence-Backed Arguments</h2>
        <div class="card"><ol>${argsHtml}</ol></div>
        <h2>Interoperability Bottleneck &amp; Engineering Translation</h2>
        <div class="card">
          <p><strong>Bottleneck:</strong> ${escapeHtml(spot.interoperabilityBottleneck)}</p>
          <p><strong>Engineering Translation:</strong> ${escapeHtml(spot.engineeringTranslation)}</p>
        </div>
        <h2>Jurisdictional Analysis Across Global Frameworks</h2>
        ${viewsHtml}
      `,
    });

    fs.writeFileSync(path.join(spotlightsDir, fileName), html, 'utf-8');
    sitemapEntries.push({ loc: canonicalUrl, lastmod: spot.publishedDate || lastModDate, priority: '0.9' });
  }

  for (const uc of dataset.useCases) {
    const fileName = `${uc.id}.html`;
    const canonicalUrl = `${BASE_URL}use-cases/${encodeURIComponent(fileName)}`;
    const appDeepLink = `../?useCase=${encodeURIComponent(uc.id)}`;
    const ucMappings = dataset.mappings.filter((m) => m.useCaseId === uc.id);

    const mappingsHtml = ucMappings
      .map((m) => {
        const inst = instMap.get(m.instrumentId);
        const ctrl = ctrlMap.get(m.controlId);
        const cls =
          m.alignmentType === 'equivalent'
            ? 'badge-eq'
            : m.alignmentType === 'delta'
              ? 'badge-dl'
              : 'badge-fr';
        return `<div class="card">
          <p><span class="${cls}">[${escapeHtml(m.alignmentType.toUpperCase())}]</span> <strong>${escapeHtml(
            inst?.shortName || m.instrumentId
          )}</strong> &middot; ${escapeHtml(ctrl?.title || m.controlId)}</p>
          <p><span class="pill">${escapeHtml(m.clauseCitation)}</span></p>
          <p>${escapeHtml(m.rationale)}</p>
          <p class="muted"><a href="${escapeHtml(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">Official Reference</a></p>
        </div>`;
      })
      .join('\n');

    const html = renderStaticShell({
      title: `${uc.title} — AI Governance Interoperability Crosswalk`,
      description: uc.summary.slice(0, 155),
      canonicalUrl,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: uc.title,
        dateModified: lastModDate,
        author: { '@type': 'Person', name: 'Lihui Xu' },
        about: uc.sector,
        url: canonicalUrl,
      },
      bodyHtml: `
        <div class="cta-bar">
          <div>
            <strong>Open Atlas of AI Governance Interoperability</strong><br/>
            <span style="font-size:13px;opacity:0.85;">${escapeHtml(uc.sector)} · ${escapeHtml(uc.riskProfile)}</span>
          </div>
          <a class="cta-btn" href="${escapeHtml(appDeepLink)}">Inspect Interactive Flow &amp; Matrix &rarr;</a>
        </div>
        <h1>${escapeHtml(uc.title)}</h1>
        <div class="card">
          <p>${escapeHtml(uc.summary)}</p>
          <p class="muted"><strong>Deployment Context:</strong> ${escapeHtml(uc.deploymentContext)}</p>
        </div>
        <h2>Verified Cross-Regime Clause Mappings (${ucMappings.length})</h2>
        ${mappingsHtml}
      `,
    });

    fs.writeFileSync(path.join(useCasesDir, fileName), html, 'utf-8');
    sitemapEntries.push({ loc: canonicalUrl, lastmod: lastModDate, priority: '0.8' });
  }

  // 3. Generate sitemap.xml, robots.txt, and llms.txt
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${escapeXml(e.lastmod)}</lastmod>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf-8');

  const llmsTxt = `# Open Atlas of AI Governance Interoperability

> Live Interactive Observatory: ${BASE_URL}
> Source Repository: https://github.com/lihui-aigov/interoperability-atlas
> Maintainer: Lihui Xu (@lihui-aigov) — Independent personal-capacity research project
> Dataset Version: ${dataset.metadata.datasetVersion} (Updated ${lastModDate})
> License: MIT (code) and CC-BY-4.0 (structured dataset)

## Core Methodological Thesis
Every record maps a concrete AI deployment (useCaseId) to an observable operational control or verification artifact (controlId) and a primary regulatory or standards provision (instrumentId), classified as:
- equivalent: Shared baseline control satisfying multiple regimes concurrently (Comply Once, Verify Across)
- delta: Additional statutory filing, local cohort check, or threshold
- friction: Conflicting prohibition, timing clash, or irreconcilable legal rule

## Latest In-the-News Governance Spotlights
${spotlights
  .map(
    (s) =>
      `- [${s.headline}](${BASE_URL}spotlights/${encodeURIComponent(s.id)}.html) (${s.publishedDate}, ${s.regionTag})`
  )
  .join('\n')}

## Tracked Governance Instruments (${dataset.instruments.length})
${dataset.instruments
  .map((i) => `- ${i.title} (${i.jurisdictionOrScope}, ${i.legalNature}, ${i.adoptionYear}): ${i.officialUrl}`)
  .join('\n')}

## Concrete AI Use Cases (${dataset.useCases.length})
${dataset.useCases
  .map((u) => `- [${u.title}](${BASE_URL}use-cases/${encodeURIComponent(u.id)}.html) — ${u.sector}`)
  .join('\n')}
`;
  fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), llmsTxt, 'utf-8');

  console.log(
    `[seo-engine] Enriched dist/index.html (JSON-LD + noscript), generated ${spotlights.length} spotlight pages, ${dataset.useCases.length} use-case pages, sitemap.xml, robots.txt, and llms.txt.`
  );
}

main();
