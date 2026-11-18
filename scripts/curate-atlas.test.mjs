import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  applyVerifiedAdditions,
  bumpDatasetVersion,
  isValidClauseCitation,
  parseCliArgs,
  prependChangelogSection,
  runDeterministicQualityGate,
  verifyUrlReachable,
} from './curate-atlas.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDataset = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/atlas.json'), 'utf-8')
);

test('parseCliArgs detects --dry-run and --focus flags', () => {
  assert.deepEqual(parseCliArgs([]), { dryRun: false, focusHint: '' });
  assert.deepEqual(parseCliArgs(['--dry-run', '--focus=ASEAN public procurement']), {
    dryRun: true,
    focusHint: 'ASEAN public procurement',
  });
});

test('isValidClauseCitation accepts concrete clauses and rejects vague placeholders', () => {
  assert.equal(isValidClauseCitation('EU AI Act Art. 27(1) & Annex III(5)(a)'), true);
  assert.equal(isValidClauseCitation('ISO/IEC 42001 Control A.6.2.6'), true);
  assert.equal(isValidClauseCitation('NIST AI RMF MEASURE 2.11'), true);
  assert.equal(isValidClauseCitation('UNESCO Recommendation §84'), true);

  assert.equal(isValidClauseCitation(''), false);
  assert.equal(isValidClauseCitation('N/A'), false);
  assert.equal(isValidClauseCitation('General'), false);
  assert.equal(isValidClauseCitation('Overview'), false);
  assert.equal(isValidClauseCitation('TBD'), false);
});

test('verifyUrlReachable accepts HTTP 200-399, falls back from 405 HEAD to GET, and rejects 404/network errors', async () => {
  // Direct 200 on HEAD
  const okCheck = await verifyUrlReachable('https://eur-lex.europa.eu/eli/reg/2024/1689/oj', {
    fetchImpl: async () => ({
      status: 200,
      url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    }),
  });
  assert.equal(okCheck.ok, true);
  assert.equal(okCheck.status, 200);

  // 405 Method Not Allowed on HEAD -> 206 Partial Content on GET fallback
  const headBlockedCheck = await verifyUrlReachable('https://www.iso.org/standard/81230.html', {
    fetchImpl: async (_url, opts) => {
      if (opts?.method === 'HEAD') {
        return { status: 405, url: 'https://www.iso.org/standard/81230.html' };
      }
      return {
        status: 206,
        url: 'https://www.iso.org/standard/81230.html',
        body: { cancel: async () => {} },
      };
    },
  });
  assert.equal(headBlockedCheck.ok, true);
  assert.equal(headBlockedCheck.status, 206);

  // 404 Not Found rejected
  const deadLinkCheck = await verifyUrlReachable('https://example.org/broken-policy-pdf', {
    fetchImpl: async () => ({ status: 404, url: 'https://example.org/broken-policy-pdf' }),
  });
  assert.equal(deadLinkCheck.ok, false);
  assert.equal(deadLinkCheck.status, 404);

  // Malformed scheme rejected without network call
  const malformedCheck = await verifyUrlReachable('ftp://invalid-host/doc');
  assert.equal(malformedCheck.ok, false);
});

test('runDeterministicQualityGate drops broken URLs, invalid foreign keys, duplicates, and vague citations while keeping valid edges', async () => {
  const mockFetch = async (url) => {
    if (String(url).includes('dead-link.example')) {
      return { status: 404, url };
    }
    return { status: 200, url };
  };

  const candidatePayload = {
    includeNewUseCase: true,
    newUseCase: {
      id: 'uc-grid-dispatch-agent',
      title: 'Autonomous Electrical Grid Load-Balancing & Dispatch Agent',
      sector: 'Critical Energy Infrastructure',
      summary: 'Real-time autonomous substation load-shedding and renewable dispatch control.',
      deploymentContext: 'Operated by transmission system operators managing regional power grids.',
      riskProfile: 'Safety-Critical Infrastructure',
      primaryActors: ['Grid Operators', 'Energy Regulators', 'Households'],
    },
    mappings: [
      // 1. Valid equivalent mapping on newUseCase
      {
        useCaseId: 'uc-grid-dispatch-agent',
        controlId: 'ctrl-human-override',
        instrumentId: 'inst-eu-ai-act',
        alignmentType: 'equivalent',
        clauseCitation: 'EU AI Act Annex III(2) & Art. 14(4)(e)',
        rationale:
          'Classifies safety components in electricity supply management as high-risk requiring immediate human stop-switch override.',
        sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
      },
      // 2. Valid delta mapping on newUseCase
      {
        useCaseId: 'uc-grid-dispatch-agent',
        controlId: 'ctrl-agent-boundaries',
        instrumentId: 'inst-sg-agentic',
        alignmentType: 'delta',
        clauseCitation: 'Singapore Agentic AI Framework §3.2',
        rationale:
          'Requires deterministic physical-actuation bounds preventing agentic commands from exceeding transformer thermal thresholds.',
        sourceUrl: 'https://aiverifyfoundation.sg/',
      },
      // 3. Invalid: broken URL (404) -> MUST BE DROPPED
      {
        useCaseId: 'uc-grid-dispatch-agent',
        controlId: 'ctrl-post-market',
        instrumentId: 'inst-nist-ai-rmf',
        alignmentType: 'equivalent',
        clauseCitation: 'NIST AI RMF MEASURE 4.2',
        rationale: 'Continuous telemetry monitoring of dispatch drift across seasonal demand.',
        sourceUrl: 'https://dead-link.example/404',
      },
      // 4. Invalid: non-existent controlId foreign key -> MUST BE DROPPED
      {
        useCaseId: 'uc-grid-dispatch-agent',
        controlId: 'ctrl-non-existent',
        instrumentId: 'inst-iso-42001',
        alignmentType: 'equivalent',
        clauseCitation: 'ISO/IEC 42001 Control A.9.3',
        rationale: 'Invalid foreign key control reference that would break UI rendering.',
        sourceUrl: 'https://www.iso.org/standard/81230.html',
      },
      // 5. Invalid: missing/vague clauseCitation -> MUST BE DROPPED
      {
        useCaseId: 'uc-grid-dispatch-agent',
        controlId: 'ctrl-env-footprint',
        instrumentId: 'inst-unesco-eia',
        alignmentType: 'delta',
        clauseCitation: 'General',
        rationale: 'Environmental impact considerations for grid optimization.',
        sourceUrl: 'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
      },
      // 6. Invalid: duplicate of existing seed mapping -> MUST BE DROPPED
      {
        useCaseId: 'uc-welfare-triage',
        controlId: 'ctrl-bias-audit',
        instrumentId: 'inst-eu-ai-act',
        alignmentType: 'equivalent',
        clauseCitation: 'EU AI Act Art. 10(2)(f)–(g) & Annex III(5)(a)',
        rationale: 'Duplicate of existing welfare triage bias audit mapping.',
        sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
      },
    ],
  };

  const result = await runDeterministicQualityGate(seedDataset, candidatePayload, {
    fetchImpl: mockFetch,
    verifiedDate: '2026-11-18',
  });

  assert.ok(result.validatedNewUseCase, 'Valid newUseCase should pass');
  assert.equal(result.validatedNewUseCase.id, 'uc-grid-dispatch-agent');
  assert.equal(result.acceptedMappings.length, 2, 'Only the 2 strictly valid mappings should survive');
  assert.equal(result.droppedMappings.length, 4, 'All 4 invalid/duplicate/broken-link mappings should be dropped');
});

test('runDeterministicQualityGate drops orphaned newUseCase if all of its mappings fail verification', async () => {
  const result = await runDeterministicQualityGate(
    seedDataset,
    {
      includeNewUseCase: true,
      newUseCase: {
        id: 'uc-orphan-scenario',
        title: 'Orphan Scenario With Broken Citations',
        sector: 'Public Sector',
        summary: 'Summary description here.',
        deploymentContext: 'Deployment context here.',
        riskProfile: 'High-Impact',
        primaryActors: ['Agency'],
      },
      mappings: [
        {
          useCaseId: 'uc-orphan-scenario',
          controlId: 'ctrl-bias-audit',
          instrumentId: 'inst-eu-ai-act',
          alignmentType: 'equivalent',
          clauseCitation: 'EU AI Act Art. 10',
          rationale: 'Valid rationale text over twenty characters.',
          sourceUrl: 'https://broken.example/404',
        },
      ],
    },
    {
      fetchImpl: async () => ({ status: 500, url: 'https://broken.example/404' }),
    }
  );

  assert.equal(result.validatedNewUseCase, null);
  assert.equal(result.acceptedMappings.length, 0);
  assert.ok(result.newUseCaseDropReason?.includes('0 associated mappings'));
});

test('applyVerifiedAdditions bumps datasetVersion, updates totalCounts & recentUpdates, and formats CHANGELOG.md', () => {
  const now = new Date('2026-11-18T08:30:00Z');
  assert.equal(bumpDatasetVersion('2026.11.4', now), '2026.11.5');
  assert.equal(bumpDatasetVersion('2026.10.9', now), '2026.11.1');

  const gateResult = {
    validatedNewUseCase: null,
    acceptedMappings: [
      {
        id: 'map-ps-agent-sg',
        useCaseId: 'uc-procurement-screening',
        controlId: 'ctrl-agent-boundaries',
        instrumentId: 'inst-sg-agentic',
        alignmentType: 'delta',
        clauseCitation: 'Singapore Agentic AI Framework §3.1',
        rationale: 'Requires strict read-only sandbox permissions when procurement agents query vendor registries.',
        sourceUrl: 'https://aiverifyfoundation.sg/',
        lastVerified: '2026-11-18',
      },
    ],
  };

  const { updatedDataset, updateEntry, changelogBlock } = applyVerifiedAdditions(
    seedDataset,
    gateResult,
    {
      changeType: 'new_mapping',
      summary: 'Added Singapore Agentic AI tool-scoping delta to Automated Public Procurement Screening.',
      sourceReference: 'IMDA Singapore Agentic AI Framework',
    },
    { now, runId: 'gh-run-999999' }
  );

  const expectedNextVersion = bumpDatasetVersion(seedDataset.metadata.datasetVersion, now);
  assert.equal(updatedDataset.metadata.datasetVersion, expectedNextVersion);
  assert.equal(updatedDataset.metadata.totalCounts?.mappings, seedDataset.mappings.length + 1);
  assert.equal(updatedDataset.metadata.recentUpdates[0].id, updateEntry.id);
  assert.equal(updatedDataset.mappings.length, seedDataset.mappings.length + 1);

  const existingChangelog = fs.readFileSync(
    path.resolve(__dirname, '../CHANGELOG.md'),
    'utf-8'
  );
  const updatedChangelog = prependChangelogSection(existingChangelog, changelogBlock);
  assert.ok(updatedChangelog.includes(`## [${expectedNextVersion}] — 2026-11-18 (\`gh-run-999999\`)`));
  assert.ok(
    updatedChangelog.indexOf(`[${expectedNextVersion}]`) <
      updatedChangelog.indexOf(`[${seedDataset.metadata.datasetVersion}]`),
    'New release section should appear above older entries'
  );
});

test('runDeterministicQualityGate and applyVerifiedAdditions validate and prepend newSpotlight cleanly', async () => {
  const validPayload = {
    includeNewUseCase: false,
    mappings: [],
    newSpotlight: {
      id: 'spot-procurement-transparency-ruling',
      headline: 'Municipal Public Procurement Tender AI Faces Mandatory Disclosure Challenge',
      newsSourceTitle: 'EU AI Office Regulatory Guidance Update',
      newsSourceUrl: 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
      regionTag: 'EU / Global',
      linkedUseCaseId: 'uc-procurement-screening',
      eventSummary:
        'A municipal tender review board challenged opaque bidder exclusion scores, prompting calls to reconcile procurement transparency with trade-secret protection.',
      coreGovernanceQuestion:
        'What technical disclosures make automated tender triage contestable without leaking proprietary scoring models?',
      evidenceArguments: [
        {
          claim: 'Excluded vendors require intelligible factor-level reasons rather than opaque risk scores.',
          supportingCitations: ['UNESCO Recommendation §37–39', 'EU AI Act Art. 86'],
        },
        {
          claim: 'Audit trails of human review prevent rubber-stamping vendor exclusions.',
          supportingCitations: ['ISO/IEC 42001 Control A.6.2.8'],
        },
      ],
      interoperabilityBottleneck:
        'Public procurement transparency statutes clash with vendor claims over proprietary weighting logic.',
      engineeringTranslation:
        'Log deterministic factor-level bidder threshold explanations and human committee sign-offs.',
      jurisdictionViews: [
        {
          lensId: 'global-multilateral',
          lensLabel: 'Global / Multilateral',
          stanceSummary: 'UNESCO Recommendation requires explainable public-sector adverse notices.',
          citedClauses: ['UNESCO Recommendation §37'],
          leverageOrBlindSpot: 'Strong due-process baseline.',
        },
        {
          lensId: 'eu',
          lensLabel: 'European Union',
          stanceSummary: 'EU public bodies must log oversight decisions and conduct Art. 27 FRIAs.',
          citedClauses: ['EU AI Act Art. 27'],
          leverageOrBlindSpot: 'Binding fundamental-rights filing.',
        },
        {
          lensId: 'standards-us',
          lensLabel: 'Standards & US',
          stanceSummary: 'NIST AI RMF GOVERN and ISO/IEC 42001 require supplier evaluation records.',
          citedClauses: ['ISO/IEC 42001 Control A.6.2.8'],
          leverageOrBlindSpot: 'Standardizes vendor audit evidence.',
        },
      ],
    },
  };

  const okGate = await runDeterministicQualityGate(seedDataset, validPayload, {
    fetchImpl: async (url) => ({ status: 200, url }),
    verifiedDate: '2026-11-18',
  });
  assert.ok(okGate.validatedNewSpotlight, 'Valid newSpotlight should pass quality gate');
  assert.equal(okGate.validatedNewSpotlight.id, 'spot-procurement-transparency-ruling');

  const { updatedDataset } = applyVerifiedAdditions(seedDataset, okGate, {
    changeType: 'new_mapping',
    summary: 'Published procurement tender disclosure spotlight.',
    sourceReference: 'EUR-Lex',
  });
  assert.equal(updatedDataset.spotlights[0].id, 'spot-procurement-transparency-ruling');

  const deadLinkGate = await runDeterministicQualityGate(
    seedDataset,
    {
      ...validPayload,
      newSpotlight: {
        ...validPayload.newSpotlight,
        newsSourceUrl: 'https://dead-news.example/missing',
      },
    },
    {
      fetchImpl: async () => ({ status: 404, url: 'https://dead-news.example/missing' }),
    }
  );
  assert.equal(deadLinkGate.validatedNewSpotlight, null);
  assert.ok(deadLinkGate.newSpotlightDropReason?.includes('Unreachable newsSourceUrl'));
});
