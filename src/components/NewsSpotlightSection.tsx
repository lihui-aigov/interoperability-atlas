import { Check, Copy, ExternalLink, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AtlasDataset, JurisdictionLensId, NewsSpotlight } from '../types/atlas';

interface NewsSpotlightSectionProps {
  dataset: AtlasDataset;
  initialSpotlightId?: string;
  onSelectSpotlight?: (spotlightId: string) => void;
  onTraceUseCase: (useCaseId: string) => void;
  onOpenCompareTab?: () => void;
}

const CANONICAL_SITE_URL = 'https://lihui-aigov.github.io/interoperability-atlas/';

function formatSpotlightBriefMarkdown(
  spotlight: NewsSpotlight,
  activeLensId: JurisdictionLensId
): string {
  const view =
    spotlight.jurisdictionViews.find((v) => v.lensId === activeLensId) ??
    spotlight.jurisdictionViews[0];

  const lines: string[] = [
    `# Policy & Interoperability Briefing Note`,
    ``,
    `**Case Spotlight:** ${spotlight.headline}`,
    `**Date:** ${spotlight.publishedDate}, **Scope:** ${spotlight.regionTag}`,
    `**Primary Trigger Source:** [${spotlight.newsSourceTitle}](${spotlight.newsSourceUrl})`,
    `**Direct Atlas Link:** ${CANONICAL_SITE_URL}?spotlight=${encodeURIComponent(spotlight.id)}`,
    ``,
    `## Core Governance Question`,
    `${spotlight.coreGovernanceQuestion}`,
    ``,
    `## Evidence-Backed Arguments Across Frameworks`,
    ...spotlight.evidenceArguments.map(
      (arg, idx) =>
        `${idx + 1}. ${arg.claim}\n   - **Citations:** ${arg.supportingCitations.join('; ')}`
    ),
    ``,
  ];

  if (view) {
    lines.push(
      `## Jurisdiction Lens: ${view.lensLabel}`,
      `${view.stanceSummary}`,
      `- **Clauses to Cite:** ${view.citedClauses.join('; ')}`,
      `- **Leverage / Blind Spot:** ${view.leverageOrBlindSpot}`,
      ``
    );
  }

  lines.push(
    `## Interoperability Bottleneck`,
    `${spotlight.interoperabilityBottleneck}`,
    ``,
    `## Policymaker-to-Engineer Operational Translation`,
    `${spotlight.engineeringTranslation}`
  );

  return lines.join('\n');
}

export function NewsSpotlightSection({
  dataset,
  initialSpotlightId,
  onSelectSpotlight,
  onTraceUseCase,
  onOpenCompareTab,
}: NewsSpotlightSectionProps) {
  const spotlights = dataset.spotlights ?? [];

  const [activeId, setActiveId] = useState<string>(() => {
    if (initialSpotlightId && spotlights.some((s) => s.id === initialSpotlightId)) {
      return initialSpotlightId;
    }
    return spotlights[0]?.id ?? '';
  });

  const activeSpotlight =
    spotlights.find((s) => s.id === activeId) ?? spotlights[0] ?? null;

  const [activeLensId, setActiveLensId] = useState<JurisdictionLensId>(
    () => activeSpotlight?.jurisdictionViews[0]?.lensId ?? 'global-multilateral'
  );
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (
      activeSpotlight &&
      !activeSpotlight.jurisdictionViews.some((v) => v.lensId === activeLensId)
    ) {
      setActiveLensId(
        activeSpotlight.jurisdictionViews[0]?.lensId ?? 'global-multilateral'
      );
    }
  }, [activeSpotlight, activeLensId]);

  if (!activeSpotlight) return null;

  const activeLens =
    activeSpotlight.jurisdictionViews.find((v) => v.lensId === activeLensId) ??
    activeSpotlight.jurisdictionViews[0];

  const handleChooseSpotlight = (id: string) => {
    setActiveId(id);
    onSelectSpotlight?.(id);
  };

  const handleCopyBrief = async () => {
    try {
      const md = formatSpotlightBriefMarkdown(activeSpotlight, activeLensId);
      await navigator.clipboard.writeText(md);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2000);
    } catch {
      // Clipboard restrictions ignored cleanly
    }
  };

  const handleCopyShareLink = async () => {
    try {
      const shareUrl = `${CANONICAL_SITE_URL}?spotlight=${encodeURIComponent(activeSpotlight.id)}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard restrictions ignored cleanly
    }
  };

  const handleOpenUseCaseChecklist = () => {
    onTraceUseCase(activeSpotlight.linkedUseCaseId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCompare = () => {
    onOpenCompareTab?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section
      id="news-spotlight"
      aria-labelledby="news-spotlight-heading"
      className="scroll-mt-16 bg-[var(--atlas-ground)] pt-6 pb-12"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        {/* Compact Header Row: Page H1 + Inline Case Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[var(--atlas-rule)]">
          <div>
            <h1
              id="news-spotlight-heading"
              className="font-editorial text-[26px] sm:text-[30px] font-semibold tracking-[-0.015em] leading-[1.2] text-[var(--atlas-ink)]"
            >
              In-the-News Policy Briefings
            </h1>
            <p className="text-sm text-[var(--atlas-ink-secondary)] mt-1 max-w-[68ch]">
              Cite-ready evidence arguments, regional legal lenses, and interoperability bottlenecks
              anchored on current AI governance cases.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Select recent AI governance news spotlight"
            className="flex flex-wrap items-center gap-1.5 shrink-0"
          >
            {spotlights.map((spot, idx) => {
              const selected = spot.id === activeSpotlight.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => handleChooseSpotlight(spot.id)}
                  className={`px-3 py-1.5 rounded-[2px] border text-left transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[var(--atlas-accent)] text-white border-[var(--atlas-accent)]'
                      : 'bg-white text-[var(--atlas-ink-secondary)] border-[var(--atlas-border-control)] hover:bg-[var(--atlas-surface)] hover:text-[var(--atlas-ink)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums leading-tight">
                    <span className="font-medium">Case {idx + 1}</span>
                    <span className={selected ? 'text-white/80' : 'text-[var(--atlas-ink-muted)]'}>
                      {spot.publishedDate}
                    </span>
                  </div>
                  <div className="text-xs font-medium truncate max-w-[190px] mt-0.5">
                    {spot.regionTag}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Editorial Briefing Layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column (7 cols): Case Narrative, Question, Evidence Arguments */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-[var(--atlas-ink-muted)]">
              <div className="font-mono tabular-nums">
                <span>{activeSpotlight.publishedDate}</span>
                <span>, {activeSpotlight.regionTag}</span>
              </div>

              <a
                href={activeSpotlight.newsSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[var(--atlas-accent)] hover:underline underline-offset-4"
              >
                <span className="truncate max-w-[320px]">{activeSpotlight.newsSourceTitle}</span>
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
              </a>
            </div>

            <h2 className="font-editorial text-[22px] sm:text-[26px] font-semibold tracking-[-0.01em] text-[var(--atlas-ink)] leading-[1.24] mt-2">
              {activeSpotlight.headline}
            </h2>

            <p className="mt-3 text-sm text-[var(--atlas-ink-secondary)] leading-[1.6] max-w-[68ch]">
              {activeSpotlight.eventSummary}
            </p>

            {/* Core Governance Question — editorial blockquote with clean accent bar */}
            <blockquote className="my-5 border-l-[3px] border-[var(--atlas-accent)] pl-4 py-0.5 max-w-[68ch]">
              <p className="text-xs font-medium text-[var(--atlas-accent)]">
                Core governance question
              </p>
              <p className="mt-1 font-editorial text-base text-[var(--atlas-ink)] leading-snug">
                {activeSpotlight.coreGovernanceQuestion}
              </p>
            </blockquote>

            {/* Evidence-Backed Arguments — hairline separated list without stacked cards */}
            <div className="mt-6">
              <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)] pb-2.5 border-b border-[var(--atlas-rule)]">
                Evidence-backed policy arguments across frameworks
              </h3>

              <ol className="divide-y divide-[var(--atlas-rule-subtle)]">
                {activeSpotlight.evidenceArguments.map((arg, idx) => (
                  <li key={`${activeSpotlight.id}-arg-${idx}`} className="py-4">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-[var(--atlas-ink-muted)] tabular-nums shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="space-y-2 min-w-0 max-w-[68ch]">
                        <p className="text-sm text-[var(--atlas-ink)] leading-[1.55]">
                          {arg.claim}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {arg.supportingCitations.map((cit) => (
                            <code
                              key={cit}
                              className="px-2 py-0.5 text-[11px] font-mono bg-[var(--atlas-surface)] text-[var(--atlas-ink-secondary)] border border-[var(--atlas-rule)] rounded-[2px]"
                            >
                              {cit}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Quiet Action Bar — no arrow suffixes, restrained secondary/ghost controls */}
            <div className="mt-4 pt-4 border-t border-[var(--atlas-rule)] flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenUseCaseChecklist}
                className="px-3.5 py-2 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors cursor-pointer"
              >
                Open Use-Case Compliance Checklist
              </button>

              {onOpenCompareTab && (
                <button
                  type="button"
                  onClick={handleOpenCompare}
                  className="px-3.5 py-2 text-xs font-medium text-[var(--atlas-ink-secondary)] bg-white border border-[var(--atlas-rule)] rounded-[2px] hover:border-[var(--atlas-border-control)] hover:text-[var(--atlas-ink)] transition-colors cursor-pointer"
                >
                  Compare Frameworks Side by Side
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyBrief}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-[var(--atlas-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer"
              >
                {copiedBrief ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--align-equivalent-ink)] shrink-0" aria-hidden="true" />
                    <span>Briefing Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Copy Talking Points (.md)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--align-equivalent-ink)] shrink-0" aria-hidden="true" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Share Case Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): Single Jurisdiction Panel + Restrained Bottleneck & Translation */}
          <aside className="lg:col-span-5 space-y-6">
            <div className="bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px] p-5">
              <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)]">
                Compare jurisdictional implications
              </h3>
              <p className="text-xs text-[var(--atlas-ink-secondary)] mt-0.5">
                Select a regional or standards lens to inspect applicable duties and blind spots.
              </p>

              <div
                role="tablist"
                aria-label="Jurisdictional analysis lenses"
                className="mt-3 flex flex-wrap gap-1.5"
              >
                {activeSpotlight.jurisdictionViews.map((view) => {
                  const isSelected = view.lensId === activeLensId;
                  return (
                    <button
                      key={view.lensId}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setActiveLensId(view.lensId)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-[2px] border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--atlas-accent)] text-white border-[var(--atlas-accent)]'
                          : 'bg-white text-[var(--atlas-ink-secondary)] border-[var(--atlas-border-control)] hover:text-[var(--atlas-ink)]'
                      }`}
                    >
                      {view.lensLabel}
                    </button>
                  );
                })}
              </div>

              {activeLens && (
                <div className="mt-4 pt-4 border-t border-[var(--atlas-rule)] space-y-3.5">
                  <p className="text-[13px] text-[var(--atlas-ink)] leading-[1.6]">
                    {activeLens.stanceSummary}
                  </p>

                  <div>
                    <p className="text-xs font-medium text-[var(--atlas-ink-muted)] mb-1.5">
                      Clauses to cite
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeLens.citedClauses.map((clause) => (
                        <span
                          key={clause}
                          className="px-2 py-0.5 text-[11px] font-mono bg-white text-[var(--align-equivalent-ink)] border border-[var(--align-equivalent-rule)] rounded-[2px]"
                        >
                          {clause}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--atlas-rule)] text-xs text-[var(--atlas-ink-secondary)] leading-relaxed">
                    <span className="font-semibold text-[var(--atlas-ink)]">
                      Leverage and blind spot:{' '}
                    </span>
                    {activeLens.leverageOrBlindSpot}
                  </div>
                </div>
              )}
            </div>

            {/* Interoperability Bottleneck — quiet editorial border-l-2 callout */}
            <div className="border-l-2 border-[var(--align-friction-ink)] pl-4 py-0.5">
              <h3 className="font-sans text-xs font-semibold text-[var(--align-friction-ink)]">
                Where interoperability stalls (bottleneck)
              </h3>
              <p className="mt-1 text-[13px] text-[var(--atlas-ink-secondary)] leading-[1.55]">
                {activeSpotlight.interoperabilityBottleneck}
              </p>
            </div>

            {/* Policymaker-to-Engineer Translation — quiet editorial border-l-2 callout */}
            <div className="border-l-2 border-[var(--align-equivalent-ink)] pl-4 py-0.5">
              <h3 className="font-sans text-xs font-semibold text-[var(--align-equivalent-ink)]">
                Policymaker-to-engineer translation
              </h3>
              <p className="mt-1 text-[13px] text-[var(--atlas-ink-secondary)] leading-[1.55]">
                {activeSpotlight.engineeringTranslation}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
