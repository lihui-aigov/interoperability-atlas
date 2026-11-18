#!/usr/bin/env node
/**
 * Autonomous Self-Updating Data Curation Pipeline
 * Open Atlas of AI Governance Interoperability (`scripts/curate-atlas.mjs`)
 *
 * Two-Step Search-Grounded Discovery + Schema-Locked Extraction + Deterministic Quality Gate:
 *   Step 1: Search-grounded regulatory discovery via @google/genai (`googleSearch` tool)
 *   Step 2: Strict schema-locked JSON extraction matching `src/types/atlas.ts`
 *   Step 3: Deterministic quality gate — HTTP 200-399 URL verification, clause-citation check,
 *           deduplication, and strict foreign-key validation (`useCaseId`, `controlId`, `instrumentId`)
 *   Step 4: Atomic update of `src/data/atlas.json` + `CHANGELOG.md` (unless `--dry-run`)
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const DEFAULT_ATLAS_PATH = path.resolve(REPO_ROOT, 'src/data/atlas.json');
export const DEFAULT_CHANGELOG_PATH = path.resolve(REPO_ROOT, 'CHANGELOG.md');
export const CURATOR_HTTP_USER_AGENT =
  'OpenAtlasGovernanceCurator/1.2 (+https://github.com/lihui-aigov/interoperability-atlas; policy-verification-bot)';

const VAGUE_CITATION_PATTERNS = /^(n\/a|none|tbd|unknown|general|various|multiple|overview|see link|website|official site)$/i;

/**
 * Parses CLI flags passed to `node scripts/curate-atlas.mjs`.
 */
export function parseCliArgs(argv = process.argv.slice(2)) {
  let dryRun = false;
  let focusHint = '';

  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '-n') {
      dryRun = true;
    } else if (arg.startsWith('--focus=')) {
      focusHint = arg.slice('--focus='.length).trim();
    }
  }

  return { dryRun, focusHint };
}

/**
 * Normalizes strings for case/punctuation-insensitive duplicate detection.
 */
export function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Ensures a clean `uc-...` kebab-case identifier for newly proposed use cases.
 */
export function sanitizeUseCaseId(rawId, fallbackTitle) {
  const base = String(rawId || fallbackTitle || '')
    .toLowerCase()
    .replace(/^uc-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 44);
  return base ? `uc-${base}` : `uc-curated-${Date.now().toString(36)}`;
}

/**
 * Ensures a clean `spot-...` kebab-case identifier for newly curated news spotlights.
 */
export function sanitizeSpotlightId(rawId, fallbackHeadline) {
  const base = String(rawId || fallbackHeadline || '')
    .toLowerCase()
    .replace(/^spot-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 44);
  return base ? `spot-${base}` : `spot-curated-${Date.now().toString(36)}`;
}

/**
 * Validates that a clause citation references a concrete statutory article, section,
 * paragraph, annex, or technical control identifier rather than a vague placeholder.
 */
export function isValidClauseCitation(citation) {
  if (typeof citation !== 'string') return false;
  const trimmed = citation.trim();
  if (trimmed.length < 5 || trimmed.length > 140) return false;
  if (VAGUE_CITATION_PATTERNS.test(trimmed)) return false;

  // Must contain a recognizable structural marker (Art., §, Clause, Control, Annex, Pillar, Section, digits, etc.)
  const hasSpecificMarker =
    /(art\.?|article|§|sec\.?|section|clause|control|annex|pillar|principle|chapter|para|measure|govern|map|manage|gv-|mp-|ms-|mg-|a\.\d|\d+)/i.test(
      trimmed
    );
  return hasSpecificMarker;
}

/**
 * Verifies with `fetch()` (clean User-Agent + timeout + redirect resolution) that
 * a candidate URL returns HTTP 200-399. Tries HEAD first and falls back to a bounded GET
 * when government/standards servers reject HEAD with 403/405.
 */
export async function verifyUrlReachable(
  url,
  { fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}
) {
  if (typeof url !== 'string' || !/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url.trim())) {
    return { ok: false, status: 0, finalUrl: url, reason: 'Malformed HTTP/HTTPS URL' };
  }

  const target = url.trim();
  const commonHeaders = {
    'User-Agent': CURATOR_HTTP_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/pdf,application/json;q=0.9,*/*;q=0.8',
  };

  try {
    const headRes = await fetchImpl(target, {
      method: 'HEAD',
      redirect: 'follow',
      headers: commonHeaders,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (headRes.status >= 200 && headRes.status <= 399) {
      return {
        ok: true,
        status: headRes.status,
        finalUrl: headRes.url || target,
      };
    }

    // Many official portals (EUR-Lex, Senate portals, ISO) disallow HEAD; fallback to ranged GET
    if (headRes.status === 405 || headRes.status === 403 || headRes.status === 400 || headRes.status === 501) {
      const getRes = await fetchImpl(target, {
        method: 'GET',
        redirect: 'follow',
        headers: { ...commonHeaders, Range: 'bytes=0-2048' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      try {
        await getRes.body?.cancel?.();
      } catch {
        // Ignore stream cancellation warnings
      }
      if (getRes.status >= 200 && getRes.status <= 399) {
        return {
          ok: true,
          status: getRes.status,
          finalUrl: getRes.url || target,
        };
      }
      return {
        ok: false,
        status: getRes.status,
        finalUrl: getRes.url || target,
        reason: `HTTP status ${getRes.status}`,
      };
    }

    return {
      ok: false,
      status: headRes.status,
      finalUrl: headRes.url || target,
      reason: `HTTP status ${headRes.status}`,
    };
  } catch (headErr) {
    // Fallback to GET if HEAD failed at network/protocol layer
    try {
      const getRes = await fetchImpl(target, {
        method: 'GET',
        redirect: 'follow',
        headers: { ...commonHeaders, Range: 'bytes=0-2048' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      try {
        await getRes.body?.cancel?.();
      } catch {
        // Ignore stream cancellation warnings
      }
      if (getRes.status >= 200 && getRes.status <= 399) {
        return {
          ok: true,
          status: getRes.status,
          finalUrl: getRes.url || target,
        };
      }
      return {
        ok: false,
        status: getRes.status,
        finalUrl: getRes.url || target,
        reason: `HTTP status ${getRes.status}`,
      };
    } catch (getErr) {
      const msg = getErr instanceof Error ? getErr.message : String(headErr);
      return {
        ok: false,
        status: 0,
        finalUrl: target,
        reason: `Network/timeout error: ${msg}`,
      };
    }
  }
}

/**
 * Summarizes current dataset coverage so Step 1 targets genuine gaps and avoids duplicates.
 */
export function summarizeDatasetCoverage(dataset) {
  const instCounts = new Map(dataset.instruments.map((i) => [i.id, 0]));
  const ctrlCounts = new Map(dataset.controls.map((c) => [c.id, 0]));
  const ucCounts = new Map(dataset.useCases.map((u) => [u.id, 0]));

  for (const m of dataset.mappings) {
    instCounts.set(m.instrumentId, (instCounts.get(m.instrumentId) ?? 0) + 1);
    ctrlCounts.set(m.controlId, (ctrlCounts.get(m.controlId) ?? 0) + 1);
    ucCounts.set(m.useCaseId, (ucCounts.get(m.useCaseId) ?? 0) + 1);
  }

  const underrepresentedInstruments = [...dataset.instruments]
    .sort((a, b) => (instCounts.get(a.id) ?? 0) - (instCounts.get(b.id) ?? 0))
    .slice(0, 4)
    .map((i) => `${i.id} (${i.shortName}: ${instCounts.get(i.id) ?? 0} mappings)`);

  const underrepresentedControls = [...dataset.controls]
    .sort((a, b) => (ctrlCounts.get(a.id) ?? 0) - (ctrlCounts.get(b.id) ?? 0))
    .slice(0, 4)
    .map((c) => `${c.id} (${c.title}: ${ctrlCounts.get(c.id) ?? 0} mappings)`);

  return {
    underrepresentedInstruments,
    underrepresentedControls,
    existingUseCasesSummary: dataset.useCases
      .map((u) => `- ${u.id}: "${u.title}" [${u.sector}] (${ucCounts.get(u.id) ?? 0} mappings)`)
      .join('\n'),
    existingControlsSummary: dataset.controls
      .map((c) => `- ${c.id}: "${c.title}" (Artifact: ${c.artifactName})`)
      .join('\n'),
    existingInstrumentsSummary: dataset.instruments
      .map((i) => `- ${i.id}: "${i.title}" — Official URL: ${i.officialUrl}`)
      .join('\n'),
    existingCitationsSample: dataset.mappings
      .map((m) => `${m.useCaseId}|${m.controlId}|${m.instrumentId}|${m.alignmentType}:${m.clauseCitation}`)
      .join('\n'),
  };
}

/**
 * Deterministic Quality Gate:
 * - Validates candidate `newUseCase` (if present) for schema completeness & non-duplication
 * - Validates every candidate `InteropMapping` for:
 *   1. Valid foreign keys (`useCaseId`, `controlId`, `instrumentId`)
 *   2. Specific `clauseCitation` & concise operational `rationale`
 *   3. Non-duplication against existing `atlas.json` and within the candidate batch
 *   4. Live HTTP 200-399 reachability of `sourceUrl` via `fetch()`
 * - Drops orphaned `newUseCase` if zero mappings referencing it survive verification
 */
export async function runDeterministicQualityGate(
  dataset,
  candidatePayload,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = 10000,
    verifiedDate = new Date().toISOString().slice(0, 10),
  } = {}
) {
  const droppedMappings = [];
  let validatedNewUseCase = null;
  let newUseCaseDropReason = null;

  const existingUseCaseIds = new Set(dataset.useCases.map((u) => u.id));
  const existingUseCaseTitles = new Set(dataset.useCases.map((u) => normalizeKey(u.title)));
  const validControlIds = new Set(dataset.controls.map((c) => c.id));
  const validInstrumentIds = new Set(dataset.instruments.map((i) => i.id));
  const existingMappingIds = new Set(dataset.mappings.map((m) => m.id));

  // Tuple & citation deduplication indexes
  const existingEdgeTuples = new Set(
    dataset.mappings.map(
      (m) => `${m.useCaseId}::${m.controlId}::${m.instrumentId}::${m.alignmentType}`
    )
  );
  const existingCitationTuples = new Set(
    dataset.mappings.map(
      (m) => `${m.useCaseId}::${m.instrumentId}::${normalizeKey(m.clauseCitation)}`
    )
  );

  // 1. Validate optional candidate newUseCase
  if (candidatePayload?.includeNewUseCase && candidatePayload?.newUseCase) {
    const rawUc = candidatePayload.newUseCase;
    const candidateId = sanitizeUseCaseId(rawUc.id, rawUc.title);
    const normTitle = normalizeKey(rawUc.title);

    if (!rawUc.title || String(rawUc.title).trim().length < 8) {
      newUseCaseDropReason = 'Candidate use case title is missing or too short';
    } else if (existingUseCaseIds.has(candidateId) || existingUseCaseTitles.has(normTitle)) {
      newUseCaseDropReason = `Duplicate of existing use case (${candidateId})`;
    } else if (
      !rawUc.sector ||
      !rawUc.summary ||
      !rawUc.deploymentContext ||
      !rawUc.riskProfile ||
      !Array.isArray(rawUc.primaryActors) ||
      rawUc.primaryActors.filter(Boolean).length === 0
    ) {
      newUseCaseDropReason = 'Candidate use case missing required schema fields';
    } else {
      validatedNewUseCase = {
        id: candidateId,
        title: String(rawUc.title).trim(),
        sector: String(rawUc.sector).trim(),
        summary: String(rawUc.summary).trim(),
        deploymentContext: String(rawUc.deploymentContext).trim(),
        riskProfile: String(rawUc.riskProfile).trim(),
        primaryActors: rawUc.primaryActors.map((a) => String(a).trim()).filter(Boolean).slice(0, 5),
      };
    }
  }

  const allowedUseCaseIds = new Set(existingUseCaseIds);
  if (validatedNewUseCase) {
    allowedUseCaseIds.add(validatedNewUseCase.id);
  }

  // URL verification cache within this run
  const urlCheckCache = new Map();
  const verifyCached = async (rawUrl) => {
    const key = String(rawUrl || '').trim();
    if (urlCheckCache.has(key)) return urlCheckCache.get(key);
    const result = await verifyUrlReachable(key, { fetchImpl, timeoutMs });
    urlCheckCache.set(key, result);
    return result;
  };

  const acceptedMappings = [];
  const rawMappings = Array.isArray(candidatePayload?.mappings) ? candidatePayload.mappings : [];

  for (let idx = 0; idx < rawMappings.length; idx += 1) {
    const raw = rawMappings[idx];
    if (!raw || typeof raw !== 'object') {
      droppedMappings.push({ candidate: raw, reason: 'Malformed mapping object' });
      continue;
    }

    // Remap candidate's raw newUseCase.id if sanitizeUseCaseId normalized it
    let targetUseCaseId = String(raw.useCaseId || '').trim();
    if (
      validatedNewUseCase &&
      candidatePayload?.newUseCase?.id &&
      targetUseCaseId === String(candidatePayload.newUseCase.id).trim()
    ) {
      targetUseCaseId = validatedNewUseCase.id;
    }

    const controlId = String(raw.controlId || '').trim();
    const instrumentId = String(raw.instrumentId || '').trim();
    const alignmentType = String(raw.alignmentType || '').trim();
    const clauseCitation = String(raw.clauseCitation || '').trim();
    const rationale = String(raw.rationale || '').trim();
    const sourceUrl = String(raw.sourceUrl || '').trim();

    if (!allowedUseCaseIds.has(targetUseCaseId)) {
      droppedMappings.push({
        candidate: raw,
        reason: `Invalid foreign key useCaseId="${targetUseCaseId}"`,
      });
      continue;
    }

    if (!validControlIds.has(controlId)) {
      droppedMappings.push({
        candidate: raw,
        reason: `Invalid foreign key controlId="${controlId}"`,
      });
      continue;
    }

    if (!validInstrumentIds.has(instrumentId)) {
      droppedMappings.push({
        candidate: raw,
        reason: `Invalid foreign key instrumentId="${instrumentId}"`,
      });
      continue;
    }

    if (
      alignmentType !== 'equivalent' &&
      alignmentType !== 'delta' &&
      alignmentType !== 'friction'
    ) {
      droppedMappings.push({
        candidate: raw,
        reason: `Invalid alignmentType="${alignmentType}"`,
      });
      continue;
    }

    if (!isValidClauseCitation(clauseCitation)) {
      droppedMappings.push({
        candidate: raw,
        reason: `Missing or non-specific clauseCitation="${clauseCitation}"`,
      });
      continue;
    }

    if (rationale.length < 20) {
      droppedMappings.push({
        candidate: raw,
        reason: 'Rationale too short (< 20 chars)',
      });
      continue;
    }

    const edgeTuple = `${targetUseCaseId}::${controlId}::${instrumentId}::${alignmentType}`;
    const citationTuple = `${targetUseCaseId}::${instrumentId}::${normalizeKey(clauseCitation)}`;

    if (existingEdgeTuples.has(edgeTuple) || existingCitationTuples.has(citationTuple)) {
      droppedMappings.push({
        candidate: raw,
        reason: `Duplicate mapping or citation (${edgeTuple})`,
      });
      continue;
    }

    // Live HTTP 200-399 reachability check
    const urlStatus = await verifyCached(sourceUrl);
    if (!urlStatus.ok) {
      droppedMappings.push({
        candidate: raw,
        reason: `Unreachable sourceUrl "${sourceUrl}" (${urlStatus.reason})`,
      });
      continue;
    }

    // Construct deterministic unique ID
    const slugFragment = `${targetUseCaseId.replace(/^uc-/, '').slice(0, 10)}-${controlId
      .replace(/^ctrl-/, '')
      .slice(0, 8)}-${instrumentId.replace(/^inst-/, '').slice(0, 8)}`;
    let mappingId = `map-${slugFragment}`;
    let suffix = 2;
    while (existingMappingIds.has(mappingId)) {
      mappingId = `map-${slugFragment}-${suffix}`;
      suffix += 1;
    }

    existingMappingIds.add(mappingId);
    existingEdgeTuples.add(edgeTuple);
    existingCitationTuples.add(citationTuple);

    // Avoid storing ephemeral redirect wrapper URLs if finalUrl resolved cleanly to https
    const resolvedUrl =
      urlStatus.finalUrl &&
      /^https?:\/\//i.test(urlStatus.finalUrl) &&
      !sourceUrl.includes('vertexaisearch.cloud.google.com')
        ? sourceUrl
        : urlStatus.finalUrl || sourceUrl;

    if (resolvedUrl.includes('vertexaisearch.cloud.google.com')) {
      droppedMappings.push({
        candidate: raw,
        reason: `Ephemeral grounding redirect URL did not resolve to canonical domain: "${resolvedUrl}"`,
      });
      continue;
    }

    const clauseExcerpt =
      typeof raw.clauseExcerpt === 'string' && raw.clauseExcerpt.trim().length > 15
        ? raw.clauseExcerpt.trim()
        : undefined;
    const sectionAnchor =
      typeof raw.sectionAnchor === 'string' && raw.sectionAnchor.trim().length > 1
        ? raw.sectionAnchor.trim()
        : undefined;
    const verificationSteps =
      Array.isArray(raw.verificationSteps) && raw.verificationSteps.filter(Boolean).length > 0
        ? raw.verificationSteps.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
        : undefined;

    acceptedMappings.push({
      id: mappingId,
      useCaseId: targetUseCaseId,
      controlId,
      instrumentId,
      alignmentType,
      clauseCitation,
      rationale,
      sourceUrl: resolvedUrl,
      lastVerified: verifiedDate,
      ...(sectionAnchor ? { sectionAnchor } : {}),
      ...(clauseExcerpt ? { clauseExcerpt } : {}),
      ...(verificationSteps ? { verificationSteps } : {}),
    });
  }

  // Prevent orphaned newUseCase if none of its mappings survived verification
  if (validatedNewUseCase) {
    const linkedMappings = acceptedMappings.filter(
      (m) => m.useCaseId === validatedNewUseCase.id
    );
    if (linkedMappings.length === 0) {
      newUseCaseDropReason =
        'Dropped candidate newUseCase because 0 associated mappings passed URL/citation verification';
      validatedNewUseCase = null;
    }
  }

  // Validate optional candidate NewsSpotlight without blocking valid mappings
  let validatedNewSpotlight = null;
  let newSpotlightDropReason = null;

  if (candidatePayload?.newSpotlight && typeof candidatePayload.newSpotlight === 'object') {
    const rawSpot = candidatePayload.newSpotlight;
    const existingSpotlights = Array.isArray(dataset.spotlights) ? dataset.spotlights : [];
    const existingSpotIds = new Set(existingSpotlights.map((s) => s.id));
    const existingSpotHeadlines = new Set(existingSpotlights.map((s) => normalizeKey(s.headline)));

    const candidateSpotId = sanitizeSpotlightId(rawSpot.id, rawSpot.headline);
    const headline = String(rawSpot.headline || '').trim();
    const newsSourceTitle = String(rawSpot.newsSourceTitle || '').trim();
    const newsSourceUrlRaw = String(rawSpot.newsSourceUrl || '').trim();
    const regionTag = String(rawSpot.regionTag || 'Global').trim();
    const eventSummary = String(rawSpot.eventSummary || '').trim();
    const coreGovernanceQuestion = String(rawSpot.coreGovernanceQuestion || '').trim();
    const interoperabilityBottleneck = String(rawSpot.interoperabilityBottleneck || '').trim();
    const engineeringTranslation = String(rawSpot.engineeringTranslation || '').trim();

    let linkedUseCaseId = String(rawSpot.linkedUseCaseId || '').trim();
    if (
      validatedNewUseCase &&
      candidatePayload?.newUseCase?.id &&
      linkedUseCaseId === String(candidatePayload.newUseCase.id).trim()
    ) {
      linkedUseCaseId = validatedNewUseCase.id;
    }

    const postGateUseCaseIds = new Set(existingUseCaseIds);
    if (validatedNewUseCase) postGateUseCaseIds.add(validatedNewUseCase.id);

    const validLensIds = new Set([
      'global-multilateral',
      'eu',
      'apac-asean',
      'africa-latam',
      'standards-us',
    ]);

    const evidenceArguments = Array.isArray(rawSpot.evidenceArguments)
      ? rawSpot.evidenceArguments
          .filter(
            (a) =>
              a &&
              typeof a.claim === 'string' &&
              a.claim.trim().length > 15 &&
              Array.isArray(a.supportingCitations) &&
              a.supportingCitations.filter(Boolean).length > 0
          )
          .map((a) => ({
            claim: String(a.claim).trim(),
            supportingCitations: a.supportingCitations.map((c) => String(c).trim()).filter(Boolean).slice(0, 4),
          }))
          .slice(0, 5)
      : [];

    const jurisdictionViews = Array.isArray(rawSpot.jurisdictionViews)
      ? rawSpot.jurisdictionViews
          .filter(
            (v) =>
              v &&
              validLensIds.has(String(v.lensId)) &&
              typeof v.stanceSummary === 'string' &&
              v.stanceSummary.trim().length > 15 &&
              Array.isArray(v.citedClauses) &&
              v.citedClauses.filter(Boolean).length > 0 &&
              typeof v.leverageOrBlindSpot === 'string' &&
              v.leverageOrBlindSpot.trim().length > 10
          )
          .map((v) => ({
            lensId: String(v.lensId),
            lensLabel: String(v.lensLabel || v.lensId).trim(),
            stanceSummary: String(v.stanceSummary).trim(),
            citedClauses: v.citedClauses.map((c) => String(c).trim()).filter(Boolean).slice(0, 4),
            leverageOrBlindSpot: String(v.leverageOrBlindSpot).trim(),
          }))
      : [];

    if (headline.length < 15 || eventSummary.length < 30 || coreGovernanceQuestion.length < 15) {
      newSpotlightDropReason = 'Candidate newSpotlight missing headline, summary, or coreGovernanceQuestion';
    } else if (
      existingSpotIds.has(candidateSpotId) ||
      existingSpotHeadlines.has(normalizeKey(headline))
    ) {
      newSpotlightDropReason = `Duplicate of existing spotlight (${candidateSpotId})`;
    } else if (!postGateUseCaseIds.has(linkedUseCaseId)) {
      newSpotlightDropReason = `Invalid linkedUseCaseId="${linkedUseCaseId}" on candidate newSpotlight`;
    } else if (evidenceArguments.length < 2 || jurisdictionViews.length < 3) {
      newSpotlightDropReason = 'Candidate newSpotlight requires >=2 evidenceArguments and >=3 jurisdictionViews';
    } else if (interoperabilityBottleneck.length < 15 || engineeringTranslation.length < 15 || !newsSourceTitle) {
      newSpotlightDropReason = 'Candidate newSpotlight missing bottleneck, translation, or source title';
    } else {
      const spotUrlStatus = await verifyCached(newsSourceUrlRaw);
      const resolvedSpotUrl =
        spotUrlStatus.finalUrl &&
        /^https?:\/\//i.test(spotUrlStatus.finalUrl) &&
        !newsSourceUrlRaw.includes('vertexaisearch.cloud.google.com')
          ? newsSourceUrlRaw
          : spotUrlStatus.finalUrl || newsSourceUrlRaw;

      if (!spotUrlStatus.ok) {
        newSpotlightDropReason = `Unreachable newsSourceUrl "${newsSourceUrlRaw}" (${spotUrlStatus.reason})`;
      } else if (resolvedSpotUrl.includes('vertexaisearch.cloud.google.com')) {
        newSpotlightDropReason = `Ephemeral redirect newsSourceUrl did not resolve cleanly: "${resolvedSpotUrl}"`;
      } else {
        validatedNewSpotlight = {
          id: candidateSpotId,
          publishedDate: verifiedDate,
          headline,
          newsSourceTitle,
          newsSourceUrl: resolvedSpotUrl,
          regionTag,
          linkedUseCaseId,
          eventSummary,
          coreGovernanceQuestion,
          evidenceArguments,
          interoperabilityBottleneck,
          engineeringTranslation,
          jurisdictionViews,
        };
      }
    }
  }

  return {
    validatedNewUseCase,
    newUseCaseDropReason,
    acceptedMappings,
    droppedMappings,
    validatedNewSpotlight,
    newSpotlightDropReason,
  };
}

/**
 * Bumps calendar-semantic dataset version (`YYYY.MM.PATCH`).
 */
export function bumpDatasetVersion(currentVersion, now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const prefix = `${year}.${month}.`;

  if (typeof currentVersion === 'string' && currentVersion.startsWith(prefix)) {
    const patchPart = Number.parseInt(currentVersion.slice(prefix.length), 10);
    const nextPatch = Number.isFinite(patchPart) ? patchPart + 1 : 1;
    return `${prefix}${nextPatch}`;
  }

  // If existing version is ahead or in a different calendar month, increment patch cleanly if same/later, else roll to current month
  const match = String(currentVersion || '').match(/^(\d{4})\.(\d{2})\.(\d+)$/);
  if (match) {
    const curYm = Number(match[1]) * 100 + Number(match[2]);
    const nowYm = year * 100 + (now.getUTCMonth() + 1);
    if (curYm >= nowYm) {
      return `${match[1]}.${match[2]}.${Number.parseInt(match[3], 10) + 1}`;
    }
  }

  return `${prefix}1`;
}

/**
 * Pure state transition applying verified additions to an AtlasDataset copy
 * and generating the matching Markdown release section for CHANGELOG.md.
 */
export function applyVerifiedAdditions(
  dataset,
  { validatedNewUseCase, acceptedMappings, validatedNewSpotlight = null },
  changelogMeta = {},
  {
    now = new Date(),
    runId = process.env.GITHUB_RUN_ID
      ? `gh-run-${process.env.GITHUB_RUN_ID}`
      : `curate-${now.toISOString().slice(0, 10)}`,
  } = {}
) {
  const nextUseCases = validatedNewUseCase
    ? [...dataset.useCases, validatedNewUseCase]
    : [...dataset.useCases];
  const nextMappings = [...dataset.mappings, ...acceptedMappings];
  const existingSpotlights = Array.isArray(dataset.spotlights) ? dataset.spotlights : [];
  const nextSpotlights = validatedNewSpotlight
    ? [validatedNewSpotlight, ...existingSpotlights].slice(0, 12)
    : existingSpotlights;

  const nextVersion = bumpDatasetVersion(dataset.metadata.datasetVersion, now);
  const isoTimestamp = now.toISOString();

  const validChangeTypes = new Set([
    'instrument_update',
    'new_mapping',
    'citation_verified',
    'friction_alert',
  ]);
  const defaultChangeType = acceptedMappings.some((m) => m.alignmentType === 'friction')
    ? 'friction_alert'
    : 'new_mapping';
  const changeType = validChangeTypes.has(changelogMeta?.changeType)
    ? changelogMeta.changeType
    : defaultChangeType;

  const affectedSet = new Set();
  if (validatedNewUseCase) affectedSet.add(validatedNewUseCase.id);
  if (validatedNewSpotlight) affectedSet.add(validatedNewSpotlight.linkedUseCaseId);
  for (const m of acceptedMappings) {
    affectedSet.add(m.useCaseId);
    affectedSet.add(m.controlId);
    affectedSet.add(m.instrumentId);
  }

  const fallbackSummary = validatedNewUseCase
    ? `Added concrete use case "${validatedNewUseCase.title}" with ${acceptedMappings.length} verified interoperability clause mappings.`
    : `Appended ${acceptedMappings.length} verified clause mappings across global AI governance instruments.`;

  const summary =
    typeof changelogMeta?.summary === 'string' && changelogMeta.summary.trim().length > 12
      ? changelogMeta.summary.trim()
      : fallbackSummary;

  const sourceReference =
    typeof changelogMeta?.sourceReference === 'string' &&
    changelogMeta.sourceReference.trim().length > 3
      ? changelogMeta.sourceReference.trim()
      : acceptedMappings.map((m) => m.clauseCitation).slice(0, 3).join('; ');

  const updateEntry = {
    id: `upd-${isoTimestamp.slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: isoTimestamp,
    runId,
    changeType,
    summary,
    affectedIds: Array.from(affectedSet).slice(0, 8),
    sourceReference,
  };

  const totalCounts = {
    useCases: nextUseCases.length,
    controls: dataset.controls.length,
    instruments: dataset.instruments.length,
    mappings: nextMappings.length,
  };

  const updatedDataset = {
    ...dataset,
    metadata: {
      ...dataset.metadata,
      datasetVersion: nextVersion,
      lastUpdated: isoTimestamp,
      totalCounts,
      recentUpdates: [updateEntry, ...(dataset.metadata.recentUpdates || [])].slice(0, 25),
    },
    useCases: nextUseCases,
    controls: [...dataset.controls],
    instruments: [...dataset.instruments],
    mappings: nextMappings,
    ...(nextSpotlights.length > 0 ? { spotlights: nextSpotlights } : {}),
  };

  const mappingBullets = acceptedMappings
    .map(
      (m) =>
        `  - \`${m.alignmentType}\` · **${m.clauseCitation}** (\`${m.useCaseId}\` → \`${m.controlId}\` → \`${m.instrumentId}\`) — [Verified Source](${m.sourceUrl})`
    )
    .join('\n');

  const changelogBlock = [
    `## [${nextVersion}] — ${isoTimestamp.slice(0, 10)} (\`${runId}\`)`,
    ``,
    `- **Change Type:** \`${changeType}\``,
    `- **Summary:** ${summary}`,
    validatedNewUseCase
      ? `- **New Use Case Added:** \`${validatedNewUseCase.id}\` — *${validatedNewUseCase.title}* (${validatedNewUseCase.sector})`
      : null,
    validatedNewSpotlight
      ? `- **News Spotlight Published:** \`${validatedNewSpotlight.id}\` — *${validatedNewSpotlight.headline}* ([Source](${validatedNewSpotlight.newsSourceUrl}))`
      : null,
    `- **Verified Mappings Added (${acceptedMappings.length}):**`,
    mappingBullets,
    `- **Source Reference:** ${sourceReference}`,
    `- **Dataset Totals:** ${totalCounts.useCases} Use Cases · ${totalCounts.controls} Operational Controls · ${totalCounts.instruments} Global Instruments · ${totalCounts.mappings} Verified Citations`,
    ``,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return {
    updatedDataset,
    updateEntry,
    changelogBlock,
  };
}

/**
 * Inserts a new release block into CHANGELOG.md right after the header divider (`---`),
 * or creates CHANGELOG.md if absent.
 */
export function prependChangelogSection(existingMarkdown, changelogBlock) {
  const headerTemplate = `# Open Atlas of AI Governance Interoperability — Dataset Changelog\n\nAll verified autonomous and editorial updates to \`src/data/atlas.json\` are recorded in this log.\n\n---\n\n`;
  if (!existingMarkdown || !existingMarkdown.trim()) {
    return `${headerTemplate}${changelogBlock}`;
  }

  const dividerIndex = existingMarkdown.indexOf('\n---\n');
  if (dividerIndex !== -1) {
    const insertPos = dividerIndex + '\n---\n'.length;
    return `${existingMarkdown.slice(0, insertPos)}\n${changelogBlock}\n${existingMarkdown
      .slice(insertPos)
      .replace(/^\n+/, '')}`;
  }

  return `${existingMarkdown.trimEnd()}\n\n${changelogBlock}\n`;
}

const FALLBACK_GEMINI_MODEL = 'gemini-3.8-flash';

function isModelUnavailableError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return /404|not found|not supported|unknown model|deprecated/i.test(msg);
}

async function generateContentWithFallback(ai, primaryModel, requestParams) {
  try {
    return await ai.models.generateContent({
      ...requestParams,
      model: primaryModel,
    });
  } catch (err) {
    if (!isModelUnavailableError(err) || primaryModel === FALLBACK_GEMINI_MODEL) {
      throw err;
    }
    console.warn(
      `[atlas-curator] Primary model "${primaryModel}" unavailable; retrying with "${FALLBACK_GEMINI_MODEL}"...`
    );
    return await ai.models.generateContent({
      ...requestParams,
      model: FALLBACK_GEMINI_MODEL,
    });
  }
}

/**
 * STEP 1: Search-Grounded Discovery via @google/genai + `googleSearch` tool.
 */
export async function discoverGovernanceDevelopments(ai, model, dataset, focusHint = '') {
  const coverage = summarizeDatasetCoverage(dataset);

  const discoverySystemInstruction = `You are an authoritative international AI governance legal researcher curating the Open Atlas of AI Governance Interoperability.
Your job in Step 1 is to use Google Search to find concrete, verifiable, real-world AI governance obligations, technical standards clauses, public procurement rules, or regulatory sandboxes (across UNESCO, EU AI Office / EU AI Act, ISO/IEC 42001, NIST AI RMF, Singapore IMDA / Agentic AI Framework, African Union Continental AI Strategy, ASEAN, Brazil PL 2338, South Korea AI Basic Act, and sectoral health/finance/public-sector regulators).

Focus on:
1. Underrepresented instruments in our dataset: ${coverage.underrepresentedInstruments.join(', ')}
2. Underrepresented operational controls: ${coverage.underrepresentedControls.join(', ')}
3. Concrete clause numbers, article numbers, section identifiers, and official public reference URLs.
4. Both shared core controls ("equivalent"), jurisdiction-specific additions ("delta"), and conflicting obligations/prohibitions ("friction").`;

  const discoveryPrompt = `Search for authoritative AI governance provisions to expand our use-case-anchored Atlas without duplicating existing entries.${
    focusHint ? `\nPriority research focus: ${focusHint}` : ''
  }

Existing Use Cases in Atlas:
${coverage.existingUseCasesSummary}

Tracked Operational Controls:
${coverage.existingControlsSummary}

Tracked Global Instruments:
${coverage.existingInstrumentsSummary}

Identify either:
(A) 3 to 5 high-value missing clause mappings (equivalent, delta, and/or friction) for our existing Use Cases that are NOT yet mapped, OR
(B) 1 concrete, high-stakes new AI deployment Use Case (e.g., Sovereign Cloud Tax Audit AI, Grid Load-Balancing Autonomous Agent, Agricultural Subsidy Satellite Verification, Municipal Flood/Wildfire Emergency Dispatch, or Public Defender Case Triage) together with 4 to 5 exact clause mappings across our tracked controls and instruments.

ALSO identify 1 recent, concrete real-world AI governance news development, regulatory enforcement action, or major public-sector deployment linked to one of our Use Cases (or the new Use Case proposed above) so we can publish a fresh Policymaker "In-the-News Governance Spotlight" brief with evidence-backed arguments across our 5 jurisdictional lenses (global-multilateral, eu, apac-asean, africa-latam, standards-us), the interoperability bottleneck, and the engineering translation.

Provide exact article/section/control citations, 1-2 sentence operational rationales, and official URLs.`;

  const response = await generateContentWithFallback(ai, model, {
    contents: discoveryPrompt,
    config: {
      systemInstruction: discoverySystemInstruction,
      tools: [{ googleSearch: {} }],
    },
  });

  const researchNotes = (response.text || '').trim();
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  const rawUrls = [];
  const seen = new Set();
  for (const chunk of groundingChunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title || uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      rawUrls.push({ uri, title });
    }
  }

  return {
    researchNotes,
    groundedUrls: rawUrls,
  };
}

/**
 * STEP 2: Schema-Locked Extraction via @google/genai (`responseMimeType: "application/json"` + `responseSchema`).
 */
export async function extractStructuredAdditions(
  ai,
  model,
  dataset,
  { researchNotes, verifiedPoolUrls }
) {
  const coverage = summarizeDatasetCoverage(dataset);
  const controlIds = dataset.controls.map((c) => c.id);
  const instrumentIds = dataset.instruments.map((i) => i.id);

  const verifiedUrlsText =
    verifiedPoolUrls.length > 0
      ? verifiedPoolUrls.map((u) => `- ${u.finalUrl} (${u.title})`).join('\n')
      : dataset.instruments.map((i) => `- ${i.officialUrl} (${i.title})`).join('\n');

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      includeNewUseCase: {
        type: Type.BOOLEAN,
        description:
          'True ONLY if introducing 1 new concrete UseCase not already in the Atlas; false if adding mappings to existing UseCases.',
      },
      newUseCase: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Kebab-case identifier prefixed with uc-, e.g., uc-grid-dispatch-agent',
          },
          title: { type: Type.STRING },
          sector: { type: Type.STRING },
          summary: { type: Type.STRING },
          deploymentContext: { type: Type.STRING },
          riskProfile: { type: Type.STRING },
          primaryActors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'id',
          'title',
          'sector',
          'summary',
          'deploymentContext',
          'riskProfile',
          'primaryActors',
        ],
      },
      mappings: {
        type: Type.ARRAY,
        description: '3 to 5 verified InteropMapping edges linking useCaseId -> controlId -> instrumentId.',
        items: {
          type: Type.OBJECT,
          properties: {
            useCaseId: {
              type: Type.STRING,
              description:
                'Must match an existing UseCase id in atlas.json, OR match newUseCase.id when includeNewUseCase is true.',
            },
            controlId: {
              type: Type.STRING,
              enum: controlIds,
            },
            instrumentId: {
              type: Type.STRING,
              enum: instrumentIds,
            },
            alignmentType: {
              type: Type.STRING,
              enum: ['equivalent', 'delta', 'friction'],
            },
            clauseCitation: {
              type: Type.STRING,
              description:
                'Exact article, section, paragraph, or control ID (e.g., "EU AI Act Art. 27(1)", "ISO/IEC 42001 Control A.8.4"). Never leave generic.',
            },
            rationale: {
              type: Type.STRING,
              description: 'Concise 1-2 sentence operational policy/engineering explanation.',
            },
            clauseExcerpt: {
              type: Type.STRING,
              description:
                'Concise 2-3 sentence authoritative summary or provision text of the specific cited clause so readers do not need to search inside the external PDF/HTML.',
            },
            sectionAnchor: {
              type: Type.STRING,
              description:
                'Exact heading or search keyword inside the official document (e.g., "Article 10", "MEASURE 2.11", "Control A.6.2.6").',
            },
            verificationSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 concrete engineering or procurement verification steps.',
            },
            sourceUrl: {
              type: Type.STRING,
              description:
                'Reachable official HTTPS URL from the Verified Grounded & Canonical URLs list.',
            },
          },
          required: [
            'useCaseId',
            'controlId',
            'instrumentId',
            'alignmentType',
            'clauseCitation',
            'rationale',
            'clauseExcerpt',
            'sectionAnchor',
            'verificationSteps',
            'sourceUrl',
          ],
        },
      },
      newSpotlight: {
        type: Type.OBJECT,
        nullable: true,
        description:
          'Optional fresh Policymaker In-the-News Governance Spotlight grounded in a verified public news/regulatory URL.',
        properties: {
          id: { type: Type.STRING, description: 'Kebab-case identifier prefixed with spot-' },
          headline: { type: Type.STRING },
          newsSourceTitle: { type: Type.STRING },
          newsSourceUrl: { type: Type.STRING },
          regionTag: { type: Type.STRING },
          linkedUseCaseId: { type: Type.STRING },
          eventSummary: { type: Type.STRING },
          coreGovernanceQuestion: { type: Type.STRING },
          evidenceArguments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                claim: { type: Type.STRING },
                supportingCitations: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['claim', 'supportingCitations'],
            },
          },
          interoperabilityBottleneck: { type: Type.STRING },
          engineeringTranslation: { type: Type.STRING },
          jurisdictionViews: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                lensId: {
                  type: Type.STRING,
                  enum: [
                    'global-multilateral',
                    'eu',
                    'apac-asean',
                    'africa-latam',
                    'standards-us',
                  ],
                },
                lensLabel: { type: Type.STRING },
                stanceSummary: { type: Type.STRING },
                citedClauses: { type: Type.ARRAY, items: { type: Type.STRING } },
                leverageOrBlindSpot: { type: Type.STRING },
              },
              required: [
                'lensId',
                'lensLabel',
                'stanceSummary',
                'citedClauses',
                'leverageOrBlindSpot',
              ],
            },
          },
        },
        required: [
          'id',
          'headline',
          'newsSourceTitle',
          'newsSourceUrl',
          'regionTag',
          'linkedUseCaseId',
          'eventSummary',
          'coreGovernanceQuestion',
          'evidenceArguments',
          'interoperabilityBottleneck',
          'engineeringTranslation',
          'jurisdictionViews',
        ],
      },
      changelogEntry: {
        type: Type.OBJECT,
        properties: {
          changeType: {
            type: Type.STRING,
            enum: ['instrument_update', 'new_mapping', 'citation_verified', 'friction_alert'],
          },
          summary: {
            type: Type.STRING,
            description: 'Concise 1-sentence changelog summary for recentUpdates and CHANGELOG.md.',
          },
          sourceReference: {
            type: Type.STRING,
            description: 'Concise citation of primary authorities used in this curation batch.',
          },
        },
        required: ['changeType', 'summary', 'sourceReference'],
      },
    },
    required: ['includeNewUseCase', 'mappings', 'changelogEntry'],
  };

  const existingSpotlightsList = (Array.isArray(dataset.spotlights) ? dataset.spotlights : [])
    .map((s) => `- ${s.id}: ${s.headline}`)
    .join('\n');

  const extractionPrompt = `Convert the Step 1 search-grounded governance findings below into strict schema-locked JSON for \`src/data/atlas.json\`.

HARD INVARIANTS:
1. Every mapping's \`controlId\` MUST be one of: ${controlIds.join(', ')}
2. Every mapping's \`instrumentId\` MUST be one of: ${instrumentIds.join(', ')}
3. Every mapping's \`useCaseId\` MUST either be an existing useCaseId (${dataset.useCases
    .map((u) => u.id)
    .join(', ')}) OR equal \`newUseCase.id\` when \`includeNewUseCase\` is true.
4. NEVER duplicate any of these existing mappings:
${coverage.existingCitationsSample}
5. Every \`sourceUrl\` (and \`newSpotlight.newsSourceUrl\`) MUST be selected from the pre-verified reachable URLs below:
${verifiedUrlsText}
6. If proposing \`newSpotlight\`, do not duplicate existing spotlights:
${existingSpotlightsList || '(none yet)'}

Step 1 Grounded Research Findings:
${researchNotes}`;

  const response = await generateContentWithFallback(ai, model, {
    contents: extractionPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const rawJson = (response.text || '').trim();
  if (!rawJson) {
    throw new Error('Step 2 schema-locked extraction returned an empty response.');
  }

  return JSON.parse(rawJson);
}

/**
 * End-to-end execution of the Autonomous Curation Pipeline.
 */
export async function runCurationPipeline({
  dryRun = false,
  focusHint = '',
  atlasPath = DEFAULT_ATLAS_PATH,
  changelogPath = DEFAULT_CHANGELOG_PATH,
} = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY environment variable is missing or placeholder. Set GEMINI_API_KEY before running scripts/curate-atlas.mjs.'
    );
  }

  const model = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
  const dataset = JSON.parse(fs.readFileSync(atlasPath, 'utf-8'));

  console.log(
    `[atlas-curator] Loaded ${atlasPath} (v${dataset.metadata.datasetVersion}: ${dataset.useCases.length} use cases, ${dataset.controls.length} controls, ${dataset.instruments.length} instruments, ${dataset.mappings.length} mappings)`
  );
  console.log(`[atlas-curator] Mode: ${dryRun ? 'DRY RUN (no disk writes)' : 'WRITE'} | Model: ${model}`);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // STEP 1: Search-Grounded Discovery
  console.log('[atlas-curator] Step 1/3 — Running Google Search-grounded governance discovery...');
  const { researchNotes, groundedUrls } = await discoverGovernanceDevelopments(
    ai,
    model,
    dataset,
    focusHint
  );
  console.log(
    `[atlas-curator] Step 1 complete: collected ${groundedUrls.length} grounded web chunks (${researchNotes.length} chars of findings).`
  );

  // Resolve and pre-verify grounded URLs + canonical instrument URLs
  const candidateUrlList = [
    ...groundedUrls,
    ...dataset.instruments.map((inst) => ({
      uri: inst.officialUrl,
      title: `${inst.shortName} Official Reference`,
    })),
  ];

  const verifiedPoolUrls = [];
  const seenFinalUrls = new Set();
  for (const item of candidateUrlList) {
    const check = await verifyUrlReachable(item.uri);
    if (check.ok && !seenFinalUrls.has(check.finalUrl)) {
      seenFinalUrls.add(check.finalUrl);
      verifiedPoolUrls.push({
        title: item.title,
        finalUrl: check.finalUrl,
        status: check.status,
      });
    }
  }
  console.log(
    `[atlas-curator] Pre-verified ${verifiedPoolUrls.length}/${candidateUrlList.length} reachable official reference URLs (HTTP 200-399).`
  );

  // STEP 2: Schema-Locked Extraction
  console.log('[atlas-curator] Step 2/3 — Running schema-locked JSON extraction...');
  const candidatePayload = await extractStructuredAdditions(ai, model, dataset, {
    researchNotes,
    verifiedPoolUrls,
  });

  // STEP 3: Deterministic Quality Gate
  console.log('[atlas-curator] Step 3/3 — Enforcing deterministic quality gate (HTTP 200-399 + foreign keys + citations)...');
  const gateResult = await runDeterministicQualityGate(dataset, candidatePayload);

  if (gateResult.newUseCaseDropReason) {
    console.warn(`[atlas-curator] Dropped candidate newUseCase: ${gateResult.newUseCaseDropReason}`);
  }
  if (gateResult.newSpotlightDropReason) {
    console.warn(`[atlas-curator] Dropped candidate newSpotlight: ${gateResult.newSpotlightDropReason}`);
  }
  for (const dropped of gateResult.droppedMappings) {
    console.warn(`[atlas-curator] Dropped candidate mapping: ${dropped.reason}`);
  }

  console.log(
    `[atlas-curator] Quality gate summary: ${
      gateResult.validatedNewUseCase ? '1 new UseCase, ' : '0 new UseCases, '
    }${gateResult.validatedNewSpotlight ? '1 new Spotlight, ' : '0 new Spotlights, '}${
      gateResult.acceptedMappings.length
    } verified mappings accepted, ${gateResult.droppedMappings.length} rejected.`
  );

  if (
    !gateResult.validatedNewUseCase &&
    !gateResult.validatedNewSpotlight &&
    gateResult.acceptedMappings.length === 0
  ) {
    console.log('[atlas-curator] Zero candidates passed strict verification. Leaving dataset untouched.');
    return { updated: false, gateResult };
  }

  const { updatedDataset, updateEntry, changelogBlock } = applyVerifiedAdditions(
    dataset,
    gateResult,
    candidatePayload.changelogEntry
  );

  if (dryRun) {
    console.log('\n[atlas-curator] --- DRY RUN VERIFIED CANDIDATE OUTPUT ---');
    if (gateResult.validatedNewUseCase) {
      console.log('Validated New UseCase:', JSON.stringify(gateResult.validatedNewUseCase, null, 2));
    }
    console.log('Validated Mappings:', JSON.stringify(gateResult.acceptedMappings, null, 2));
    console.log('\nProposed CHANGELOG.md Entry:\n' + changelogBlock);
    console.log('[atlas-curator] Dry run complete. No files were modified.');
    return { updated: false, dryRun: true, gateResult, updateEntry };
  }

  // Atomic file write for atlas.json
  const tmpAtlasPath = `${atlasPath}.tmp`;
  fs.writeFileSync(tmpAtlasPath, `${JSON.stringify(updatedDataset, null, 2)}\n`, 'utf-8');
  fs.renameSync(tmpAtlasPath, atlasPath);

  // Update CHANGELOG.md
  const existingChangelog = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf-8')
    : '';
  const nextChangelog = prependChangelogSection(existingChangelog, changelogBlock);
  fs.writeFileSync(changelogPath, nextChangelog, 'utf-8');

  console.log(
    `[atlas-curator] Updated src/data/atlas.json -> v${updatedDataset.metadata.datasetVersion} (${updatedDataset.metadata.totalCounts.mappings} total verified citations) and appended to CHANGELOG.md.`
  );

  return { updated: true, updatedDataset, gateResult, updateEntry };
}

// Execute CLI only when invoked directly (`node scripts/curate-atlas.mjs`)
const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
  const args = parseCliArgs(process.argv.slice(2));
  runCurationPipeline(args).catch((err) => {
    console.error(`[atlas-curator] Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
