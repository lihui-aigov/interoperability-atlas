import {
  AlertCircle,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Globe2,
  Link2,
  Newspaper,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AtlasDataset, JurisdictionLensId, NewsSpotlight } from '../types/atlas';

interface NewsSpotlightSectionProps {
  dataset: AtlasDataset;
  initialSpotlightId?: string;
  onSelectSpotlight?: (spotlightId: string) => void;
  onTraceUseCase: (useCaseId: string) => void;
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
    `**Date:** ${spotlight.publishedDate} · **Scope:** ${spotlight.regionTag}`,
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

  const handleTraceTopology = () => {
    onTraceUseCase(activeSpotlight.linkedUseCaseId);
    document
      .getElementById('interoperability-flow')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="news-spotlight"
      aria-labelledby="news-spotlight-heading"
      className="scroll-mt-16 border-b border-slate-200 bg-white py-9 sm:py-10"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        {/* Top Strip: Section Kicker & Spotlight Selector Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-800">
              <Newspaper className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>IN-THE-NEWS POLICY BRIEFING · CURATED TWICE WEEKLY</span>
            </div>
            <h2
              id="news-spotlight-heading"
              className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1"
            >
              Real-World Governance Spotlight &amp; Evidence Arguments
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Practical policy implications, exact clause citations, and cross-jurisdictional
              bottlenecks anchored on live AI developments.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Select recent AI governance news spotlight"
            className="flex flex-wrap items-center gap-2"
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
                  className={`px-3 py-2 rounded-md border text-left transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#0B1220] text-white border-[#0B1220]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10.5px] font-mono tabular-nums">
                    <span className={selected ? 'text-emerald-300' : 'text-emerald-700'}>
                      #{idx + 1}
                    </span>
                    <span className={selected ? 'text-slate-300' : 'text-slate-500'}>
                      {spot.publishedDate}
                    </span>
                  </div>
                  <div className="text-xs font-semibold truncate max-w-[210px] mt-0.5">
                    {spot.regionTag}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Analytical Briefing Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Event Trigger, Core Question & Evidence-Backed Arguments */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 font-mono text-slate-600">
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-medium">
                  {activeSpotlight.regionTag}
                </span>
                <span className="tabular-nums">{activeSpotlight.publishedDate}</span>
              </div>

              <a
                href={activeSpotlight.newsSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 hover:text-emerald-800 underline underline-offset-4"
              >
                <span className="truncate max-w-[320px]">{activeSpotlight.newsSourceTitle}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>

            <div>
              <h3 className="font-editorial text-xl sm:text-2xl font-medium text-slate-950 leading-snug">
                {activeSpotlight.headline}
              </h3>
              <p className="mt-2.5 text-sm text-slate-700 leading-relaxed">
                {activeSpotlight.eventSummary}
              </p>
            </div>

            {/* Core Governance Question */}
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 border-l-4 border-l-[#0B1220]">
              <p className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wide">
                Core Governance Question
              </p>
              <p className="mt-1 text-sm font-medium text-slate-950 leading-relaxed">
                {activeSpotlight.coreGovernanceQuestion}
              </p>
            </div>

            {/* Evidence-Backed Arguments for Policymakers */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Evidence-Backed Policy Arguments Across Frameworks</span>
              </div>

              <ol className="space-y-3">
                {activeSpotlight.evidenceArguments.map((arg, idx) => (
                  <li
                    key={`${activeSpotlight.id}-arg-${idx}`}
                    className="p-3.5 rounded-md bg-white border border-slate-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs font-semibold text-slate-400 mt-0.5 tabular-nums shrink-0">
                        0{idx + 1}.
                      </span>
                      <div className="space-y-2 min-w-0">
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                          {arg.claim}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {arg.supportingCitations.map((cit) => (
                            <span
                              key={cit}
                              className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200 rounded"
                            >
                              {cit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Practical Action Buttons */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleTraceTopology}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0B1220] rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Trace in 3-Column Topology</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBrief}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {copiedBrief ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>Briefing Note Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Copy Talking Points &amp; Citations (.md)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
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

          {/* Right Column (5 cols): Jurisdiction Lens Switcher + Bottleneck + Engineering Translation */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Globe2 className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                <span>Compare Jurisdictional Implications</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a policy region or standards lens to inspect obligations and blind spots:
              </p>

              {/* Jurisdiction Lens Tabs */}
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
                      className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {view.lensLabel}
                    </button>
                  );
                })}
              </div>

              {activeLens && (
                <div className="mt-4 p-4 bg-white border border-slate-200 rounded-md space-y-3">
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                    {activeLens.stanceSummary}
                  </p>

                  <div>
                    <p className="text-[11px] font-mono text-slate-500 mb-1">Clauses to Cite:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeLens.citedClauses.map((clause) => (
                        <span
                          key={clause}
                          className="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-900 border border-emerald-200 rounded"
                        >
                          {clause}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">Leverage / Blind Spot: </span>
                    {activeLens.leverageOrBlindSpot}
                  </div>
                </div>
              )}
            </div>

            {/* Interoperability Bottleneck */}
            <div className="p-4 rounded-lg bg-rose-50/60 border border-rose-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-950">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                <span>Where Interoperability Stalls (The Bottleneck)</span>
              </div>
              <p className="mt-1.5 text-xs text-rose-950/90 leading-relaxed">
                {activeSpotlight.interoperabilityBottleneck}
              </p>
            </div>

            {/* Policymaker-to-Engineer Translation */}
            <div className="p-4 rounded-lg bg-emerald-50/55 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-950">
                <Wrench className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Policymaker-to-Engineer Translation</span>
              </div>
              <p className="mt-1.5 text-xs text-emerald-950/90 leading-relaxed">
                {activeSpotlight.engineeringTranslation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
