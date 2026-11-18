import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { AtlasDataset } from '../types/atlas';
import {
  buildInteroperabilityBrief,
  buildUseCaseMatrix,
  computeInstrumentBreakdown,
  computePairwiseRegimeMatrix,
  countAlignments,
  generateProcurementMarkdown,
  generateUseCaseJsonExport,
} from './atlasAnalytics';
import { computeFlowLayout } from './atlasLayout';
import {
  buildResolvedClauseDetail,
  deriveSectionAnchor,
  resolveDeepLinkUrl,
  searchAtlasClauses,
} from './clauseNavigation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datasetPath = path.resolve(__dirname, '../data/atlas.json');
const seedDataset: AtlasDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

test('seed atlas.json meets strict schema, expanded corpus, and clause-navigation invariants', () => {
  assert.ok(seedDataset.useCases.length >= 10, 'Expected at least 10 concrete use cases');
  assert.ok(seedDataset.controls.length >= 8, 'Expected at least 8 operational controls');
  assert.ok(seedDataset.instruments.length >= 9, 'Expected at least 9 global instruments');
  assert.ok(seedDataset.mappings.length >= 110, 'Expected 110+ verified mappings');
  assert.ok(seedDataset.metadata.recentUpdates.length >= 5, 'Expected recent automated updates');

  const ucIds = new Set(seedDataset.useCases.map((u) => u.id));
  const ctrlIds = new Set(seedDataset.controls.map((c) => c.id));
  const instIds = new Set(seedDataset.instruments.map((i) => i.id));
  const mappingIds = new Set<string>();

  for (const m of seedDataset.mappings) {
    assert.ok(!mappingIds.has(m.id), `Duplicate mapping id: ${m.id}`);
    mappingIds.add(m.id);
    assert.ok(ucIds.has(m.useCaseId), `Invalid useCaseId on ${m.id}: ${m.useCaseId}`);
    assert.ok(ctrlIds.has(m.controlId), `Invalid controlId on ${m.id}: ${m.controlId}`);
    assert.ok(instIds.has(m.instrumentId), `Invalid instrumentId on ${m.id}: ${m.instrumentId}`);
    assert.ok(
      m.alignmentType === 'equivalent' ||
        m.alignmentType === 'delta' ||
        m.alignmentType === 'friction'
    );
    assert.ok(m.clauseCitation.length > 3, `Missing clauseCitation on ${m.id}`);
    assert.ok(m.rationale.length > 15, `Rationale too short on ${m.id}`);
    assert.ok((m.clauseExcerpt ?? '').length > 20, `Missing clauseExcerpt on ${m.id}`);
    assert.ok((m.sectionAnchor ?? '').length >= 2, `Missing sectionAnchor on ${m.id}`);
    assert.ok(Array.isArray(m.verificationSteps) && m.verificationSteps.length >= 1);
    assert.ok(m.sourceUrl.startsWith('https://'), `Invalid sourceUrl on ${m.id}`);
    assert.match(m.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('every use case has multi-regime mappings and balanced alignments', () => {
  for (const uc of seedDataset.useCases) {
    const ucMappings = seedDataset.mappings.filter((m) => m.useCaseId === uc.id);
    const counts = countAlignments(ucMappings);
    assert.ok(ucMappings.length >= 3, `${uc.id} should have at least 3 mappings`);
    assert.equal(
      counts.equivalent + counts.delta + counts.friction,
      ucMappings.length,
      `${uc.id} counts should sum to total mappings`
    );
  }
});

test('clauseNavigation resolves EUR-Lex #art_N / #anx_III deep anchors, W3C text fragments, and instant clause search', () => {
  const euArt10 = seedDataset.mappings.find((m) => m.id === 'map-wt-bias-eu')!;
  const deepArt10 = resolveDeepLinkUrl(euArt10);
  assert.equal(
    deepArt10.url,
    'https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng#art_10',
    'EUR-Lex Article 10 should deep-link directly to #art_10'
  );

  const euAnnex3 = seedDataset.mappings.find((m) => m.id === 'map-cm-bias-eu')!;
  assert.equal(deriveSectionAnchor('EU AI Act Annex III(5)(b)'), 'Annex III');
  assert.ok(resolveDeepLinkUrl(euAnnex3).url.includes('#art_10') || resolveDeepLinkUrl(euAnnex3).url.includes('#anx_III'));

  const nistMeasure = seedDataset.mappings.find((m) => m.id === 'map-wt-bias-nist')!;
  const deepNist = resolveDeepLinkUrl(nistMeasure);
  assert.ok(deepNist.url.includes('#:~:text=MEASURE%202.11'));

  const detail = buildResolvedClauseDetail(seedDataset, euArt10);
  assert.ok(detail.clauseExcerpt.includes('Article 10'));
  assert.ok(detail.peerMappings.length >= 3, 'Should list sibling framework clauses on same control');

  const searchHits = searchAtlasClauses(seedDataset, 'CETS 225');
  assert.ok(searchHits.length >= 3, 'Should find Council of Europe AI Convention clauses');
});

test('buildInteroperabilityBrief computes 80/20 core controls across UseCase, Control, and Instrument pivots', () => {
  const agentBrief = buildInteroperabilityBrief(seedDataset, {
    type: 'useCase',
    id: 'uc-agentic-public-service',
  });

  assert.equal(agentBrief.focusType, 'useCase');
  assert.ok(agentBrief.coreControls.length >= 4);
  assert.equal(agentBrief.coreControls[0].control.id, 'ctrl-agent-boundaries');
  assert.ok(agentBrief.frictionMappings.length >= 2);

  const coeBrief = buildInteroperabilityBrief(seedDataset, {
    type: 'instrument',
    id: 'inst-coe-treaty',
  });
  assert.ok(coeBrief.activeUseCaseIds.has('uc-welfare-triage'));
});

test('buildUseCaseMatrix filters accurately by alignmentType and search query', () => {
  const fullRows = buildUseCaseMatrix(seedDataset, 'uc-credit-microfinance', 'all', '');
  assert.equal(fullRows.length, 8);

  const filteredRows = buildUseCaseMatrix(seedDataset, 'uc-welfare-triage', 'delta', 'Art. 27');
  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].control.id, 'ctrl-ex-ante-fria');
});

test('generateProcurementMarkdown and generateUseCaseJsonExport produce valid deliverables', () => {
  const uc = seedDataset.useCases[0];
  const md = generateProcurementMarkdown(seedDataset, uc);
  assert.ok(md.includes('# AI Governance Procurement & Interoperability Readiness Checklist'));
  assert.ok(md.includes('## 2. Shared Core Verification Artifacts'));

  const jsonStr = generateUseCaseJsonExport(seedDataset, uc);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.useCase.id, uc.id);
  assert.ok(Array.isArray(parsed.mappings));
});

test('computeFlowLayout produces non-overlapping column bounding boxes across all dataset nodes', () => {
  const layout = computeFlowLayout(seedDataset, {
    type: 'useCase',
    id: 'uc-credit-microfinance',
  });

  assert.equal(
    layout.nodes.length,
    seedDataset.useCases.length + seedDataset.controls.length + seedDataset.instruments.length
  );
  assert.ok(layout.links.length > 0);

  for (const col of ['useCase', 'control', 'instrument'] as const) {
    const colNodes = layout.nodes.filter((n) => n.column === col);
    for (let i = 1; i < colNodes.length; i += 1) {
      const prev = colNodes[i - 1];
      const curr = colNodes[i];
      assert.ok(
        curr.y >= prev.y + prev.height,
        `Overlapping nodes in column ${col}: ${prev.id} and ${curr.id}`
      );
    }
  }
});

test('computeInstrumentBreakdown and computePairwiseRegimeMatrix accurately summarize convergence and friction', () => {
  const breakdown = computeInstrumentBreakdown(seedDataset);
  assert.equal(breakdown.length, seedDataset.instruments.length);
  const euBreakdown = breakdown.find((b) => b.instrument.id === 'inst-eu-ai-act');
  assert.ok(euBreakdown && euBreakdown.counts.total >= 30);

  const matrix = computePairwiseRegimeMatrix(seedDataset);
  assert.equal(matrix.instruments.length, seedDataset.instruments.length);
  const euNist = matrix.cellsByPair['inst-eu-ai-act']['inst-nist-ai-rmf'];
  assert.ok(euNist.sharedContextsCount >= 5);
  assert.ok(euNist.convergenceRate !== null && euNist.convergenceRate >= 50);

  const euBrKr = matrix.cellsByPair['inst-eu-ai-act']['inst-br-kr-laws'];
  assert.ok(euBrKr.frictionSharedCount >= 1);
});
