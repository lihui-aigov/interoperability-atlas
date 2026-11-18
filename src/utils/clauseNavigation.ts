import type {
  AtlasDataset,
  GovernanceInstrument,
  InteropMapping,
  OperationalControl,
  UseCase,
} from '../types/atlas';

export interface ResolvedClauseDetail {
  mapping: InteropMapping;
  useCase: UseCase | undefined;
  control: OperationalControl | undefined;
  instrument: GovernanceInstrument | undefined;
  sectionAnchor: string;
  deepLinkUrl: string;
  hasDirectAnchor: boolean;
  clauseExcerpt: string;
  verificationSteps: string[];
  peerMappings: InteropMapping[];
}

export interface ClauseSearchResult {
  mapping: InteropMapping;
  useCaseTitle: string;
  controlTitle: string;
  instrumentShortName: string;
  sectionAnchor: string;
  matchSnippet: string;
}

/**
 * Extracts a clean, document-searchable heading/keyword from a clauseCitation
 * when `mapping.sectionAnchor` is not explicitly populated.
 */
export function deriveSectionAnchor(clauseCitation: string, explicitAnchor?: string): string {
  if (explicitAnchor && explicitAnchor.trim().length > 0) {
    return explicitAnchor.trim();
  }

  const raw = clauseCitation.trim();

  // 1. Article N -> "Article N"
  const artMatch = raw.match(/\bArt(?:icle|\.)?\s*(\d+[a-z]?)/i);
  if (artMatch) {
    return `Article ${artMatch[1]}`;
  }

  // 2. Annex Roman/Digits -> "Annex III"
  const annexMatch = raw.match(/\bAnnex\s+([IVXLC]+|\d+|[A-Z])\b/i);
  if (annexMatch) {
    return `Annex ${annexMatch[1]}`;
  }

  // 3. NIST AI RMF subcategory (GOVERN 1.2, MEASURE 2.11, GV-6.1, etc.)
  const nistMatch = raw.match(/\b((?:GOVERN|MAP|MEASURE|MANAGE)\s+\d+\.\d+|(?:GV|MP|MS|MG)-\d+\.\d+)/i);
  if (nistMatch) {
    return nistMatch[1].toUpperCase();
  }

  // 4. ISO Control A.x.y.z or Clause x.y
  const isoMatch = raw.match(/\b(Control\s+A\.\d+(?:\.\d+)*|Clause\s+\d+(?:\.\d+)*)/i);
  if (isoMatch) {
    return isoMatch[1];
  }

  // 5. Section / Paragraph symbol (§62, §3.2)
  const secMatch = raw.match(/§\s*(\d+(?:\.\d+)*)/);
  if (secMatch) {
    return raw.toLowerCase().includes('unesco') ? `${secMatch[1]}.` : `Section ${secMatch[1]}`;
  }

  return raw;
}

/**
 * Upgrades root official URLs into deep-linked section URLs using:
 * 1. Official EUR-Lex HTML element IDs (`#art_10`, `#art_27`, `#anx_III`, etc.) on `/oj/eng`
 * 2. Official NIST AI RMF Playbook function paths where applicable
 * 3. W3C Scroll-to-Text Fragment (`#:~:text=...`) for HTML documents
 */
export function resolveDeepLinkUrl(mapping: InteropMapping): {
  url: string;
  hasDirectAnchor: boolean;
} {
  const base = mapping.sourceUrl.trim();
  const anchorText = deriveSectionAnchor(mapping.clauseCitation, mapping.sectionAnchor);

  // Already contains an explicit hash fragment
  if (base.includes('#')) {
    return { url: base, hasDirectAnchor: true };
  }

  // EUR-Lex EU AI Act deterministic HTML anchor resolution
  if (base.includes('eur-lex.europa.eu/eli/reg/2024/1689')) {
    const engBase = base.endsWith('/oj') ? `${base}/eng` : base;
    const artMatch = mapping.clauseCitation.match(/\bArt(?:icle|\.)?\s*(\d+)/i);
    if (artMatch) {
      return { url: `${engBase}#art_${artMatch[1]}`, hasDirectAnchor: true };
    }
    const annexMatch = mapping.clauseCitation.match(/\bAnnex\s+([IVXLC]+)\b/i);
    if (annexMatch) {
      return { url: `${engBase}#anx_${annexMatch[1].toUpperCase()}`, hasDirectAnchor: true };
    }
  }

  // Append W3C Text Fragment so Chromium/Safari/Edge scrolls directly to and highlights the heading
  if (anchorText && anchorText.length >= 3 && anchorText.length <= 64) {
    return {
      url: `${base}#:~:text=${encodeURIComponent(anchorText)}`,
      hasDirectAnchor: true,
    };
  }

  return { url: base, hasDirectAnchor: false };
}

/**
 * Resolves full in-app Clause Reader content, synthesizing high-clarity fallback
 * normative scope & verification steps if optional fields are omitted by external scripts.
 */
export function buildResolvedClauseDetail(
  dataset: AtlasDataset,
  mapping: InteropMapping
): ResolvedClauseDetail {
  const useCase = dataset.useCases.find((u) => u.id === mapping.useCaseId);
  const control = dataset.controls.find((c) => c.id === mapping.controlId);
  const instrument = dataset.instruments.find((i) => i.id === mapping.instrumentId);

  const sectionAnchor = deriveSectionAnchor(mapping.clauseCitation, mapping.sectionAnchor);
  const { url: deepLinkUrl, hasDirectAnchor } = resolveDeepLinkUrl(mapping);

  const defaultExcerpt = instrument
    ? `Under ${instrument.title} (${mapping.clauseCitation}), ${mapping.rationale} Within "${
        useCase?.title ?? mapping.useCaseId
      }", this provision governs ${control?.title.toLowerCase() ?? 'this control domain'}.`
    : mapping.rationale;

  const clauseExcerpt =
    mapping.clauseExcerpt && mapping.clauseExcerpt.trim().length > 0
      ? mapping.clauseExcerpt.trim()
      : defaultExcerpt;

  const defaultSteps: string[] = control
    ? [
        `Produce and version-control the core artifact: ${control.artifactName}.`,
        `Execute verification protocol: ${control.verificationMethod}`,
        mapping.alignmentType === 'equivalent'
          ? `Map evidence directly to ${mapping.clauseCitation} in your multi-regime compliance matrix (no separate technical rebuild required).`
          : mapping.alignmentType === 'delta'
            ? `Complete the jurisdiction-specific delta required by ${mapping.clauseCitation} before commissioning in scope.`
            : `Escalate the normative friction under ${mapping.clauseCitation} to legal/policy counsel for architectural fencing or scope carve-out.`,
      ]
    : [`Verify operational compliance with ${mapping.clauseCitation}.`];

  const verificationSteps =
    mapping.verificationSteps && mapping.verificationSteps.length > 0
      ? mapping.verificationSteps
      : defaultSteps;

  // Sibling mappings on the same UseCase + Control across other frameworks
  const peerMappings = dataset.mappings.filter(
    (m) =>
      m.useCaseId === mapping.useCaseId &&
      m.controlId === mapping.controlId &&
      m.id !== mapping.id
  );

  return {
    mapping,
    useCase,
    control,
    instrument,
    sectionAnchor,
    deepLinkUrl,
    hasDirectAnchor,
    clauseExcerpt,
    verificationSteps,
    peerMappings,
  };
}

/**
 * Instant multi-field search across all clauses, excerpts, rationales, use cases, controls, and instruments.
 */
export function searchAtlasClauses(
  dataset: AtlasDataset,
  rawQuery: string,
  limit = 18
): ClauseSearchResult[] {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) return [];

  const ucMap = new Map(dataset.useCases.map((u) => [u.id, u]));
  const ctrlMap = new Map(dataset.controls.map((c) => [c.id, c]));
  const instMap = new Map(dataset.instruments.map((i) => [i.id, i]));

  const scored: Array<{ score: number; item: ClauseSearchResult }> = [];

  for (const m of dataset.mappings) {
    const uc = ucMap.get(m.useCaseId);
    const ctrl = ctrlMap.get(m.controlId);
    const inst = instMap.get(m.instrumentId);

    const citationLc = m.clauseCitation.toLowerCase();
    const excerptLc = (m.clauseExcerpt ?? '').toLowerCase();
    const rationaleLc = m.rationale.toLowerCase();
    const anchor = deriveSectionAnchor(m.clauseCitation, m.sectionAnchor);
    const ucTitleLc = (uc?.title ?? '').toLowerCase();
    const ctrlTitleLc = (ctrl?.title ?? '').toLowerCase();
    const instNameLc = `${inst?.shortName ?? ''} ${inst?.title ?? ''}`.toLowerCase();

    let score = 0;
    if (citationLc.includes(q)) score += 10;
    if (anchor.toLowerCase().includes(q)) score += 8;
    if (excerptLc.includes(q)) score += 6;
    if (rationaleLc.includes(q)) score += 5;
    if (ctrlTitleLc.includes(q)) score += 3;
    if (instNameLc.includes(q)) score += 3;
    if (ucTitleLc.includes(q)) score += 2;

    if (score > 0) {
      scored.push({
        score,
        item: {
          mapping: m,
          useCaseTitle: uc?.title ?? m.useCaseId,
          controlTitle: ctrl?.title ?? m.controlId,
          instrumentShortName: inst?.shortName ?? m.instrumentId,
          sectionAnchor: anchor,
          matchSnippet: m.clauseExcerpt ? m.clauseExcerpt : m.rationale,
        },
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
