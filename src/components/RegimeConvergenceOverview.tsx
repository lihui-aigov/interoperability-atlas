import {
  ArrowLeftRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Link2,
  ShieldAlert,
} from 'lucide-react';
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
        `- **${ctx.controlTitle}** (${ctx.useCaseTitle}): ${instA.shortName} [${citA}] ↔ ${instB.shortName} [${citB}]`
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
      className="scroll-mt-16 bg-[#F7F8FA] py-8 sm:py-10"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 space-y-6">
        {/* Top Selector & Quick Pairs Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <p className="text-xs font-mono text-emerald-800">
                FRAMEWORK-TO-FRAMEWORK GAP CHECKER
              </p>
              <h2
                id="regime-overview-heading"
                className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1"
              >
                Compare Two Governance Frameworks Side by Side
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 max-w-3xl">
                Pick any two frameworks below—or click a quick comparison—to see which controls you
                satisfy once, what extra local steps are added, and where legal rules conflict.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-5">
              <label
                htmlFor="pair-select-a"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Baseline Framework A
              </label>
              <select
                id="pair-select-a"
                value={selectedPair.aId}
                onChange={(e) => handleSelectBaselineA(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
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
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Swap</span>
              </button>
            </div>

            <div className="lg:col-span-5">
              <label
                htmlFor="pair-select-b"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Target Framework B
              </label>
              <select
                id="pair-select-b"
                value={selectedPair.bId}
                onChange={(e) => handleSelectTargetB(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
              >
                {dataset.instruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.shortName} — {inst.jurisdictionOrScope} ({inst.adoptionYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium mr-1">Quick Pairs:</span>
            {QUICK_PAIRS.map((qp) => {
              const hasBoth =
                instMap.has(qp.aId) && instMap.has(qp.bId);
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
                  className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {qp.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Immediate Above-the-Fold Pairwise Verdict Card */}
        {activeCell && selectedInstA && selectedInstB && verdict && (
          <div
            id="pairwise-verdict-card"
            className="scroll-mt-20 bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <ArrowLeftRight className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                  <h3 className="font-editorial text-xl sm:text-2xl font-medium text-slate-950">
                    {selectedInstA.shortName} &harr; {selectedInstB.shortName}
                  </h3>
                  {activeCell.sharedContextsCount > 0 && activeCell.convergenceRate !== null && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-mono font-semibold tabular-nums">
                      {activeCell.convergenceRate}% Baseline Overlap
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums pt-0.5">
                  <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium">
                    {activeCell.equivalentSharedCount} Comply Once
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                    {activeCell.deltaSharedCount} Extra Local Steps
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200 font-medium">
                    {activeCell.frictionSharedCount} Direct Rule Clashes
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyBrief}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {copiedBrief ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Share Comparison Link</span>
                    </>
                  )}
                </button>

                {activeCell.sharedContextsCount > 0 && (
                  <a
                    href={`${CANONICAL_BASE_URL}compare/${encodeURIComponent(canonicalOrderedSlug)}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-slate-400 rounded-md transition-colors"
                  >
                    <span>Printable Reference Page</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/* Plain-English Verdict Summary */}
            <div className="mt-4 p-4 rounded-md bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="text-sm font-semibold text-slate-950">{verdict.headline}</p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {verdict.summary}
              </p>
              <p className="text-xs text-slate-600 pt-1">
                <span className="font-semibold text-slate-800">Practical Next Step: </span>
                {verdict.actionAdvice}
              </p>
            </div>

            {/* Three Side-by-Side Breakdown Columns */}
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Column 1: Reusable Baseline */}
              <div className="border border-emerald-200/90 rounded-lg bg-emerald-50/25 p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-emerald-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>1. Reusable Baseline — Do Once ({eqContexts.length})</span>
                  </div>
                </div>
                <p className="text-[11.5px] text-slate-600 mt-2">
                  One operational artifact satisfies both {selectedInstA.shortName} and{' '}
                  {selectedInstB.shortName}. Click any clause badge to read full text.
                </p>

                <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {eqContexts.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4">
                      No shared Comply Once controls recorded for this specific pair yet.
                    </p>
                  ) : (
                    eqContexts.map((ctx) => {
                      const mapA = ctx.mappingsA[0];
                      const mapB = ctx.mappingsB[0];
                      return (
                        <div
                          key={`eq-${ctx.useCaseId}-${ctx.controlId}`}
                          className="p-2.5 rounded border border-emerald-200 bg-white text-xs space-y-1.5"
                        >
                          <p className="font-semibold text-slate-900 leading-snug">
                            {ctx.controlTitle}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                            <span className="truncate">{ctx.useCaseTitle}</span>
                            {onOpenUseCaseChecklist && (
                              <button
                                type="button"
                                onClick={() => onOpenUseCaseChecklist(ctx.useCaseId)}
                                className="text-emerald-800 hover:underline shrink-0 cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 hover:border-slate-400 text-[10.5px] font-mono text-slate-800 cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapA.clauseCitation}</span>
                              </button>
                            )}
                            {mapB && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapB)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 hover:border-slate-400 text-[10.5px] font-mono text-slate-800 cursor-pointer"
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
              <div className="border border-amber-200/90 rounded-lg bg-amber-50/25 p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-950">
                    <Layers className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                    <span>2. Extra Local Steps ({dlContexts.length})</span>
                  </div>
                </div>
                <p className="text-[11.5px] text-slate-600 mt-2">
                  Supplemental statutory filing, public registration, or cohort threshold beyond the
                  baseline control.
                </p>

                <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {dlContexts.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4">
                      No supplemental local steps recorded across co-mapped deployments here.
                    </p>
                  ) : (
                    dlContexts.map((ctx) => {
                      const mapA = ctx.mappingsA[0];
                      const mapB = ctx.mappingsB[0];
                      return (
                        <div
                          key={`dl-${ctx.useCaseId}-${ctx.controlId}`}
                          className="p-2.5 rounded border border-amber-200 bg-white text-xs space-y-1.5"
                        >
                          <p className="font-semibold text-slate-900 leading-snug">
                            {ctx.controlTitle}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                            <span className="truncate">{ctx.useCaseTitle}</span>
                            {onOpenUseCaseChecklist && (
                              <button
                                type="button"
                                onClick={() => onOpenUseCaseChecklist(ctx.useCaseId)}
                                className="text-amber-800 hover:underline shrink-0 cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 hover:border-slate-400 text-[10.5px] font-mono text-slate-800 cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapA.clauseCitation}</span>
                              </button>
                            )}
                            {mapB && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapB)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 hover:border-slate-400 text-[10.5px] font-mono text-slate-800 cursor-pointer"
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
              <div className="border border-rose-200/90 rounded-lg bg-rose-50/25 p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-rose-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-950">
                    <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                    <span>3. Direct Rule Clashes ({frContexts.length})</span>
                  </div>
                </div>
                <p className="text-[11.5px] text-slate-600 mt-2">
                  Hard legal prohibition, competing reporting window, or transparency clash requiring
                  legal sign-off.
                </p>

                <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {frContexts.length === 0 ? (
                    <div className="p-3 rounded border border-emerald-200 bg-emerald-50/80 text-xs text-emerald-950">
                      Zero direct legal clashes recorded across co-mapped deployments between{' '}
                      {selectedInstA.shortName} and {selectedInstB.shortName}.
                    </div>
                  ) : (
                    frContexts.map((ctx) => {
                      const mapA = ctx.mappingsA[0];
                      const mapB = ctx.mappingsB[0];
                      return (
                        <div
                          key={`fr-${ctx.useCaseId}-${ctx.controlId}`}
                          className="p-2.5 rounded border border-rose-200 bg-white text-xs space-y-1.5"
                        >
                          <p className="font-semibold text-rose-950 leading-snug">
                            {ctx.controlTitle}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                            <span className="truncate">{ctx.useCaseTitle}</span>
                            {onOpenUseCaseChecklist && (
                              <button
                                type="button"
                                onClick={() => onOpenUseCaseChecklist(ctx.useCaseId)}
                                className="text-rose-800 hover:underline shrink-0 cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50/70 border border-rose-200 hover:border-rose-400 text-[10.5px] font-mono text-rose-950 cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[165px]">{mapA.clauseCitation}</span>
                              </button>
                            )}
                            {mapB && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapB)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50/70 border border-rose-200 hover:border-rose-400 text-[10.5px] font-mono text-rose-950 cursor-pointer"
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

        {/* Bottom Overview: Regime Obligation Bars + 9x9 Convergence Matrix */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left Panel: Track Record Across All 9 Regimes */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
            <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Track Record Across All {dataset.instruments.length} Regimes
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any regime to compare it against {selectedInstA?.shortName ?? 'Baseline A'}
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">Clauses Mapped</span>
            </div>

            <div className="mt-3 space-y-2.5 flex-1">
              {breakdown.map(({ instrument, counts, useCasesCovered }) => {
                const isBaselineA = selectedPair.aId === instrument.id;
                const isTargetB = selectedPair.bId === instrument.id;
                const isSelected = isBaselineA || isTargetB;
                const widthScale = Math.max(10, Math.round((counts.total / maxTotal) * 100));
                const eqW = counts.total > 0 ? (counts.equivalent / counts.total) * 100 : 0;
                const dlW = counts.total > 0 ? (counts.delta / counts.total) * 100 : 0;
                const frW = counts.total > 0 ? (counts.friction / counts.total) * 100 : 0;

                return (
                  <button
                    key={instrument.id}
                    type="button"
                    onClick={() => handleSelectTargetB(instrument.id)}
                    className={`w-full text-left p-2.5 rounded-md border transition-colors cursor-pointer ${
                      isBaselineA
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : isTargetB
                          ? 'bg-emerald-950 border-emerald-900 text-white'
                          : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-900'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold truncate">
                          {instrument.shortName}
                        </span>
                        {isBaselineA && (
                          <span className="px-1.5 py-0.2 rounded bg-white/15 text-[10px] font-mono">
                            Framework A
                          </span>
                        )}
                        {isTargetB && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-200 text-[10px] font-mono">
                            Framework B
                          </span>
                        )}
                        <span
                          className={`text-[10.5px] font-mono hidden sm:inline ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          · {useCasesCovered} systems
                        </span>
                      </div>
                      <span
                        className={`text-[10.5px] font-mono tabular-nums shrink-0 ${
                          isSelected ? 'text-slate-200' : 'text-slate-700'
                        }`}
                      >
                        <span className={isSelected ? 'text-emerald-300' : 'text-emerald-700'}>
                          {counts.equivalent} once
                        </span>
                        {' · '}
                        <span className={isSelected ? 'text-amber-300' : 'text-amber-700'}>
                          {counts.delta} extra
                        </span>
                        {' · '}
                        <span className={isSelected ? 'text-rose-300' : 'text-rose-700'}>
                          {counts.friction} clash
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full bg-slate-200/70 rounded-xs overflow-hidden">
                      <div
                        style={{ width: `${widthScale}%` }}
                        className="h-full flex rounded-xs overflow-hidden"
                      >
                        {counts.equivalent > 0 && (
                          <div style={{ width: `${eqW}%` }} className="bg-emerald-600 h-full" />
                        )}
                        {counts.delta > 0 && (
                          <div style={{ width: `${dlW}%` }} className="bg-amber-500 h-full" />
                        )}
                        {counts.friction > 0 && (
                          <div style={{ width: `${frW}%` }} className="bg-rose-600 h-full" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: N x N Cross-Regime Pairwise Matrix */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Full {matrix.instruments.length}&times;{matrix.instruments.length} Pairwise Overlap
                  Grid
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any cell to update the comparison verdict above. Rose dot flags at least one
                  legal clash.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200 border border-emerald-400 inline-block" />
                  High Reuse
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                  Rule Clash
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
                    <th className="p-1.5 text-left text-[10.5px] font-mono text-slate-400 w-24">
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
                            className={`inline-block rounded px-1.5 py-0.5 ${
                              isColActive ? 'bg-slate-900 text-white' : 'text-slate-700'
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
                            className={`inline-block rounded px-1.5 py-0.5 ${
                              isRowActive ? 'bg-slate-900 text-white' : 'text-slate-800'
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
                          const isRelatedAxis =
                            instA.id === selectedPair.aId ||
                            instA.id === selectedPair.bId ||
                            instB.id === selectedPair.aId ||
                            instB.id === selectedPair.bId;

                          if (cell.isDiagonal) {
                            return (
                              <td key={`${instA.id}-${instB.id}`} className="p-0.5">
                                <div
                                  title={`${instA.shortName}: ${cell.totalA} verified clause mappings`}
                                  className="h-11 rounded bg-slate-900 text-white flex flex-col items-center justify-center font-mono tabular-nums"
                                >
                                  <span className="text-[11px] font-semibold">{cell.totalA}</span>
                                  <span className="text-[9px] text-slate-300">clauses</span>
                                </div>
                              </td>
                            );
                          }

                          let cellBg =
                            'bg-slate-50 text-slate-400 border-slate-200/70 hover:border-slate-400';
                          if (cell.sharedContextsCount > 0) {
                            const rate = cell.convergenceRate ?? 0;
                            if (cell.frictionSharedCount > 0 && rate < 50) {
                              cellBg =
                                'bg-rose-50 text-rose-950 border-rose-200 hover:border-rose-400';
                            } else if (rate >= 75) {
                              cellBg =
                                'bg-emerald-100/90 text-emerald-950 border-emerald-300 hover:border-emerald-500';
                            } else if (rate >= 40) {
                              cellBg =
                                'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-400';
                            } else {
                              cellBg =
                                'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-400';
                            }
                          }

                          const opacityClass = isPairSelected
                            ? 'ring-2 ring-slate-950 ring-offset-2 scale-[1.04] shadow-sm z-10 opacity-100'
                            : isRelatedAxis
                              ? 'opacity-95 hover:opacity-100'
                              : 'opacity-60 hover:opacity-100';

                          return (
                            <td key={`${instA.id}-${instB.id}`} className="p-0.5">
                              <button
                                type="button"
                                onClick={() => handleCellSelect(instA.id, instB.id)}
                                title={
                                  cell.sharedContextsCount > 0
                                    ? `${shortCode(instA.id, instA.shortName)} × ${shortCode(instB.id, instB.shortName)}: ${cell.convergenceRate}% shared baseline (${cell.equivalentSharedCount}/${cell.sharedContextsCount} shared controls, ${cell.frictionSharedCount} clashes)`
                                    : `${shortCode(instA.id, instA.shortName)} × ${shortCode(instB.id, instB.shortName)}: currently mapped to separate AI deployments`
                                }
                                className={`relative w-full h-11 rounded border flex flex-col items-center justify-center font-mono tabular-nums transition-all cursor-pointer ${cellBg} ${opacityClass}`}
                              >
                                {cell.frictionSharedCount > 0 && (
                                  <span
                                    aria-label="Contains direct rule clash"
                                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-600"
                                  />
                                )}
                                {cell.sharedContextsCount > 0 ? (
                                  <>
                                    <span className="text-[11px] font-semibold leading-none">
                                      {cell.convergenceRate}%
                                    </span>
                                    <span className="text-[9px] opacity-75 mt-0.5 leading-none">
                                      {cell.equivalentSharedCount}/{cell.sharedContextsCount}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10.5px] leading-none">&mdash;</span>
                                    <span className="text-[8px] opacity-70 mt-0.5 leading-none">
                                      separate UCs
                                    </span>
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
