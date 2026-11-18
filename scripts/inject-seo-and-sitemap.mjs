#!/usr/bin/env node
/**
 * Organic Search & Generative Engine Optimization (GEO) Engine (`scripts/inject-seo-and-sitemap.mjs`)
 * Runs after `vite build` (and after `bundle-standalone.mjs` when bundling standalone) to generate:
 *   1. Enriched `dist/index.html` with Schema.org (@graph: WebSite, WebApplication, Dataset, FAQPage),
 *      OpenGraph/Twitter cards (`og-card.svg`), Atom feed link, and pre-mount semantic HTML inside `#root`.
 *   2. Static crawlable comparison pages (`dist/compare/<slugA>-vs-<slugB>.html`) for every active pair.
 *   3. Static crawlable use-case checklists (`dist/use-cases/<id>.html`).
 *   4. Static crawlable instrument crosswalk pages (`dist/instruments/<slug>.html`).
 *   5. Static crawlable news spotlight pages (`dist/spotlights/<id>.html`).
 *   6. Complete HTML directory (`dist/directory.html`), `sitemap.xml`, `robots.txt`,
 *      `llms.txt`, `llms-full.txt`, `atlas-dataset.json`, `feed.xml`, `og-card.svg`,
 *      and IndexNow verification + URL payload files.
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
const INDEXNOW_KEY = 'a8f4c2e9b1d7463095e2c1a4b8d3f6e1';
const OG_IMAGE_URL = `${BASE_URL}og-card.svg`;

const INSTRUMENT_SLUG_MAP = {
  'inst-eu-ai-act': 'eu-ai-act',
  'inst-nist-ai-rmf': 'nist-ai-rmf',
  'inst-iso-42001': 'iso-42001',
  'inst-unesco-rec': 'unesco-ai-ethics',
  'inst-unesco-eia': 'unesco-ai-ethics',
  'inst-sg-agentic': 'singapore-agentic-ai',
  'inst-coe-treaty': 'coe-ai-convention',
  'inst-br-kr-laws': 'brazil-korea-ai-laws',
  'inst-asean-guide': 'asean-ai-guide',
  'inst-au-strategy': 'african-union-ai-strategy',
};

function instrumentToSlug(id) {
  if (INSTRUMENT_SLUG_MAP[id]) return INSTRUMENT_SLUG_MAP[id];
  return String(id || '')
    .replace(/^inst-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
}

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

function alignmentPlainLabel(alignmentType) {
  if (alignmentType === 'equivalent') return 'Comply Once (Shared Core)';
  if (alignmentType === 'delta') return 'Extra Local Step';
  return 'Direct Rule Clash';
}

function alignmentBadgeClass(alignmentType) {
  if (alignmentType === 'equivalent') return 'badge-eq';
  if (alignmentType === 'delta') return 'badge-dl';
  return 'badge-fr';
}

function buildFaqSchema(faqPairs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqPairs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function buildBreadcrumbSchema(crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

function renderFaqSectionHtml(faqPairs) {
  return `
    <section aria-labelledby="faq-heading" class="card">
      <h2 id="faq-heading">Frequently Asked Questions</h2>
      ${faqPairs
        .map(
          (f) => `<div style="margin-top:14px;">
        <h3 style="margin:0 0 6px;font-size:15px;">${escapeHtml(f.question)}</h3>
        <p style="margin:0;color:#334155;">${escapeHtml(f.answer)}</p>
      </div>`
        )
        .join('\n')}
    </section>
  `;
}

function renderStaticShell({
  title,
  description,
  canonicalUrl,
  keywords,
  ogType = 'article',
  jsonLdGraph,
  breadcrumbs,
  bodyHtml,
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': jsonLdGraph,
  };

  const breadcrumbHtml = breadcrumbs
    .map((c, idx) =>
      idx === breadcrumbs.length - 1
        ? `<span>${escapeHtml(c.name)}</span>`
        : `<a href="${escapeHtml(c.href)}">${escapeHtml(c.name)}</a> &rsaquo; `
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="${escapeHtml(keywords || 'AI governance interoperability, EU AI Act, NIST AI RMF, ISO 42001, UNESCO AI Ethics')}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="alternate" type="application/atom+xml" title="Open Atlas Briefings & Updates Feed" href="${escapeHtml(BASE_URL)}feed.xml" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(OG_IMAGE_URL)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(OG_IMAGE_URL)}" />
    <script type="application/ld+json">${safeJsonLd(jsonLd)}</script>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F7F8FA; color: #0B1220; margin: 0; line-height: 1.6; }
      .wrap { max-width: 1020px; margin: 0 auto; padding: 28px 20px 64px; }
      .crumbs { font-size: 13px; color: #475569; margin-bottom: 14px; }
      .crumbs a { color: #0F172A; text-decoration: none; border-bottom: 1px solid #CBD5E1; }
      .cta-bar { background: #0B1220; color: #ffffff; padding: 16px 20px; border-radius: 8px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 24px; }
      .cta-btn { background: #10B981; color: #06281E; font-weight: 700; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-size: 14px; display: inline-block; }
      .capsule { background: #ECFDF5; border: 1px solid #A7F3D0; border-left: 4px solid #059669; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px; }
      .card { background: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 18px; }
      .pill { display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 2px 8px; border-radius: 4px; margin: 2px 4px 2px 0; }
      .badge-eq { color: #065F46; font-weight: 700; }
      .badge-dl { color: #92400E; font-weight: 700; }
      .badge-fr { color: #9F1239; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; font-size: 13.5px; background: #ffffff; }
      th, td { border: 1px solid #E2E8F0; padding: 10px 12px; text-align: left; vertical-align: top; }
      th { background: #F8FAFC; font-weight: 600; color: #0F172A; }
      h1 { font-family: Georgia, Cambria, serif; font-size: 1.95rem; line-height: 1.2; margin: 0 0 12px; }
      h2 { font-family: Georgia, Cambria, serif; font-size: 1.25rem; margin: 0 0 12px; }
      a { color: #0B1220; }
      .muted { color: #475569; font-size: 13.5px; }
      .footer-nav { margin-top: 28px; padding-top: 16px; border-top: 1px solid #CBD5E1; font-size: 13px; color: #475569; display: flex; flex-wrap: wrap; gap: 16px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <nav aria-label="Breadcrumb" class="crumbs">${breadcrumbHtml}</nav>
      ${bodyHtml}
      <footer class="footer-nav">
        <a href="${escapeHtml(BASE_URL)}">Interactive Observatory</a>
        <a href="${escapeHtml(BASE_URL)}directory.html">Full Reference Directory</a>
        <a href="${escapeHtml(BASE_URL)}atlas-dataset.json">Download Raw JSON (CC-BY-4.0)</a>
        <a href="${escapeHtml(BASE_URL)}llms.txt">llms.txt</a>
        <span>Maintained independently by Lihui Xu (@lihui-aigov) from public primary texts.</span>
      </footer>
    </div>
  </body>
</html>
`;
}

function computePairwiseData(dataset) {
  const ucMap = new Map(dataset.useCases.map((u) => [u.id, u]));
  const ctrlMap = new Map(dataset.controls.map((c) => [c.id, c]));

  const byInstCtx = new Map();
  for (const inst of dataset.instruments) {
    byInstCtx.set(inst.id, new Map());
  }
  for (const m of dataset.mappings) {
    const ctxMap = byInstCtx.get(m.instrumentId);
    if (!ctxMap) continue;
    const key = `${m.useCaseId}::${m.controlId}`;
    if (!ctxMap.has(key)) ctxMap.set(key, []);
    ctxMap.get(key).push(m);
  }

  const pairs = [];
  for (let i = 0; i < dataset.instruments.length; i += 1) {
    for (let j = i + 1; j < dataset.instruments.length; j += 1) {
      const instA = dataset.instruments[i];
      const instB = dataset.instruments[j];
      const mapA = byInstCtx.get(instA.id);
      const mapB = byInstCtx.get(instB.id);

      let eq = 0;
      let dl = 0;
      let fr = 0;
      const contexts = [];

      for (const [ctxKey, mappingsA] of mapA.entries()) {
        const mappingsB = mapB.get(ctxKey);
        if (!mappingsB || mappingsB.length === 0) continue;
        const [useCaseId, controlId] = ctxKey.split('::');
        const combined = [...mappingsA, ...mappingsB];
        const hasFr = combined.some((m) => m.alignmentType === 'friction');
        const hasEqA = mappingsA.some((m) => m.alignmentType === 'equivalent');
        const hasEqB = mappingsB.some((m) => m.alignmentType === 'equivalent');

        let status;
        if (hasFr) {
          status = 'friction';
          fr += 1;
        } else if (hasEqA && hasEqB) {
          status = 'equivalent';
          eq += 1;
        } else {
          status = 'delta';
          dl += 1;
        }

        contexts.push({
          useCaseId,
          useCase: ucMap.get(useCaseId),
          controlId,
          control: ctrlMap.get(controlId),
          status,
          mappingsA,
          mappingsB,
        });
      }

      if (contexts.length === 0) continue;

      contexts.sort((x, y) => {
        const rank = (s) => (s === 'friction' ? 0 : s === 'delta' ? 1 : 2);
        return rank(x.status) - rank(y.status);
      });

      const rate = Math.round((eq / contexts.length) * 100);
      const slugA = instrumentToSlug(instA.id);
      const slugB = instrumentToSlug(instB.id);
      const pairSlug = `${slugA}-vs-${slugB}`;

      pairs.push({
        instA,
        instB,
        pairSlug,
        sharedCount: contexts.length,
        eq,
        dl,
        fr,
        rate,
        contexts,
      });
    }
  }
  return pairs;
}

function buildPlainVerdictText(pair) {
  const { instA, instB, sharedCount, eq, dl, fr, rate } = pair;
  const parts = [
    `${instA.shortName} and ${instB.shortName} share a ${rate}% baseline overlap across ${sharedCount} co-mapped deployment controls in the Open Atlas dataset.`,
    `${eq} of those ${sharedCount} controls can be satisfied once with the same verification evidence.`,
  ];
  if (dl > 0) {
    parts.push(
      `${dl} ${dl === 1 ? 'control adds' : 'controls add'} an extra local filing, notice, or cohort threshold.`
    );
  }
  if (fr > 0) {
    parts.push(
      `${fr} ${fr === 1 ? 'control triggers' : 'controls trigger'} a direct legal clash requiring legal review.`
    );
  }
  return parts.join(' ');
}

function toAtomDate(rawDate) {
  const s = String(rawDate || new Date().toISOString());
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T07:00:00Z`;
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return s;
  return `${s.slice(0, 10)}T07:00:00Z`;
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
  const pairwiseList = computePairwiseData(dataset);

  const instMap = new Map(dataset.instruments.map((i) => [i.id, i]));
  const ctrlMap = new Map(dataset.controls.map((c) => [c.id, c]));
  const ucMap = new Map(dataset.useCases.map((u) => [u.id, u]));

  // Write downloadable dataset copy & OpenGraph card SVG & IndexNow key file
  fs.writeFileSync(
    path.join(DIST_DIR, 'atlas-dataset.json'),
    JSON.stringify(dataset, null, 2),
    'utf-8'
  );

  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0B1220"/>
  <rect x="48" y="48" width="1104" height="534" rx="14" fill="#111C33" stroke="#1E293B" stroke-width="2"/>
  <text x="88" y="132" font-family="ui-monospace, monospace" font-size="22" fill="#34D399" font-weight="600">OPEN GOVERNANCE OBSERVATORY · CC-BY-4.0 DATASET</text>
  <text x="88" y="218" font-family="Georgia, serif" font-size="54" fill="#FFFFFF" font-weight="600">Open Atlas of AI Governance</text>
  <text x="88" y="284" font-family="Georgia, serif" font-size="54" fill="#E2E8F0" font-weight="600">Interoperability</text>
  <text x="88" y="362" font-family="system-ui, sans-serif" font-size="28" fill="#CBD5E1">Compare 9 Global Regimes · Audit ${dataset.useCases.length} Concrete AI Systems · Cite ${dataset.mappings.length} Clauses</text>
  <rect x="88" y="422" width="310" height="72" rx="8" fill="#064E3B" stroke="#10B981"/>
  <text x="112" y="466" font-family="system-ui, sans-serif" font-size="24" fill="#ECFDF5" font-weight="600">Comply Once Baseline</text>
  <rect x="422" y="422" width="310" height="72" rx="8" fill="#451A03" stroke="#F59E0B"/>
  <text x="448" y="466" font-family="system-ui, sans-serif" font-size="24" fill="#FEF3C7" font-weight="600">Extra Local Steps</text>
  <rect x="756" y="422" width="310" height="72" rx="8" fill="#4C0519" stroke="#F43F5E"/>
  <text x="782" y="466" font-family="system-ui, sans-serif" font-size="24" fill="#FFE4E6" font-weight="600">Direct Rule Clashes</text>
  <text x="88" y="544" font-family="ui-monospace, monospace" font-size="19" fill="#94A3B8">https://lihui-aigov.github.io/interoperability-atlas/</text>
</svg>
`;
  fs.writeFileSync(path.join(DIST_DIR, 'og-card.svg'), ogSvg, 'utf-8');
  fs.writeFileSync(path.join(DIST_DIR, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, 'utf-8');

  const sitemapEntries = [
    { loc: BASE_URL, lastmod: lastModDate, priority: '1.0' },
    { loc: `${BASE_URL}directory.html`, lastmod: lastModDate, priority: '0.9' },
  ];

  // Ensure subdirectories exist
  const compareDir = path.join(DIST_DIR, 'compare');
  const useCasesDir = path.join(DIST_DIR, 'use-cases');
  const instrumentsDir = path.join(DIST_DIR, 'instruments');
  const spotlightsDir = path.join(DIST_DIR, 'spotlights');
  for (const dir of [compareDir, useCasesDir, instrumentsDir, spotlightsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generate /compare/<pair>.html pages (all overlapping framework pairs)
  for (const pair of pairwiseList) {
    const fileName = `${pair.pairSlug}.html`;
    const canonicalUrl = `${BASE_URL}compare/${encodeURIComponent(fileName)}`;
    const appDeepLink = `../?tab=compare&pair=${encodeURIComponent(pair.pairSlug)}`;
    const verdictText = buildPlainVerdictText(pair);

    const faqPairs = [
      {
        question: `How much do ${pair.instA.shortName} and ${pair.instB.shortName} overlap in practice?`,
        answer: verdictText,
      },
      {
        question: `Which controls satisfy both ${pair.instA.shortName} and ${pair.instB.shortName} at the same time?`,
        answer:
          pair.eq > 0
            ? `Shared Comply Once controls (${pair.eq}) cover: ${pair.contexts
                .filter((c) => c.status === 'equivalent')
                .slice(0, 4)
                .map((c) => `${c.control?.title || c.controlId} (${c.useCase?.title || c.useCaseId})`)
                .join('; ')}.`
            : `No shared Comply Once controls are recorded yet across the co-mapped deployments for ${pair.instA.shortName} and ${pair.instB.shortName}; inspect the Extra Local Steps table below for partial overlaps.`,
      },
      {
        question: `Where do ${pair.instA.shortName} and ${pair.instB.shortName} diverge or clash?`,
        answer:
          pair.fr > 0 || pair.dl > 0
            ? `Across co-mapped AI deployments, ${pair.dl} controls add extra local steps and ${pair.fr} controls trigger direct rule clashes: ${pair.contexts
                .filter((c) => c.status !== 'equivalent')
                .slice(0, 3)
                .map((c) => `${c.control?.title || c.controlId} in ${c.useCase?.title || c.useCaseId}`)
                .join('; ')}.`
            : `No direct clashes or supplemental local steps are recorded between these two frameworks on the co-mapped systems in this dataset.`,
      },
    ];

    const tableRowsHtml = pair.contexts
      .map((ctx) => {
        const badgeCls = alignmentBadgeClass(ctx.status);
        const badgeLbl = alignmentPlainLabel(ctx.status);
        const colA = ctx.mappingsA
          .map(
            (m) =>
              `<div><a href="${escapeHtml(m.sourceUrl)}" target="_blank" rel="noopener noreferrer"><span class="pill">${escapeHtml(m.clauseCitation)}</span></a><br/><span class="muted">${escapeHtml(m.rationale)}</span></div>`
          )
          .join('');
        const colB = ctx.mappingsB
          .map(
            (m) =>
              `<div><a href="${escapeHtml(m.sourceUrl)}" target="_blank" rel="noopener noreferrer"><span class="pill">${escapeHtml(m.clauseCitation)}</span></a><br/><span class="muted">${escapeHtml(m.rationale)}</span></div>`
          )
          .join('');
        return `<tr>
          <td><strong>${escapeHtml(ctx.control?.title || ctx.controlId)}</strong><br/><span class="muted">${escapeHtml(ctx.useCase?.title || ctx.useCaseId)}</span></td>
          <td>${colA}</td>
          <td>${colB}</td>
          <td><span class="${badgeCls}">${escapeHtml(badgeLbl)}</span></td>
          <td class="muted">${escapeHtml(ctx.control?.artifactName || '')}</td>
        </tr>`;
      })
      .join('\n');

    const relatedLinks = pairwiseList
      .filter(
        (other) =>
          other.pairSlug !== pair.pairSlug &&
          (other.instA.id === pair.instA.id ||
            other.instB.id === pair.instA.id ||
            other.instA.id === pair.instB.id ||
            other.instB.id === pair.instB.id)
      )
      .slice(0, 6)
      .map(
        (rel) =>
          `<li><a href="./${encodeURIComponent(rel.pairSlug)}.html">${escapeHtml(rel.instA.shortName)} vs. ${escapeHtml(rel.instB.shortName)} (${rel.rate}% shared baseline)</a></li>`
      )
      .join('\n');

    const html = renderStaticShell({
      title: `${pair.instA.shortName} vs ${pair.instB.shortName}: AI Governance Comparison, Overlap & Gap Checklist`,
      description: verdictText.slice(0, 158),
      canonicalUrl,
      keywords: `${pair.instA.shortName} vs ${pair.instB.shortName}, ${pair.instA.title}, ${pair.instB.title}, AI governance crosswalk, AI compliance gap analysis`,
      jsonLdGraph: [
        {
          '@type': 'TechArticle',
          headline: `${pair.instA.shortName} vs ${pair.instB.shortName}: AI Governance Comparison & Gap Analysis`,
          description: verdictText,
          dateModified: lastModDate,
          author: { '@type': 'Person', name: 'Lihui Xu' },
          url: canonicalUrl,
          about: [pair.instA.title, pair.instB.title],
        },
        buildFaqSchema(faqPairs),
        buildBreadcrumbSchema([
          { name: 'Open Atlas Home', url: BASE_URL },
          { name: 'Framework Comparisons', url: `${BASE_URL}directory.html#compare-directory` },
          { name: `${pair.instA.shortName} vs ${pair.instB.shortName}`, url: canonicalUrl },
        ]),
      ],
      breadcrumbs: [
        { name: 'Open Atlas Home', href: '../' },
        { name: 'Framework Comparisons', href: '../directory.html#compare-directory' },
        { name: `${pair.instA.shortName} vs ${pair.instB.shortName}`, href: `./${fileName}` },
      ],
      bodyHtml: `
        <div class="cta-bar">
          <div>
            <strong>${escapeHtml(pair.instA.shortName)} vs. ${escapeHtml(pair.instB.shortName)}</strong><br/>
            <span style="font-size:13px;opacity:0.88;">${pair.rate}% baseline overlap · ${pair.eq} Comply Once · ${pair.dl} Extra Local Steps · ${pair.fr} Rule Clashes</span>
          </div>
          <a class="cta-btn" href="${escapeHtml(appDeepLink)}">Open Interactive Side-by-Side Gap Checker &rarr;</a>
        </div>
        <h1>${escapeHtml(pair.instA.shortName)} vs. ${escapeHtml(pair.instB.shortName)}: Overlap &amp; Gap Crosswalk</h1>
        <div class="capsule">
          <strong>Direct Summary:</strong> ${escapeHtml(verdictText)}
        </div>
        <div class="card" style="overflow-x:auto;">
          <h2>Clause-by-Clause Comparison Table (${pair.sharedCount} Shared Controls)</h2>
          <table>
            <thead>
              <tr>
                <th>Control &amp; AI System</th>
                <th>${escapeHtml(pair.instA.shortName)}</th>
                <th>${escapeHtml(pair.instB.shortName)}</th>
                <th>Alignment</th>
                <th>Verification Artifact</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
        ${renderFaqSectionHtml(faqPairs)}
        ${relatedLinks ? `<div class="card"><h2>Related Framework Comparisons</h2><ul>${relatedLinks}</ul></div>` : ''}
      `,
    });

    fs.writeFileSync(path.join(compareDir, fileName), html, 'utf-8');
    sitemapEntries.push({ loc: canonicalUrl, lastmod: lastModDate, priority: '0.9' });
  }

  // Generate /instruments/<slug>.html pages
  for (const inst of dataset.instruments) {
    const slug = instrumentToSlug(inst.id);
    const fileName = `${slug}.html`;
    const canonicalUrl = `${BASE_URL}instruments/${encodeURIComponent(fileName)}`;
    const appDeepLink = `../?tab=compare&instrument=${encodeURIComponent(inst.id)}`;
    const instMappings = dataset.mappings.filter((m) => m.instrumentId === inst.id);
    const eqCount = instMappings.filter((m) => m.alignmentType === 'equivalent').length;
    const dlCount = instMappings.filter((m) => m.alignmentType === 'delta').length;
    const frCount = instMappings.filter((m) => m.alignmentType === 'friction').length;
    const coveredUcs = new Set(instMappings.map((m) => m.useCaseId)).size;

    const directSummary = `${inst.title} (${inst.issuingBody}, ${inst.legalNature}, ${inst.adoptionYear}) covers ${instMappings.length} verified clause mappings across ${coveredUcs} concrete AI deployments in the Open Atlas: ${eqCount} share Comply Once equivalence with peer regimes, ${dlCount} add extra local requirements, and ${frCount} introduce direct rule clashes.`;

    const faqPairs = [
      {
        question: `What does ${inst.shortName} cover in the Open Atlas of AI Governance?`,
        answer: directSummary,
      },
      {
        question: `How does ${inst.shortName} align with international standards like ISO/IEC 42001 and NIST AI RMF?`,
        answer: `${eqCount} mapped provisions in ${inst.shortName} align cleanly as Comply Once baseline controls with peer technical and multilateral frameworks, while ${dlCount} require extra statutory filings or scope checks.`,
      },
      {
        question: `Where can I read the official source text for ${inst.shortName}?`,
        answer: `The primary authoritative text is published by ${inst.issuingBody} at ${inst.officialUrl}.`,
      },
    ];

    const rowsHtml = instMappings
      .map((m) => {
        const uc = ucMap.get(m.useCaseId);
        const ctrl = ctrlMap.get(m.controlId);
        return `<tr>
          <td><a href="../use-cases/${encodeURIComponent(m.useCaseId)}.html">${escapeHtml(uc?.title || m.useCaseId)}</a></td>
          <td><strong>${escapeHtml(ctrl?.title || m.controlId)}</strong><br/><span class="muted">${escapeHtml(ctrl?.artifactName || '')}</span></td>
          <td><a href="${escapeHtml(m.sourceUrl)}" target="_blank" rel="noopener noreferrer"><span class="pill">${escapeHtml(m.clauseCitation)}</span></a></td>
          <td><span class="${alignmentBadgeClass(m.alignmentType)}">${escapeHtml(alignmentPlainLabel(m.alignmentType))}</span></td>
          <td class="muted">${escapeHtml(m.rationale)}</td>
        </tr>`;
      })
      .join('\n');

    const instPairsHtml = pairwiseList
      .filter((p) => p.instA.id === inst.id || p.instB.id === inst.id)
      .map((p) => {
        const other = p.instA.id === inst.id ? p.instB : p.instA;
        return `<li><a href="../compare/${encodeURIComponent(p.pairSlug)}.html">${escapeHtml(inst.shortName)} vs. ${escapeHtml(other.shortName)}</a> (${p.rate}% shared baseline across ${p.sharedCount} controls)</li>`;
      })
      .join('\n');

    const html = renderStaticShell({
      title: `${inst.title} (${inst.adoptionYear}): Tracked Clauses, Use-Case Duties & Global Crosswalk`,
      description: directSummary.slice(0, 158),
      canonicalUrl,
      keywords: `${inst.shortName}, ${inst.title}, ${inst.issuingBody}, AI regulation clauses, AI compliance crosswalk`,
      jsonLdGraph: [
        {
          '@type': 'TechArticle',
          headline: `${inst.title}: Tracked AI Governance Clauses & Global Crosswalk`,
          description: directSummary,
          dateModified: lastModDate,
          author: { '@type': 'Person', name: 'Lihui Xu' },
          url: canonicalUrl,
          about: inst.title,
        },
        buildFaqSchema(faqPairs),
        buildBreadcrumbSchema([
          { name: 'Open Atlas Home', url: BASE_URL },
          { name: 'Tracked Frameworks', url: `${BASE_URL}directory.html#instruments-directory` },
          { name: inst.shortName, url: canonicalUrl },
        ]),
      ],
      breadcrumbs: [
        { name: 'Open Atlas Home', href: '../' },
        { name: 'Tracked Frameworks', href: '../directory.html#instruments-directory' },
        { name: inst.shortName, href: `./${fileName}` },
      ],
      bodyHtml: `
        <div class="cta-bar">
          <div>
            <strong>${escapeHtml(inst.title)}</strong><br/>
            <span style="font-size:13px;opacity:0.88;">${escapeHtml(inst.issuingBody)} · ${escapeHtml(inst.legalNature)} · ${inst.adoptionYear}</span>
          </div>
          <a class="cta-btn" href="${escapeHtml(appDeepLink)}">Compare Against Other Regimes &rarr;</a>
        </div>
        <h1>${escapeHtml(inst.title)}: Tracked Clauses &amp; Cross-Regime Obligations</h1>
        <div class="capsule">
          <strong>Direct Summary:</strong> ${escapeHtml(directSummary)} <a href="${escapeHtml(inst.officialUrl)}" target="_blank" rel="noopener noreferrer">Read official primary text &rarr;</a>
        </div>
        <div class="card">
          <p>${escapeHtml(inst.summary)}</p>
        </div>
        ${instPairsHtml ? `<div class="card"><h2>Head-to-Head Comparisons Involving ${escapeHtml(inst.shortName)}</h2><ul>${instPairsHtml}</ul></div>` : ''}
        <div class="card" style="overflow-x:auto;">
          <h2>All Mapped Clauses for ${escapeHtml(inst.shortName)} (${instMappings.length})</h2>
          <table>
            <thead>
              <tr>
                <th>AI System / Use Case</th>
                <th>Operational Control</th>
                <th>Clause</th>
                <th>Alignment</th>
                <th>Requirement Summary</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
        ${renderFaqSectionHtml(faqPairs)}
      `,
    });

    fs.writeFileSync(path.join(instrumentsDir, fileName), html, 'utf-8');
    sitemapEntries.push({ loc: canonicalUrl, lastmod: lastModDate, priority: '0.8' });
  }

  // Generate /use-cases/<id>.html pages
  for (const uc of dataset.useCases) {
    const fileName = `${uc.id}.html`;
    const canonicalUrl = `${BASE_URL}use-cases/${encodeURIComponent(fileName)}`;
    const appDeepLink = `../?tab=use-cases&useCase=${encodeURIComponent(uc.id)}`;
    const ucMappings = dataset.mappings.filter((m) => m.useCaseId === uc.id);
    const eqCount = ucMappings.filter((m) => m.alignmentType === 'equivalent').length;
    const dlCount = ucMappings.filter((m) => m.alignmentType === 'delta').length;
    const frCount = ucMappings.filter((m) => m.alignmentType === 'friction').length;
    const regCount = new Set(ucMappings.map((m) => m.instrumentId)).size;

    const directSummary = `For ${uc.title} (${uc.sector}, ${uc.riskProfile}), the Open Atlas tracks ${ucMappings.length} verified primary clauses across ${regCount} frameworks: ${eqCount} share a Comply Once operational baseline, ${dlCount} require extra local steps, and ${frCount} present direct rule clashes.`;

    const faqPairs = [
      {
        question: `Which global AI regulations apply to ${uc.title}?`,
        answer: directSummary,
      },
      {
        question: `What compliance evidence satisfies multiple regimes at once for ${uc.title}?`,
        answer:
          eqCount > 0
            ? `Teams can reuse shared artifacts across ${eqCount} equivalent clause mappings covering controls such as ${Array.from(
                new Set(
                  ucMappings
                    .filter((m) => m.alignmentType === 'equivalent')
                    .map((m) => ctrlMap.get(m.controlId)?.title || m.controlId)
                )
              )
                .slice(0, 4)
                .join(', ')}.`
            : `Review the Extra Local Steps and Rule Clashes listed in the crosswalk table below before procurement or deployment.`,
      },
      {
        question: `Are there legal prohibitions or conflicting mandates for ${uc.title}?`,
        answer:
          frCount > 0
            ? `Yes: ${frCount} clauses record a direct rule clash or prohibition, including ${ucMappings
                .filter((m) => m.alignmentType === 'friction')
                .slice(0, 2)
                .map((m) => `${instMap.get(m.instrumentId)?.shortName || m.instrumentId} (${m.clauseCitation})`)
                .join(' and ')}.`
            : `No direct cross-border legal contradictions are recorded for this system across the tracked regimes.`,
      },
    ];

    const tableRowsHtml = ucMappings
      .map((m) => {
        const inst = instMap.get(m.instrumentId);
        const ctrl = ctrlMap.get(m.controlId);
        return `<tr>
          <td><a href="../instruments/${encodeURIComponent(instrumentToSlug(m.instrumentId))}.html"><strong>${escapeHtml(inst?.shortName || m.instrumentId)}</strong></a><br/><span class="pill">${escapeHtml(m.clauseCitation)}</span></td>
          <td><strong>${escapeHtml(ctrl?.title || m.controlId)}</strong><br/><span class="muted">${escapeHtml(ctrl?.artifactName || '')}</span></td>
          <td><span class="${alignmentBadgeClass(m.alignmentType)}">${escapeHtml(alignmentPlainLabel(m.alignmentType))}</span></td>
          <td>${escapeHtml(m.rationale)} <a href="${escapeHtml(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">Official Text &rarr;</a></td>
        </tr>`;
      })
      .join('\n');

    const html = renderStaticShell({
      title: `${uc.title}: Global AI Regulation, EU AI Act, NIST & Procurement Checklist`,
      description: directSummary.slice(0, 158),
      canonicalUrl,
      keywords: `${uc.title}, ${uc.sector}, EU AI Act checklist, NIST AI RMF, ISO 42001 procurement, AI governance requirements`,
      jsonLdGraph: [
        {
          '@type': 'TechArticle',
          headline: `${uc.title} — Global AI Governance Compliance Crosswalk`,
          description: directSummary,
          dateModified: lastModDate,
          author: { '@type': 'Person', name: 'Lihui Xu' },
          about: uc.sector,
          url: canonicalUrl,
        },
        buildFaqSchema(faqPairs),
        buildBreadcrumbSchema([
          { name: 'Open Atlas Home', url: BASE_URL },
          { name: 'AI Use-Case Checklists', url: `${BASE_URL}directory.html#use-cases-directory` },
          { name: uc.title, url: canonicalUrl },
        ]),
      ],
      breadcrumbs: [
        { name: 'Open Atlas Home', href: '../' },
        { name: 'AI Use-Case Checklists', href: '../directory.html#use-cases-directory' },
        { name: uc.title, href: `./${fileName}` },
      ],
      bodyHtml: `
        <div class="cta-bar">
          <div>
            <strong>${escapeHtml(uc.title)}</strong><br/>
            <span style="font-size:13px;opacity:0.88;">${escapeHtml(uc.sector)} · ${escapeHtml(uc.riskProfile)}</span>
          </div>
          <a class="cta-btn" href="${escapeHtml(appDeepLink)}">Open Interactive Use-Case Checklist &rarr;</a>
        </div>
        <h1>${escapeHtml(uc.title)}: Global Governance Checklist</h1>
        <div class="capsule">
          <strong>Direct Summary:</strong> ${escapeHtml(directSummary)}
        </div>
        <div class="card">
          <p>${escapeHtml(uc.summary)}</p>
          <p class="muted"><strong>Deployment Context:</strong> ${escapeHtml(uc.deploymentContext)}</p>
        </div>
        <div class="card" style="overflow-x:auto;">
          <h2>Cross-Regime Obligations Table (${ucMappings.length} Verified Clauses)</h2>
          <table>
            <thead>
              <tr>
                <th>Framework &amp; Clause</th>
                <th>Operational Control &amp; Artifact</th>
                <th>Alignment</th>
                <th>Requirement &amp; Official Text</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
        ${renderFaqSectionHtml(faqPairs)}
      `,
    });

    fs.writeFileSync(path.join(useCasesDir, fileName), html, 'utf-8');
    sitemapEntries.push({ loc: canonicalUrl, lastmod: lastModDate, priority: '0.8' });
  }

  // Generate /spotlights/<id>.html pages
  for (const spot of spotlights) {
    const fileName = `${spot.id}.html`;
    const canonicalUrl = `${BASE_URL}spotlights/${encodeURIComponent(fileName)}`;
    const appDeepLink = `../?tab=spotlights&spotlight=${encodeURIComponent(spot.id)}`;
    const directAnswer = `${spot.headline} (${spot.publishedDate}, ${spot.regionTag}). ${spot.coreGovernanceQuestion} Primary evidence spans ${spot.evidenceArguments.length} cross-framework arguments and ${spot.jurisdictionViews.length} regional lenses. Bottleneck: ${spot.interoperabilityBottleneck}`;

    const argsHtml = spot.evidenceArguments
      .map(
        (a) =>
          `<li><p>${escapeHtml(a.claim)}</p><div>${a.supportingCitations
            .map((c) => `<span class="pill">${escapeHtml(c)}</span>`)
            .join('')}</div></li>`
      )
      .join('\n');

    const lensesTableRows = spot.jurisdictionViews
      .map(
        (v) => `<tr>
          <td><strong>${escapeHtml(v.lensLabel)}</strong></td>
          <td>${escapeHtml(v.stanceSummary)}</td>
          <td>${v.citedClauses.map((c) => `<span class="pill">${escapeHtml(c)}</span>`).join('')}</td>
          <td class="muted">${escapeHtml(v.leverageOrBlindSpot)}</td>
        </tr>`
      )
      .join('\n');

    const faqPairs = [
      {
        question: spot.coreGovernanceQuestion,
        answer: `${spot.evidenceArguments[0]?.claim || ''} ${spot.interoperabilityBottleneck}`.trim(),
      },
      {
        question: `What operational engineering step addresses "${spot.headline}"?`,
        answer: spot.engineeringTranslation,
      },
    ];

    const html = renderStaticShell({
      title: `${spot.headline} | Open Atlas Policy Briefing`,
      description: spot.eventSummary.slice(0, 158),
      canonicalUrl,
      keywords: `${spot.regionTag}, AI policy briefing, ${spot.evidenceArguments.flatMap((a) => a.supportingCitations).slice(0, 6).join(', ')}`,
      jsonLdGraph: [
        {
          '@type': 'AnalysisNewsArticle',
          headline: spot.headline,
          description: spot.eventSummary,
          datePublished: spot.publishedDate,
          dateModified: spot.publishedDate,
          author: { '@type': 'Person', name: 'Lihui Xu' },
          about: spot.regionTag,
          url: canonicalUrl,
        },
        buildFaqSchema(faqPairs),
        buildBreadcrumbSchema([
          { name: 'Open Atlas Home', url: BASE_URL },
          { name: 'Policy Briefings', url: `${BASE_URL}directory.html#spotlights-directory` },
          { name: spot.headline, url: canonicalUrl },
        ]),
      ],
      breadcrumbs: [
        { name: 'Open Atlas Home', href: '../' },
        { name: 'Policy Briefings', href: '../directory.html#spotlights-directory' },
        { name: spot.regionTag, href: `./${fileName}` },
      ],
      bodyHtml: `
        <div class="cta-bar">
          <div>
            <strong>In-the-News Policy Briefing</strong><br/>
            <span style="font-size:13px;opacity:0.88;">${escapeHtml(spot.publishedDate)} · ${escapeHtml(spot.regionTag)}</span>
          </div>
          <a class="cta-btn" href="${escapeHtml(appDeepLink)}">Open Interactive Briefing &rarr;</a>
        </div>
        <h1>${escapeHtml(spot.headline)}</h1>
        <p class="muted">Primary Trigger Source: <a href="${escapeHtml(spot.newsSourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(spot.newsSourceTitle)}</a></p>
        <div class="capsule">
          <strong>Core Governance Question:</strong> ${escapeHtml(spot.coreGovernanceQuestion)}
        </div>
        <div class="card">
          <p>${escapeHtml(spot.eventSummary)}</p>
        </div>
        <div class="card">
          <h2>Evidence-Backed Policy Arguments Across Frameworks</h2>
          <ol>${argsHtml}</ol>
        </div>
        <div class="card" style="overflow-x:auto;">
          <h2>Five-Region Jurisdiction Lens Matrix</h2>
          <table>
            <thead>
              <tr>
                <th>Region / Standards Lens</th>
                <th>Compliance Stance</th>
                <th>Clauses to Cite</th>
                <th>Leverage / Blind Spot</th>
              </tr>
            </thead>
            <tbody>
              ${lensesTableRows}
            </tbody>
          </table>
        </div>
        <div class="card">
          <h2>Interoperability Bottleneck &amp; Engineering Translation</h2>
          <p><strong>Where Interoperability Stalls:</strong> ${escapeHtml(spot.interoperabilityBottleneck)}</p>
          <p><strong>Policymaker-to-Engineer Control:</strong> ${escapeHtml(spot.engineeringTranslation)}</p>
        </div>
        ${renderFaqSectionHtml(faqPairs)}
      `,
    });

    fs.writeFileSync(path.join(spotlightsDir, fileName), html, 'utf-8');
    sitemapEntries.push({ loc: canonicalUrl, lastmod: spot.publishedDate || lastModDate, priority: '0.9' });
  }

  // Generate master /directory.html page
  const directoryHtml = renderStaticShell({
    title: `Complete Reference Directory | ${dataset.metadata.atlasName}`,
    description: `Browse all ${pairwiseList.length} head-to-head AI framework comparisons, ${dataset.useCases.length} concrete AI use-case checklists, ${dataset.instruments.length} tracked regimes, and ${spotlights.length} news policy briefings.`,
    canonicalUrl: `${BASE_URL}directory.html`,
    ogType: 'website',
    jsonLdGraph: [
      {
        '@type': 'CollectionPage',
        name: `${dataset.metadata.atlasName} — Full Reference Directory`,
        url: `${BASE_URL}directory.html`,
        dateModified: lastModDate,
        author: { '@type': 'Person', name: 'Lihui Xu' },
      },
      buildBreadcrumbSchema([
        { name: 'Open Atlas Home', url: BASE_URL },
        { name: 'Reference Directory', url: `${BASE_URL}directory.html` },
      ]),
    ],
    breadcrumbs: [
      { name: 'Open Atlas Home', href: './' },
      { name: 'Reference Directory', href: './directory.html' },
    ],
    bodyHtml: `
      <div class="cta-bar">
        <div>
          <strong>${escapeHtml(dataset.metadata.atlasName)} · Reference Directory</strong><br/>
          <span style="font-size:13px;opacity:0.88;">${pairwiseList.length} Framework Comparisons · ${dataset.useCases.length} AI Use Cases · ${dataset.instruments.length} Regimes · ${spotlights.length} Briefings</span>
        </div>
        <a class="cta-btn" href="./">Launch Interactive Workbench &rarr;</a>
      </div>
      <h1>Complete Reference Directory</h1>
      <div id="compare-directory" class="card">
        <h2>Head-to-Head Framework Comparisons (${pairwiseList.length})</h2>
        <ul>
          ${pairwiseList
            .map(
              (p) =>
                `<li><a href="./compare/${encodeURIComponent(p.pairSlug)}.html">${escapeHtml(p.instA.shortName)} vs. ${escapeHtml(p.instB.shortName)}</a> — ${p.rate}% baseline overlap (${p.eq} Comply Once, ${p.dl} Extra Steps, ${p.fr} Clashes)</li>`
            )
            .join('\n')}
        </ul>
      </div>
      <div id="use-cases-directory" class="card">
        <h2>Concrete AI Use-Case Compliance Checklists (${dataset.useCases.length})</h2>
        <ul>
          ${dataset.useCases
            .map(
              (u) =>
                `<li><a href="./use-cases/${encodeURIComponent(u.id)}.html">${escapeHtml(u.title)}</a> — ${escapeHtml(u.sector)}</li>`
            )
            .join('\n')}
        </ul>
      </div>
      <div id="instruments-directory" class="card">
        <h2>Tracked Global &amp; Regional Governance Instruments (${dataset.instruments.length})</h2>
        <ul>
          ${dataset.instruments
            .map(
              (i) =>
                `<li><a href="./instruments/${encodeURIComponent(instrumentToSlug(i.id))}.html">${escapeHtml(i.title)}</a> — ${escapeHtml(i.issuingBody)} (${i.adoptionYear})</li>`
            )
            .join('\n')}
        </ul>
      </div>
      <div id="spotlights-directory" class="card">
        <h2>In-the-News Policy Briefings (${spotlights.length})</h2>
        <ul>
          ${spotlights
            .map(
              (s) =>
                `<li><a href="./spotlights/${encodeURIComponent(s.id)}.html">${escapeHtml(s.headline)}</a> (${escapeHtml(s.publishedDate)} · ${escapeHtml(s.regionTag)})</li>`
            )
            .join('\n')}
        </ul>
      </div>
    `,
  });
  fs.writeFileSync(path.join(DIST_DIR, 'directory.html'), directoryHtml, 'utf-8');

  // Enrich root dist/index.html (runs after bundle-standalone.mjs)
  let indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const rootFaqPairs = [
    {
      question: 'How do I compare the EU AI Act against NIST AI RMF or ISO/IEC 42001?',
      answer:
        'Open the Compare Two Frameworks tab or pick a head-to-head comparison page to see exact clause matches sorted into Comply Once baseline controls, extra local steps, and direct rule clashes.',
    },
    {
      question: 'What is a Comply Once control vs. an Extra Local Step or Direct Rule Clash?',
      answer:
        'A Comply Once control means one shared verification artifact (such as a bias test dossier or audit log) satisfies multiple regimes at once. An Extra Local Step marks a supplemental public registration or local threshold, while a Direct Rule Clash indicates incompatible legal rules.',
    },
    {
      question: 'Can public procurement officers and policy analysts use this tool without GitHub?',
      answer:
        'Yes. The live web application runs directly in any browser with zero installation, provides one-click Markdown briefings and procurement checklists, and has printable static HTML reference pages for every use case and framework pair.',
    },
    {
      question: 'How current are the In-the-News Governance Briefings and primary citations?',
      answer:
        'A twice-weekly scheduled verification workflow checks primary texts and HTTP source links on Mondays and Thursdays, validates foreign keys and test suites, and republishes updated static pages automatically.',
    },
    {
      question: 'Under what license is the Open Atlas code and structured dataset released?',
      answer:
        'The web application source code is MIT-licensed and the structured crosswalk dataset is released under CC-BY-4.0 for independent academic, regulatory, and compliance citation.',
    },
  ];

  if (!indexHtml.includes('id="atlas-seo-jsonld"')) {
    const graphJsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: dataset.metadata.atlasName,
          url: BASE_URL,
        },
        {
          '@type': 'Dataset',
          name: dataset.metadata.atlasName,
          description:
            'Use-case-anchored computational atlas comparing global AI governance instruments across Comply Once controls, extra local steps, and direct rule clashes.',
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
            'EU AI Act vs NIST AI RMF',
            'ISO 42001 vs EU AI Act',
            'UNESCO Recommendation on the Ethics of AI',
            'AI governance interoperability',
            'CoE CETS 225',
            'Singapore Agentic AI Framework',
            'public sector AI procurement checklist',
          ],
          distribution: [
            {
              '@type': 'DataDownload',
              encodingFormat: 'application/json',
              contentUrl: `${BASE_URL}atlas-dataset.json`,
            },
          ],
        },
        {
          '@type': 'WebApplication',
          name: dataset.metadata.atlasName,
          url: BASE_URL,
          applicationCategory: 'ReferenceApplication',
          operatingSystem: 'Any',
          isAccessibleForFree: true,
        },
        buildFaqSchema(rootFaqPairs),
      ],
    };

    const headInjection = `    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <meta name="keywords" content="EU AI Act vs NIST AI RMF, ISO 42001 vs EU AI Act, UNESCO Ethics of AI, AI governance comparison, AI procurement checklist, Singapore Agentic AI, CoE CETS 225" />
    <link rel="canonical" href="${BASE_URL}" />
    <link rel="alternate" type="application/atom+xml" title="Open Atlas Briefings & Updates Feed" href="${BASE_URL}feed.xml" />
    <meta property="og:url" content="${BASE_URL}" />
    <meta property="og:image" content="${OG_IMAGE_URL}" />
    <meta name="twitter:image" content="${OG_IMAGE_URL}" />
    <script id="atlas-seo-jsonld" type="application/ld+json">${safeJsonLd(graphJsonLd)}</script>`;

    indexHtml = indexHtml.replace('</head>', () => `${headInjection}\n  </head>`);
  }

  if (!indexHtml.includes('id="atlas-seo-fallback"')) {
    const compareLinksHtml = pairwiseList
      .slice(0, 12)
      .map(
        (p) =>
          `<li><a href="./compare/${encodeURIComponent(p.pairSlug)}.html">${escapeHtml(p.instA.shortName)} vs. ${escapeHtml(p.instB.shortName)}</a> (${p.rate}% shared baseline)</li>`
      )
      .join('\n          ');
    const useCaseLinksHtml = dataset.useCases
      .map(
        (u) =>
          `<li><a href="./use-cases/${encodeURIComponent(u.id)}.html">${escapeHtml(u.title)}</a> &mdash; ${escapeHtml(u.sector)}</li>`
      )
      .join('\n          ');
    const instrumentLinksHtml = dataset.instruments
      .map(
        (i) =>
          `<li><a href="./instruments/${encodeURIComponent(instrumentToSlug(i.id))}.html">${escapeHtml(i.title)}</a> (${i.adoptionYear})</li>`
      )
      .join('\n          ');
    const spotlightLinksHtml = spotlights
      .map(
        (s) =>
          `<li><a href="./spotlights/${encodeURIComponent(s.id)}.html">${escapeHtml(s.headline)}</a> (${escapeHtml(s.publishedDate)})</li>`
      )
      .join('\n          ');

    const rootFallbackHtml = `<div id="root">
      <main id="atlas-seo-fallback" style="max-width:960px;margin:24px auto;padding:20px;font-family:system-ui,sans-serif;line-height:1.6;">
        <h1>${escapeHtml(dataset.metadata.atlasName)} (v${escapeHtml(dataset.metadata.datasetVersion)})</h1>
        <p>Independent personal-capacity research by Lihui Xu (@lihui-aigov) mapping ${dataset.useCases.length} concrete AI use cases, ${dataset.controls.length} operational controls, ${dataset.instruments.length} global regimes, and ${dataset.mappings.length} cited primary clauses into Comply Once baselines, Extra Local Steps, and Direct Rule Clashes.</p>
        <p><a href="./directory.html">Browse Complete Directory (54 Reference Pages)</a> · <a href="./atlas-dataset.json">Download Raw JSON (CC-BY-4.0)</a> · <a href="./llms.txt">llms.txt</a></p>
        <h2>Featured Framework Comparisons</h2>
        <ul>
          ${compareLinksHtml}
        </ul>
        <h2>In-the-News Governance Briefings</h2>
        <ul>
          ${spotlightLinksHtml}
        </ul>
        <h2>Concrete AI Deployment Checklists</h2>
        <ul>
          ${useCaseLinksHtml}
        </ul>
        <h2>Tracked Governance Regimes &amp; Standards</h2>
        <ul>
          ${instrumentLinksHtml}
        </ul>
      </main>
    </div>`;

    indexHtml = indexHtml.replace('<div id="root"></div>', () => rootFallbackHtml);
  }

  fs.writeFileSync(indexPath, indexHtml, 'utf-8');

  // Generate sitemap.xml, robots.txt, llms.txt, llms-full.txt, feed.xml, indexnow-urls.json
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

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    '',
    'User-agent: Bingbot',
    'Allow: /',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: ChatGPT-User',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: Claude-SearchBot',
    'Allow: /',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    'User-agent: Applebot-Extended',
    'Allow: /',
    '',
    `Sitemap: ${BASE_URL}sitemap.xml`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf-8');

  const llmsTxt = `# ${dataset.metadata.atlasName}

> Live Interactive Observatory: ${BASE_URL}
> Reference Directory: ${BASE_URL}directory.html
> Full Knowledge Corpus: ${BASE_URL}llms-full.txt
> Raw JSON Dataset (CC-BY-4.0): ${BASE_URL}atlas-dataset.json
> Atom Feed: ${BASE_URL}feed.xml
> Source Repository: https://github.com/lihui-aigov/interoperability-atlas
> Maintainer: Lihui Xu (@lihui-aigov) — Independent personal-capacity research project
> Dataset Version: ${dataset.metadata.datasetVersion} (Updated ${lastModDate})

## Core Classification Method
Every verified record links a concrete AI deployment to an operational control artifact and an authoritative clause:
- Comply Once (equivalent): Shared verification evidence satisfies multiple regimes together.
- Extra Local Step (delta): Additional statutory filing, public registration, or regional threshold.
- Direct Rule Clash (friction): Incompatible legal rule, prohibition, or reporting deadline.

## Head-to-Head Framework Comparisons (${pairwiseList.length})
${pairwiseList
  .map(
    (p) =>
      `- [${p.instA.shortName} vs ${p.instB.shortName}](${BASE_URL}compare/${encodeURIComponent(p.pairSlug)}.html) — ${p.rate}% baseline overlap (${p.eq}/${p.sharedCount} Comply Once, ${p.dl} Extra, ${p.fr} Clashes)`
  )
  .join('\n')}

## In-the-News Policy Briefings (${spotlights.length})
${spotlights
  .map(
    (s) =>
      `- [${s.headline}](${BASE_URL}spotlights/${encodeURIComponent(s.id)}.html) (${s.publishedDate}, ${s.regionTag})`
  )
  .join('\n')}

## Concrete AI Use-Case Checklists (${dataset.useCases.length})
${dataset.useCases
  .map(
    (u) =>
      `- [${u.title}](${BASE_URL}use-cases/${encodeURIComponent(u.id)}.html) — ${u.sector}`
  )
  .join('\n')}

## Tracked Governance Regimes (${dataset.instruments.length})
${dataset.instruments
  .map(
    (i) =>
      `- [${i.title}](${BASE_URL}instruments/${encodeURIComponent(instrumentToSlug(i.id))}.html) (${i.jurisdictionOrScope}, ${i.legalNature}, ${i.adoptionYear}) — ${i.officialUrl}`
  )
  .join('\n')}
`;
  fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), llmsTxt, 'utf-8');

  const llmsFullSections = [
    `# ${dataset.metadata.atlasName} — Full Reference Corpus`,
    ``,
    `Dataset Version: ${dataset.metadata.datasetVersion} | Updated: ${lastModDate} | License: MIT (code), CC-BY-4.0 (data)`,
    `Canonical Observatory: ${BASE_URL}`,
    ``,
    `## 1. Pairwise Framework Comparison Summaries (${pairwiseList.length})`,
    ...pairwiseList.map((p) => {
      const topClauses = p.contexts
        .slice(0, 6)
        .map(
          (c) =>
            `  - ${c.control?.title || c.controlId} (${c.useCase?.title || c.useCaseId}) [${alignmentPlainLabel(c.status)}]: ${c.mappingsA.map((m) => m.clauseCitation).join('; ')} <-> ${c.mappingsB.map((m) => m.clauseCitation).join('; ')}`
        )
        .join('\n');
      return `### ${p.instA.shortName} vs ${p.instB.shortName} (${BASE_URL}compare/${encodeURIComponent(p.pairSlug)}.html)\n${buildPlainVerdictText(p)}\n${topClauses}`;
    }),
    ``,
    `## 2. In-the-News Governance Briefings (${spotlights.length})`,
    ...spotlights.map((s) => {
      const args = s.evidenceArguments
        .map((a, idx) => `  ${idx + 1}. ${a.claim} [${a.supportingCitations.join('; ')}]`)
        .join('\n');
      const lenses = s.jurisdictionViews
        .map(
          (v) =>
            `  - ${v.lensLabel}: ${v.stanceSummary} Clauses: ${v.citedClauses.join('; ')} | Blind spot: ${v.leverageOrBlindSpot}`
        )
        .join('\n');
      return `### ${s.headline} (${s.publishedDate} · ${s.regionTag})\nURL: ${BASE_URL}spotlights/${encodeURIComponent(s.id)}.html\nQuestion: ${s.coreGovernanceQuestion}\nSummary: ${s.eventSummary}\nArguments:\n${args}\nRegional Lenses:\n${lenses}\nBottleneck: ${s.interoperabilityBottleneck}\nEngineering Control: ${s.engineeringTranslation}`;
    }),
    ``,
    `## 3. Concrete AI Use-Case Clause Crosswalks (${dataset.useCases.length})`,
    ...dataset.useCases.map((u) => {
      const uMaps = dataset.mappings.filter((m) => m.useCaseId === u.id);
      const mapLines = uMaps
        .map((m) => {
          const inst = instMap.get(m.instrumentId);
          const ctrl = ctrlMap.get(m.controlId);
          return `  - [${alignmentPlainLabel(m.alignmentType)}] ${inst?.shortName || m.instrumentId} (${m.clauseCitation}) | ${ctrl?.title || m.controlId}: ${m.rationale} (${m.sourceUrl})`;
        })
        .join('\n');
      return `### ${u.title} (${u.sector} · ${u.riskProfile})\nURL: ${BASE_URL}use-cases/${encodeURIComponent(u.id)}.html\nSummary: ${u.summary}\n${mapLines}`;
    }),
  ];
  fs.writeFileSync(path.join(DIST_DIR, 'llms-full.txt'), llmsFullSections.join('\n\n'), 'utf-8');

  const feedEntries = [
    ...spotlights.map((s) => ({
      id: `${BASE_URL}spotlights/${encodeURIComponent(s.id)}.html`,
      title: `[Briefing] ${s.headline}`,
      updated: toAtomDate(s.publishedDate),
      link: `${BASE_URL}spotlights/${encodeURIComponent(s.id)}.html`,
      summary: `${s.coreGovernanceQuestion} ${s.eventSummary}`,
    })),
    ...(dataset.metadata.recentUpdates || []).slice(0, 8).map((u) => ({
      id: `${BASE_URL}#update-${encodeURIComponent(u.id)}`,
      title: `[Atlas Update] ${u.summary.slice(0, 95)}`,
      updated: toAtomDate(u.timestamp),
      link: u.sourceReference || BASE_URL,
      summary: u.summary,
    })),
  ];

  const feedXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(dataset.metadata.atlasName)}</title>
  <subtitle>Policy briefings, framework gap comparisons, and primary-clause crosswalk updates across 9 global AI governance regimes.</subtitle>
  <link href="${escapeXml(BASE_URL)}feed.xml" rel="self"/>
  <link href="${escapeXml(BASE_URL)}"/>
  <updated>${escapeXml(toAtomDate(dataset.metadata.lastUpdated))}</updated>
  <id>${escapeXml(BASE_URL)}</id>
  <author>
    <name>Lihui Xu (@lihui-aigov)</name>
  </author>
${feedEntries
  .map(
    (entry) => `  <entry>
    <title>${escapeXml(entry.title)}</title>
    <link href="${escapeXml(entry.link)}"/>
    <id>${escapeXml(entry.id)}</id>
    <updated>${escapeXml(entry.updated)}</updated>
    <summary>${escapeXml(entry.summary)}</summary>
  </entry>`
  )
  .join('\n')}
</feed>
`;
  fs.writeFileSync(path.join(DIST_DIR, 'feed.xml'), feedXml, 'utf-8');

  const indexNowPayload = {
    host: 'lihui-aigov.github.io',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}${INDEXNOW_KEY}.txt`,
    urlList: sitemapEntries.map((e) => e.loc),
  };
  fs.writeFileSync(
    path.join(DIST_DIR, 'indexnow-urls.json'),
    JSON.stringify(indexNowPayload, null, 2),
    'utf-8'
  );

  console.log(
    `[seo-engine] Generated ${sitemapEntries.length} crawlable HTML pages (${pairwiseList.length} compare, ${dataset.useCases.length} use-cases, ${dataset.instruments.length} instruments, ${spotlights.length} spotlights, plus / & /directory.html), sitemap.xml, robots.txt, llms.txt, llms-full.txt, atlas-dataset.json, feed.xml, og-card.svg, and IndexNow payload.`
  );
}

main();
