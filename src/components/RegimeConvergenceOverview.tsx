import { ArrowLeftRight, BookOpen, Check, Copy, ExternalLink, Link2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  AtlasDataset,
  GovernanceInstrument,
  InteropMapping,
} from '../types/atlas';
import {
  computeInstrumentBreakdown,
  computePairwiseRegimeMatrix,
  type FocusSelection,
  type PairwiseRegimeCell,
} from '../utils/atlasAnalytics';
import {
  buildCanonicalPairSlug,
  buildPairSlug,
  buildPlainPairwiseVerdict,
  CANONICAL_BASE_URL,
  type PlainPairwiseVerdict,
} from '../utils/seoSlugs';

interface RegimeConvergenceOverviewProps {
  dataset: AtlasDataset;
  selection?: FocusSelection;
  selectedPairOverride?: { aId: string; bId: string };
  onPairChange?: (aId: string, bId: string) => void;
  onSelectEntity?: (selection: FocusSelection) => void;
  onInspectClause: (mapping: InteropMapping) => void;
  onOpenUseCaseChecklist?: (useCaseId: string) => void;
}

const COMPACT_CODE: Record<string, string> = {
  'inst-unesco-rec': 'UNESCO Rec.',
  'inst-eu-ai-act': 'EU AI Act',
  'inst-iso-42001': 'ISO 42001',
  'inst-nist-ai-rmf': 'NIST RMF',
  'inst-sg-agentic': 'SG Agentic',
  'inst-au-strategy': 'AU Strategy',
  'inst-br-kr-laws': 'BR / KR',
  'inst-coe-treaty': 'CoE Treaty',
  'inst-asean-guide': 'ASEAN',
};

const QUICK_PAIRS: { label: string; aId: string; bId: string }[] = [
  { label: 'EU AI Act × NIST RMF', aId: 'inst-eu-ai-act', bId: 'inst-nist-ai-rmf' },
  { label: 'EU AI Act × ISO 42001', aId: 'inst-eu-ai-act', bId: 'inst-iso-42001' },
  { label: 'UNESCO Rec. × EU AI Act', aId: 'inst-unesco-rec', bId: 'inst-eu-ai-act' },
  { label: 'EU AI Act × Brazil / Korea Laws', aId: 'inst-eu-ai-act', bId: 'inst-br-kr-laws' },
  { label: 'EU AI Act × Singapore Agentic AI', aId: 'inst-eu-ai-act', bId: 'inst-sg-agentic' },
];

function shortCode(id: string, fallback: string): string {
  return COMPACT_CODE[id] ?? fallback.split(' ').slice(0, 2).join(' ');
}

function resolveDefaultPair(instruments: GovernanceInstrument[]): { aId: string; bId: string } {
  const hasEu = instruments.some((i) => i.id === 'inst-eu-ai-act');
  const hasNist = instruments.some((i) => i.id === 'inst-nist-ai-rmf');
  if (hasEu && hasNist) {
    return { aId: 'inst-eu-ai-act', bId: 'inst-nist-ai-rmf' };
  }
  return {
    aId: instruments[0]?.id ?? '',
    bId: instruments[1]?.id ?? instruments[0]?.id ?? '',
  };
}

function formatPairComparisonMarkdown(
  instA: GovernanceInstrument,
  instB: GovernanceInstrument,
  cell: PairwiseRegimeCell,
  verdict: PlainPairwiseVerdict,
  canonicalPairSlug: string
): string {
  const eqItems = cell.contexts.filter((c) => c.status === 'equivalent');
  const dlItems = cell.contexts.filter((c) => c.status === 'delta');
  const frItems = cell.contexts.filter((c) => c.status === 'friction');

  const lines: string[] = [
    `# Framework Comparison Brief: ${instA.shortName} vs. ${instB.shortName}`,
    ``,
    `- **Verdict:** ${verdict.headline}`,
    `- **Summary:** ${verdict.summary}`,
    `- **Action Guidance:** ${verdict.actionAdvice}`,
    `- **Live Interactive Comparison:** ${CANONICAL_BASE_URL}?tab=compare&pair=${encodeURIComponent(buildPairSlug(instA.id, instB.id))}`,
    `- **Static Reference Sheet:** ${CANONICAL_BASE_URL}compare/${encodeURIComponent(canonicalPairSlug)}.html`,
    ``,
  ];

  const appendBucket = (heading: string, items: typeof cell.contexts) => {
    lines.push(`## ${heading} (${items.length})`, ``);
    if (items.length === 0) {
      lines.push(`_None recorded across co-mapped deployments._`, ``);
      return;
    }
    for (const ctx of items) {
      const citA = ctx.mappingsA.map((m) => m.clauseCitation).join('; ');
      const citB = ctx.mappingsB.map((m) => m.clauseCitation).join('; ');
      lines.push(
        `- **${ctx.controlTitle}** (${ctx.useCaseTitle}): ${instA.shortName} [${citA}] <-> ${instB.shortName} [${citB}]`
      );
    }
    lines.push(``);
  };

  appendBucket('1. Reusable Baseline — Comply Once', eqItems);
  appendBucket('2. Extra Local Steps', dlItems);
  appendBucket('3. Direct Rule Clashes', frItems);

  return lines.join('\n');
}

export function RegimeConvergenceOverview({
  dataset,
  selectedPairOverride,
  onPairChange,
  onInspectClause,
  onOpenUseCaseChecklist,
}: RegimeConvergenceOverviewProps) {
  const breakdown = useMemo(() => computeInstrumentBreakdown(dataset), [dataset]);
  const matrix = useMemo(() => computePairwiseRegimeMatrix(dataset), [dataset]);

  const maxTotal = useMemo(
    () => Math.max(...breakdown.map((b) => b.counts.total), 1),
    [breakdown]
  );

  const [selectedPair, setSelectedPair] = useState<{ aId: string; bId: string }>(() => {
    if (
      selectedPairOverride &&
      dataset.instruments.some((i) => i.id === selectedPairOverride.aId) &&
      dataset.instruments.some((i) => i.id === selectedPairOverride.bId) &&
      selectedPairOverride.aId !== selectedPairOverride.bId
    ) {
      return selectedPairOverride;
    }
    return resolveDefaultPair(dataset.instruments);
  });

  useEffect(() => {
    if (
      selectedPairOverride &&
      selectedPairOverride.aId &&
      selectedPairOverride.bId &&
      selectedPairOverride.aId !== selectedPairOverride.bId &&
      dataset.instruments.some((i) => i.id === selectedPairOverride.aId) &&
      dataset.instruments.some((i) => i.id === selectedPairOverride.bId)
    ) {
      setSelectedPair(selectedPairOverride);
    }
  }, [selectedPairOverride, dataset.instruments]);

  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const commitPair = (nextA: string, nextB: string) => {
    if (!nextA || !nextB || nextA === nextB) return;
    setSelectedPair({ aId: nextA, bId: nextB });
    onPairChange?.(nextA, nextB);
  };

  const handleSelectBaselineA = (newAId: string) => {
    if (newAId === selectedPair.bId) {
      commitPair(newAId, selectedPair.aId);
      return;
    }
    commitPair(newAId, selectedPair.bId);
  };

  const handleSelectTargetB = (newBId: string) => {
    if (newBId === selectedPair.aId) {
      commitPair(selectedPair.bId, newBId);
      return;
    }
    commitPair(selectedPair.aId, newBId);
  };

  const handleSwapPair = () => {
    commitPair(selectedPair.bId, selectedPair.aId);
  };

  const handleCellSelect = (aId: string, bId: string) => {
    commitPair(aId, bId);
    const verdictEl = document.getElementById('pairwise-verdict-card');
    if (verdictEl) {
      const rect = verdictEl.getBoundingClientRect();
      if (rect.top < 72 || rect.top > window.innerHeight * 0.65) {
        verdictEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const activeCell = matrix.cellsByPair[selectedPair.aId]?.[selectedPair.bId] ?? null;

  const instMap = useMemo(
    () => new Map(dataset.instruments.map((i) => [i.id, i])),
    [dataset.instruments]
  );

  const selectedInstA = instMap.get(selectedPair.aId);
  const selectedInstB = instMap.get(selectedPair.bId);

  const verdict = useMemo(() => {
    if (!selectedInstA || !selectedInstB || !activeCell) return null;
    return buildPlainPairwiseVerdict(selectedInstA, selectedInstB, activeCell);
  }, [selectedInstA, selectedInstB, activeCell]);

  const eqContexts = useMemo(
    () => activeCell?.contexts.filter((c) => c.status === 'equivalent') ?? [],
    [activeCell]
  );
  const dlContexts = useMemo(
    () => activeCell?.contexts.filter((c) => c.status === 'delta') ?? [],
    [activeCell]
  );
  const frContexts = useMemo(
    () => activeCell?.contexts.filter((c) => c.status === 'friction') ?? [],
    [activeCell]
  );

  const canonicalOrderedSlug = useMemo(
    () => buildCanonicalPairSlug(selectedPair.aId, selectedPair.bId, dataset.instruments),
    [selectedPair.aId, selectedPair.bId, dataset.instruments]
  );

  const handleCopyBrief = async () => {
    if (!selectedInstA || !selectedInstB || !activeCell || !verdict) return;
    try {
      const md = formatPairComparisonMarkdown(
        selectedInstA,
        selectedInstB,
        activeCell,
        verdict,
        canonicalOrderedSlug
      );
      await navigator.clipboard.writeText(md);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2000);
    } catch {
      // Clipboard restrictions ignored cleanly
    }
  };

  const handleCopyShareLink = async () => {
    if (!selectedInstA || !selectedInstB) return;
    try {
      const url = `${CANONICAL_BASE_URL}?tab=compare&pair=${encodeURIComponent(
        buildPairSlug(selectedInstA.id, selectedInstB.id)
      )}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard restrictions ignored cleanly
    }
  };

  return (
    <section
      id="regime-overview"
      aria-labelledby="regime-overview-heading"
      className="scroll-mt-16 bg-[var(--atlas-ground)] pt-6 pb-12"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 space-y-8">
        {/* Clean Unboxed Header & Selector Bar */}
        <div>
          <h1
            id="regime-overview-heading"
            className="font-editorial text-[26px] sm:text-[30px] font-semibold tracking-[-0.015em] leading-[1.2] text-[var(--atlas-ink)]"
          >
            Compare Two Governance Frameworks Side by Side
          </h1>
          <p className="text-sm text-[var(--atlas-ink-secondary)] mt-1 max-w-[68ch]">
            Select any two frameworks or pick a quick comparison to see shared Comply Once
            baselines, added local obligations, and direct legal clashes.
          </p>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-5">
              <label
                htmlFor="pair-select-a"
                className="block text-xs font-medium text-[var(--atlas-ink-secondary)] mb-1"
              >
                Baseline Framework
              </label>
              <select
                id="pair-select-a"
                value={selectedPair.aId}
                onChange={(e) => handleSelectBaselineA(e.target.value)}
                className="w-full text-base sm:text-sm bg-white border border-[var(--atlas-border-control)] rounded-[2px] px-3 py-2 text-[var(--atlas-ink)] focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
              >
                {dataset.instruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.shortName} — {inst.jurisdictionOrScope} ({inst.adoptionYear})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 flex justify-start lg:justify-center">
              <button
                type="button"
                onClick={handleSwapPair}
                aria-label="Swap Baseline and Target Frameworks"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--atlas-ink-secondary)] bg-[var(--atlas-surface)] hover:text-[var(--atlas-ink)] hover:bg-[var(--atlas-elevated)] border border-[var(--atlas-rule)] rounded-[2px] transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Swap</span>
              </button>
            </div>

            <div className="lg:col-span-5">
              <label
                htmlFor="pair-select-b"
                className="block text-xs font-medium text-[var(--atlas-ink-secondary)] mb-1"
              >
                Target Framework
              </label>
              <select
                id="pair-select-b"
                value={selectedPair.bId}
                onChange={(e) => handleSelectTargetB(e.target.value)}
                className="w-full text-base sm:text-sm bg-white border border-[var(--atlas-border-control)] rounded-[2px] px-3 py-2 text-[var(--atlas-ink)] focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
              >
                {dataset.instruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.shortName} — {inst.jurisdictionOrScope} ({inst.adoptionYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[var(--atlas-ink-muted)] mr-1">Quick Pairs:</span>
            {QUICK_PAIRS.map((qp) => {
              const hasBoth = instMap.has(qp.aId) && instMap.has(qp.bId);
              if (!hasBoth) return null;
              const isActive =
                (selectedPair.aId === qp.aId && selectedPair.bId === qp.bId) ||
                (selectedPair.aId === qp.bId && selectedPair.bId === qp.aId);
              return (
                <button
                  key={qp.label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => commitPair(qp.aId, qp.bId)}
                  className={`px-2.5 py-1 rounded-[2px] border font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--atlas-accent-tint)] border-[var(--atlas-accent)] text-[var(--atlas-accent)]'
                      : 'bg-[var(--atlas-surface)] text-[var(--atlas-ink-secondary)] border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] hover:text-[var(--atlas-ink)]'
                  }`}
                >
                  {qp.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Immediate Pairwise Verdict & 3-Column Hairline Breakdown */}
        {activeCell && selectedInstA && selectedInstB && verdict && (
          <div id="pairwise-verdict-card" className="scroll-mt-20">
            {/* Top & Bottom Hairline Verdict Summary Band */}
            <div className="border-t border-b border-[var(--atlas-rule)] py-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="font-editorial text-[20px] sm:text-[24px] font-semibold text-[var(--atlas-ink)]">
                      {selectedInstA.shortName} &amp; {selectedInstB.shortName}
                    </h2>
                    {activeCell.sharedContextsCount > 0 &&
                      activeCell.convergenceRate !== null && (
                        <span className="font-mono text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-[var(--atlas-accent-tint)] text-[var(--atlas-accent)]">
                          {activeCell.convergenceRate}% Baseline Overlap
                        </span>
                      )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-[var(--atlas-ink-secondary)]">
                    <span className="inline-flex items-center gap-1.5 text-[var(--align-equivalent-ink)]">
                      <span
                        className="w-2 h-2 rounded-full bg-[var(--align-equivalent-ink)] inline-block"
                        aria-hidden="true"
                      />
                      {activeCell.equivalentSharedCount} Comply Once
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[var(--align-delta-ink)]">
                      <span
                        className="w-2 h-2 rounded-full bg-[var(--align-delta-ink)] inline-block"
                        aria-hidden="true"
                      />
                      {activeCell.deltaSharedCount} Extra Local Steps
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[var(--align-friction-ink)]">
                      <span
                        className="w-2 h-2 rounded-full bg-[var(--align-friction-ink)] inline-block"
                        aria-hidden="true"
                      />
                      {activeCell.frictionSharedCount} Direct Rule Clashes
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyBrief}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors cursor-pointer"
                  >
                    {copiedBrief ? (
                      <>
                        <Check
                          className="w-3.5 h-3.5 text-[var(--align-equivalent-ink)] shrink-0"
                          aria-hidden="true"
                        />
                        <span>Comparison Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Copy Comparison Brief (.md)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--atlas-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check
                          className="w-3.5 h-3.5 text-[var(--align-equivalent-ink)] shrink-0"
                          aria-hidden="true"
                        />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Share Link</span>
                      </>
                    )}
                  </button>

                  {activeCell.sharedContextsCount > 0 && (
                    <a
                      href={`${CANONICAL_BASE_URL}compare/${encodeURIComponent(canonicalOrderedSlug)}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 transition-colors"
                    >
                      <span>Printable Reference Page</span>
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-[var(--atlas-surface)] rounded-[2px] p-4 max-w-4xl space-y-1">
                <p className="text-sm font-semibold text-[var(--atlas-ink)]">
                  {verdict.headline}
                </p>
                <p className="text-sm text-[var(--atlas-ink-secondary)] leading-[1.55] max-w-[68ch]">
                  {verdict.summary}
                </p>
                <p className="text-xs text-[var(--atlas-ink-secondary)] pt-0.5 max-w-[68ch]">
                  <span className="font-semibold text-[var(--atlas-ink)]">Practical next step: </span>
                  {verdict.actionAdvice}
                </p>
              </div>
            </div>

            {/* Three Hairline-Divided Breakdown Columns (zero card-inside-card boxes) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[var(--atlas-rule)] border-b border-[var(--atlas-rule)]">
              {/* Column 1: Reusable Baseline */}
              <div className="py-5 lg:pr-6">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--align-equivalent-ink)] inline-block shrink-0"
                    aria-hidden="true"
                  />
                  <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)]">
                    Reusable Baseline — Comply Once ({eqContexts.length})
                  </h3>
                </div>
                <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                  One shared operational artifact satisfies both {selectedInstA.shortName} and{' '}
                  {selectedInstB.shortName}.
                </p>

                <div className="mt-3 divide-y divide-[var(--atlas-rule-subtle)] max-h-72 overflow-y-auto pr-1">
                  {eqContexts.length === 0 ? (
                    <p className="text-xs text-[var(--atlas-ink-muted)] py-4">
                      No shared Comply Once controls recorded for this pair yet.
                    </p>
                  ) : (
                    eqContexts.map((ctx) => {
                      const mapA = ctx.mappingsA[0];
                      const mapB = ctx.mappingsB[0];
                      return (
                        <div key={`eq-${ctx.useCaseId}-${ctx.controlId}`} className="py-3 space-y-1.5">
                          <p className="text-[13px] font-semibold text-[var(--atlas-ink)] leading-snug">
                            {ctx.controlTitle}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-xs text-[var(--atlas-ink-muted)]">
                            <span className="truncate">{ctx.useCaseTitle}</span>
                            {onOpenUseCaseChecklist && (
                              <button
                                type="button"
                                onClick={() => onOpenUseCaseChecklist(ctx.useCaseId)}
                                className="text-[var(--atlas-accent)] hover:underline underline-offset-4 shrink-0 cursor-pointer"
                              >
                                Checklist
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {mapA && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapA)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] text-[11px] font-mono text-[var(--atlas-ink)] cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapA.clauseCitation}</span>
                              </button>
                            )}
                            {mapB && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapB)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] text-[11px] font-mono text-[var(--atlas-ink)] cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapB.clauseCitation}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 2: Extra Local Steps */}
              <div className="py-5 lg:px-6">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--align-delta-ink)] inline-block shrink-0"
                    aria-hidden="true"
                  />
                  <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)]">
                    Extra Local Steps ({dlContexts.length})
                  </h3>
                </div>
                <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                  Supplemental statutory filing, public notice, or local threshold beyond baseline controls.
                </p>

                <div className="mt-3 divide-y divide-[var(--atlas-rule-subtle)] max-h-72 overflow-y-auto pr-1">
                  {dlContexts.length === 0 ? (
                    <p className="text-xs text-[var(--atlas-ink-muted)] py-4">
                      No supplemental local steps recorded across co-mapped deployments here.
                    </p>
                  ) : (
                    dlContexts.map((ctx) => {
                      const mapA = ctx.mappingsA[0];
                      const mapB = ctx.mappingsB[0];
                      return (
                        <div key={`dl-${ctx.useCaseId}-${ctx.controlId}`} className="py-3 space-y-1.5">
                          <p className="text-[13px] font-semibold text-[var(--atlas-ink)] leading-snug">
                            {ctx.controlTitle}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-xs text-[var(--atlas-ink-muted)]">
                            <span className="truncate">{ctx.useCaseTitle}</span>
                            {onOpenUseCaseChecklist && (
                              <button
                                type="button"
                                onClick={() => onOpenUseCaseChecklist(ctx.useCaseId)}
                                className="text-[var(--atlas-accent)] hover:underline underline-offset-4 shrink-0 cursor-pointer"
                              >
                                Checklist
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {mapA && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapA)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] text-[11px] font-mono text-[var(--atlas-ink)] cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapA.clauseCitation}</span>
                              </button>
                            )}
                            {mapB && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapB)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] text-[11px] font-mono text-[var(--atlas-ink)] cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapB.clauseCitation}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 3: Direct Rule Clashes */}
              <div className="py-5 lg:pl-6">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--align-friction-ink)] inline-block shrink-0"
                    aria-hidden="true"
                  />
                  <h3 className="font-sans text-[13px] font-semibold text-[var(--align-friction-ink)]">
                    Direct Rule Clashes ({frContexts.length})
                  </h3>
                </div>
                <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                  Hard legal prohibition, competing reporting clock, or transparency rule requiring legal review.
                </p>

                <div className="mt-3 divide-y divide-[var(--atlas-rule-subtle)] max-h-72 overflow-y-auto pr-1">
                  {frContexts.length === 0 ? (
                    <p className="text-xs text-[var(--align-equivalent-ink)] py-4">
                      Zero direct legal clashes recorded across co-mapped deployments between{' '}
                      {selectedInstA.shortName} and {selectedInstB.shortName}.
                    </p>
                  ) : (
                    frContexts.map((ctx) => {
                      const mapA = ctx.mappingsA[0];
                      const mapB = ctx.mappingsB[0];
                      return (
                        <div key={`fr-${ctx.useCaseId}-${ctx.controlId}`} className="py-3 space-y-1.5">
                          <p className="text-[13px] font-semibold text-[var(--atlas-ink)] leading-snug">
                            {ctx.controlTitle}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-xs text-[var(--atlas-ink-muted)]">
                            <span className="truncate">{ctx.useCaseTitle}</span>
                            {onOpenUseCaseChecklist && (
                              <button
                                type="button"
                                onClick={() => onOpenUseCaseChecklist(ctx.useCaseId)}
                                className="text-[var(--atlas-accent)] hover:underline underline-offset-4 shrink-0 cursor-pointer"
                              >
                                Checklist
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {mapA && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapA)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--align-friction-tint)] border border-[var(--align-friction-rule)] hover:border-[var(--align-friction-ink)] text-[11px] font-mono text-[var(--align-friction-ink)] cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapA.clauseCitation}</span>
                              </button>
                            )}
                            {mapB && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapB)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--align-friction-tint)] border border-[var(--align-friction-rule)] hover:border-[var(--align-friction-ink)] text-[11px] font-mono text-[var(--align-friction-ink)] cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapB.clauseCitation}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Overview: Hairline Track Record + Low-Chroma 9x9 Convergence Matrix */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Track Record Across All 9 Regimes */}
          <div className="xl:col-span-5">
            <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-[var(--atlas-rule)]">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[var(--atlas-ink)]">
                  Track Record Across All {dataset.instruments.length} Regimes
                </h2>
                <p className="text-xs text-[var(--atlas-ink-secondary)] mt-0.5">
                  Click any regime to compare against {selectedInstA?.shortName ?? 'Baseline'}.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--atlas-ink-muted)] shrink-0">
                Clauses mapped
              </span>
            </div>

            <div className="divide-y divide-[var(--atlas-rule-subtle)]">
              {breakdown.map(({ instrument, counts, useCasesCovered }) => {
                const isBaselineA = selectedPair.aId === instrument.id;
                const isTargetB = selectedPair.bId === instrument.id;
                const widthScale = Math.max(10, Math.round((counts.total / maxTotal) * 100));
                const eqW = counts.total > 0 ? (counts.equivalent / counts.total) * 100 : 0;
                const dlW = counts.total > 0 ? (counts.delta / counts.total) * 100 : 0;
                const frW = counts.total > 0 ? (counts.friction / counts.total) * 100 : 0;

                return (
                  <button
                    key={instrument.id}
                    type="button"
                    onClick={() => handleSelectTargetB(instrument.id)}
                    className={`w-full text-left py-2.5 px-2 transition-colors cursor-pointer ${
                      isBaselineA || isTargetB
                        ? 'bg-[var(--atlas-accent-tint)]'
                        : 'hover:bg-[var(--atlas-surface)]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--atlas-ink)] truncate">
                          {instrument.shortName}
                        </span>
                        {isBaselineA && (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--atlas-accent)] text-white text-[10px] font-mono">
                            Baseline
                          </span>
                        )}
                        {isTargetB && (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-white border border-[var(--atlas-accent)] text-[var(--atlas-accent)] text-[10px] font-mono">
                            Target
                          </span>
                        )}
                        <span className="text-[11px] font-mono tabular-nums text-[var(--atlas-ink-muted)] hidden sm:inline">
                          {useCasesCovered} systems
                        </span>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums shrink-0 text-[var(--atlas-ink-secondary)]">
                        <span className="text-[var(--align-equivalent-ink)]">{counts.equivalent} once</span>,{' '}
                        <span className="text-[var(--align-delta-ink)]">{counts.delta} extra</span>,{' '}
                        <span className="text-[var(--align-friction-ink)]">{counts.friction} clash</span>
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full bg-[var(--atlas-elevated)] rounded-[1px] overflow-hidden">
                      <div
                        style={{ width: `${widthScale}%` }}
                        className="h-full flex rounded-[1px] overflow-hidden"
                      >
                        {counts.equivalent > 0 && (
                          <div
                            style={{ width: `${eqW}%` }}
                            className="bg-[var(--align-equivalent-ink)] h-full"
                          />
                        )}
                        {counts.delta > 0 && (
                          <div
                            style={{ width: `${dlW}%` }}
                            className="bg-[var(--align-delta-ink)] h-full"
                          />
                        )}
                        {counts.friction > 0 && (
                          <div
                            style={{ width: `${frW}%` }}
                            className="bg-[var(--align-friction-ink)] h-full"
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Restraint-first N x N Cross-Regime Pairwise Matrix */}
          <div id="crosswalk-matrix" className="xl:col-span-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[var(--atlas-rule)]">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[var(--atlas-ink)]">
                  Full {matrix.instruments.length}&times;{matrix.instruments.length} Pairwise Overlap
                  Grid
                </h2>
                <p className="text-xs text-[var(--atlas-ink-secondary)] mt-0.5">
                  Click any cell to load the comparison above. Dot marks at least one legal clash.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--atlas-ink-muted)]">
                <span>Bold % = 60%+ baseline</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--align-friction-ink)] inline-block" />
                  Rule clash
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table
                className="w-full border-collapse text-center min-w-[540px]"
                aria-label="Pairwise overlap grid across tracked governance frameworks"
              >
                <thead>
                  <tr>
                    <th className="p-1.5 text-left text-[11px] font-mono font-normal text-[var(--atlas-ink-muted)] w-24">
                      Regime
                    </th>
                    {matrix.instruments.map((inst) => {
                      const isColActive =
                        inst.id === selectedPair.aId || inst.id === selectedPair.bId;
                      return (
                        <th
                          key={`col-${inst.id}`}
                          scope="col"
                          title={inst.title}
                          className="p-1 text-[10.5px] font-semibold leading-tight"
                        >
                          <span
                            className={`inline-block rounded-[2px] px-1.5 py-0.5 ${
                              isColActive
                                ? 'bg-[var(--atlas-accent)] text-white'
                                : 'text-[var(--atlas-ink-secondary)]'
                            }`}
                          >
                            {shortCode(inst.id, inst.shortName)}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {matrix.instruments.map((instA) => {
                    const isRowActive =
                      instA.id === selectedPair.aId || instA.id === selectedPair.bId;
                    return (
                      <tr key={`row-${instA.id}`}>
                        <th
                          scope="row"
                          title={instA.title}
                          className="py-1 pr-2 text-left text-[11px] font-semibold whitespace-nowrap"
                        >
                          <span
                            className={`inline-block rounded-[2px] px-1.5 py-0.5 ${
                              isRowActive
                                ? 'bg-[var(--atlas-accent)] text-white'
                                : 'text-[var(--atlas-ink)]'
                            }`}
                          >
                            {shortCode(instA.id, instA.shortName)}
                          </span>
                        </th>
                        {matrix.instruments.map((instB) => {
                          const cell = matrix.cellsByPair[instA.id][instB.id];
                          const isPairSelected =
                            !cell.isDiagonal &&
                            ((selectedPair.aId === instA.id && selectedPair.bId === instB.id) ||
                              (selectedPair.aId === instB.id && selectedPair.bId === instA.id));

                          if (cell.isDiagonal) {
                            return (
                              <td key={`${instA.id}-${instB.id}`} className="p-0.5">
                                <div
                                  title={`${instA.shortName}: ${cell.totalA} verified clause mappings`}
                                  className="h-11 rounded-[2px] bg-[var(--atlas-elevated)] text-[var(--atlas-ink)] flex flex-col items-center justify-center font-mono tabular-nums"
                                >
                                  <span className="text-[11px] font-semibold">{cell.totalA}</span>
                                  <span className="text-[9px] text-[var(--atlas-ink-muted)]">
                                    clauses
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          const hasShared = cell.sharedContextsCount > 0;
                          const rate = cell.convergenceRate ?? 0;

                          return (
                            <td key={`${instA.id}-${instB.id}`} className="p-0.5">
                              <button
                                type="button"
                                onClick={() => handleCellSelect(instA.id, instB.id)}
                                title={
                                  hasShared
                                    ? `${shortCode(instA.id, instA.shortName)} × ${shortCode(instB.id, instB.shortName)}: ${rate}% shared baseline (${cell.equivalentSharedCount}/${cell.sharedContextsCount} shared controls, ${cell.frictionSharedCount} clashes)`
                                    : `${shortCode(instA.id, instA.shortName)} × ${shortCode(instB.id, instB.shortName)}: currently mapped to separate AI deployments`
                                }
                                className={`relative w-full h-11 rounded-[2px] border flex flex-col items-center justify-center font-mono tabular-nums transition-colors cursor-pointer ${
                                  hasShared
                                    ? 'bg-white border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)]'
                                    : 'bg-[var(--atlas-surface)] border-[var(--atlas-rule-subtle)] text-[var(--atlas-ink-muted)]'
                                } ${
                                  isPairSelected
                                    ? 'ring-2 ring-[var(--atlas-accent)] bg-[var(--atlas-accent-tint)] border-[var(--atlas-accent)] z-10'
                                    : ''
                                }`}
                              >
                                {cell.frictionSharedCount > 0 && (
                                  <span
                                    aria-label="Contains direct rule clash"
                                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--align-friction-ink)]"
                                  />
                                )}
                                {hasShared ? (
                                  <>
                                    <span
                                      className={`text-[11px] leading-none ${
                                        rate >= 60
                                          ? 'font-semibold text-[var(--atlas-ink)]'
                                          : 'font-normal text-[var(--atlas-ink-secondary)]'
                                      }`}
                                    >
                                      {rate}%
                                    </span>
                                    <span className="text-[9px] text-[var(--atlas-ink-muted)] mt-0.5 leading-none">
                                      {cell.equivalentSharedCount}/{cell.sharedContextsCount}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] leading-none">—</span>
                                    <span className="text-[8.5px] mt-0.5 leading-none">0/{cell.sharedContextsCount}</span>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
