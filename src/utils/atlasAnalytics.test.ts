import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { AtlasDataset } from '../types/atlas';
import {
  buildInteroperabilityBrief,
  buildUseCaseMatrix,
  countAlignments,
  generateProcurementMarkdown,
  generateUseCaseJsonExport,
} from './atlasAnalytics';
import { computeFlowLayout } from './atlasLayout';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datasetPath = path.resolve(__dirname, '../data/atlas.json');
const seedDataset: AtlasDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

test('seed atlas.json meets strict schema & completeness invariants', () => {
  assert.equal(seedDataset.useCases.length, 6, 'Expected exactly 6 seed concrete use cases');
  assert.equal(seedDataset.controls.length, 8, 'Expected exactly 8 operational controls');
  assert.equal(seedDataset.instruments.length, 7, 'Expected exactly 7 global instruments');
  assert.ok(seedDataset.mappings.length >= 60, 'Expected rich set of verified mappings');
  assert.ok(seedDataset.metadata.recentUpdates.length >= 4, 'Expected recent automated updates');

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
    assert.ok(m.sourceUrl.startsWith('https://'), `Invalid sourceUrl on ${m.id}`);
    assert.match(m.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('every seed use case contains equivalent, delta, and friction mappings', () => {
  for (const uc of seedDataset.useCases) {
    const ucMappings = seedDataset.mappings.filter((m) => m.useCaseId === uc.id);
    const counts = countAlignments(ucMappings);
    assert.ok(counts.equivalent > 0, `${uc.id} should have at least 1 equivalent mapping`);
    assert.ok(counts.delta > 0, `${uc.id} should have at least 1 delta mapping`);
    assert.ok(counts.friction > 0, `${uc.id} should have at least 1 friction mapping`);
  }
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

  const sgBrief = buildInteroperabilityBrief(seedDataset, {
    type: 'instrument',
    id: 'inst-sg-agentic',
  });
  assert.ok(sgBrief.activeUseCaseIds.has('uc-agentic-public-service'));
  assert.ok(sgBrief.deltaMappings.length >= 2);

  const frictionOnlyBrief = buildInteroperabilityBrief(
    seedDataset,
    { type: 'useCase', id: 'uc-biometric-law-enforcement' },
    'friction'
  );
  assert.equal(frictionOnlyBrief.counts.equivalent, 0);
  assert.equal(frictionOnlyBrief.counts.delta, 0);
  assert.ok(frictionOnlyBrief.counts.friction >= 3);
});

test('buildUseCaseMatrix filters accurately by alignmentType and search query', () => {
  const fullRows = buildUseCaseMatrix(seedDataset, 'uc-welfare-triage', 'all', '');
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
  assert.ok(md.includes('EU AI Act Art. 10(2)(f)'));

  const jsonStr = generateUseCaseJsonExport(seedDataset, uc);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.useCase.id, uc.id);
  assert.ok(Array.isArray(parsed.mappings));
  assert.ok(parsed.mappings.length >= 10);
});

test('computeFlowLayout produces non-overlapping column bounding boxes and valid Bezier paths', () => {
  const layout = computeFlowLayout(seedDataset, {
    type: 'useCase',
    id: 'uc-clinical-triage',
  });

  assert.equal(layout.nodes.length, 6 + 8 + 7);
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

  for (const link of layout.links) {
    assert.match(link.d, /^M \d+\.\d \d+\.\d C /);
  }
});
