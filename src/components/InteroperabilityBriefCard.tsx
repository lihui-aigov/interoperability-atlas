import { BookOpen, ExternalLink, FileCheck2 } from 'lucide-react';
import type { AtlasDataset, InteropMapping } from '../types/atlas';
import type { FocusSelection, InteroperabilityBrief } from '../utils/atlasAnalytics';
import { resolveDeepLinkUrl } from '../utils/clauseNavigation';
import { AlignmentIndicator } from './AlignmentIndicator';

interface InteroperabilityBriefCardProps {
  dataset: AtlasDataset;
  brief: InteroperabilityBrief;
  onSelectEntity: (selection: FocusSelection) => void;
  onInspectClause: (mapping: InteropMapping) => void;
  onOpenExportModal: () => void;
}

const FOCUS_KIND_LABEL: Record<FocusSelection['type'], string> = {
  useCase: 'Selected Use Case · 80/20 Interoperability Brief',
  control: 'Selected Operational Control · Cross-Instrument Coverage Brief',
  instrument: 'Selected Governance Instrument · Use-Case Obligation Brief',
};

export function InteroperabilityBriefCard({
  dataset,
  brief,
  onSelectEntity,
  onInspectClause,
  onOpenExportModal,
}: InteroperabilityBriefCardProps) {
  const instMap = new Map(dataset.instruments.map((i) => [i.id, i]));
  const ctrlMap = new Map(dataset.controls.map((c) => [c.id, c]));
  const ucMap = new Map(dataset.useCases.map((u) => [u.id, u]));

  const total = Math.max(brief.counts.total, 1);
  const eqPct = Math.round((brief.counts.equivalent / total) * 100);
  const dlPct = Math.round((brief.counts.delta / total) * 100);
  const frPct = Math.max(0, 100 - eqPct - dlPct);

  return (
    <section
      aria-labelledby="brief-card-heading"
      className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-12"
    >
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Top Synthesis Header */}
        <div className="p-6 sm:p-8 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-xs font-mono text-slate-500">
                {FOCUS_KIND_LABEL[brief.focusType]} · {brief.subtitle}
              </p>
              <h3
                id="brief-card-heading"
                className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1.5"
              >
                {brief.title}
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                {brief.summary}
              </p>
              <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
                <span>
                  Click any clause citation below to read its substantive text &amp; verification steps inside the app, or use <ExternalLink className="w-3 h-3 inline" aria-hidden="true" /> to jump directly to the anchored section.
                </span>
              </p>
            </div>

            <div className="lg:w-80 shrink-0 flex flex-col gap-3">
              <div className="flex items-baseline justify-between text-xs font-mono tabular-nums text-slate-600">
                <span>{brief.counts.total} Active Clause Mappings</span>
                <span>
                  {brief.counts.equivalent}E · {brief.counts.delta}D · {brief.counts.friction}F
                </span>
              </div>

              {/* Proportion Bar paired with explicit text counts below */}
              <div
                className="h-2.5 w-full bg-slate-100 rounded-sm overflow-hidden flex"
                aria-hidden="true"
              >
                {brief.counts.equivalent > 0 && (
                  <div
                    style={{ width: `${eqPct}%` }}
                    className="bg-emerald-600 h-full"
                  />
                )}
                {brief.counts.delta > 0 && (
                  <div
                    style={{ width: `${dlPct}%` }}
                    className="bg-amber-500 h-full"
                  />
                )}
                {brief.counts.friction > 0 && (
                  <div
                    style={{ width: `${frPct}%` }}
                    className="bg-rose-600 h-full"
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600">
                <span className="text-emerald-800">{eqPct}% Core</span>
                <span className="text-amber-800">{dlPct}% Delta</span>
                <span className="text-rose-800">{frPct}% Friction</span>
              </div>

              <button
                type="button"
                onClick={onOpenExportModal}
                className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Generate Procurement Checklist</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Column 80/20 Analytical Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Column A: Comply Once, Verify Across (Shared Core Controls) */}
          <div className="p-6 sm:p-7">
            <div className="pb-4 border-b border-slate-200">
              <AlignmentIndicator type="equivalent" />
              <h4 className="text-base font-semibold text-slate-950 mt-1">
                Comply Once, Verify Across ({brief.counts.equivalent})
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Operational verification artifacts satisfying multiple global governance instruments simultaneously.
              </p>
            </div>

            {brief.coreControls.filter((c) => c.equivalentMappings.length > 0).length === 0 ? (
              <p className="py-6 text-xs text-slate-500">
                No equivalent core mappings match the current filter selection.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {brief.coreControls
                  .filter((c) => c.equivalentMappings.length > 0)
                  .map((item) => (
                    <div key={item.control.id} className="py-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectEntity({ type: 'control', id: item.control.id })
                          }
                          className="text-sm font-semibold text-slate-900 hover:text-emerald-800 hover:underline underline-offset-4 text-left cursor-pointer"
                        >
                          {item.control.title}
                        </button>
                        <span className="text-xs font-mono tabular-nums text-emerald-800 shrink-0">
                          {item.coveredInstruments.length}/{dataset.instruments.length} regimes
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        Artifact:{' '}
                        <span className="font-medium text-slate-800">
                          {item.control.artifactName}
                        </span>
                      </p>

                      <ul className="mt-3 space-y-2.5">
                        {item.equivalentMappings.map((eq) => {
                          const inst = instMap.get(eq.instrumentId);
                          const uc = ucMap.get(eq.useCaseId);
                          const contextName =
                            brief.focusType === 'instrument'
                              ? uc?.title ?? eq.useCaseId
                              : inst?.shortName ?? eq.instrumentId;
                          const { url: deepLinkUrl } = resolveDeepLinkUrl(eq);

                          return (
                            <li
                              key={eq.id}
                              className="p-2.5 rounded-md bg-slate-50/80 hover:bg-emerald-50/50 border border-slate-200/80 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => onInspectClause(eq)}
                                  className="text-left group cursor-pointer min-w-0 flex-1"
                                >
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="font-semibold text-slate-900">
                                      {contextName}
                                    </span>
                                    <span aria-hidden="true" className="text-slate-300">
                                      ·
                                    </span>
                                    <span className="font-mono text-emerald-800 group-hover:underline inline-flex items-center gap-1">
                                      <BookOpen
                                        className="w-3 h-3 shrink-0"
                                        aria-hidden="true"
                                      />
                                      <span>{eq.clauseCitation}</span>
                                    </span>
                                  </div>
                                  <p className="text-[11.5px] text-slate-600 mt-1 line-clamp-2 leading-snug">
                                    {eq.rationale}
                                  </p>
                                </button>

                                <a
                                  href={deepLinkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Jump directly to ${eq.clauseCitation} in official source`}
                                  title="Open official text at anchored section"
                                  className="p-1 text-slate-400 hover:text-slate-900 rounded hover:bg-white shrink-0"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                </a>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Column B: Jurisdictional & Normative Deltas */}
          <div className="p-6 sm:p-7">
            <div className="pb-4 border-b border-slate-200">
              <AlignmentIndicator type="delta" />
              <h4 className="text-base font-semibold text-slate-950 mt-1">
                Jurisdictional &amp; Normative Deltas ({brief.deltaMappings.length})
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Extra statutory filings, local cohort validations, or agentic checkpoints beyond baseline AIMS/RMF controls.
              </p>
            </div>

            {brief.deltaMappings.length === 0 ? (
              <p className="py-6 text-xs text-slate-500">
                No jurisdictional deltas match the current filter selection.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {brief.deltaMappings.map((dm) => {
                  const inst = instMap.get(dm.instrumentId);
                  const ctrl = ctrlMap.get(dm.controlId);
                  const uc = ucMap.get(dm.useCaseId);
                  const { url: deepLinkUrl } = resolveDeepLinkUrl(dm);

                  return (
                    <div key={dm.id} className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onSelectEntity({ type: 'instrument', id: dm.instrumentId })
                            }
                            className="font-semibold text-slate-900 hover:underline underline-offset-4 cursor-pointer"
                          >
                            {inst?.shortName ?? dm.instrumentId}
                          </button>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-slate-600">
                            {brief.focusType === 'control'
                              ? uc?.title ?? dm.useCaseId
                              : ctrl?.title ?? dm.controlId}
                          </span>
                        </div>

                        <a
                          href={deepLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Jump directly to ${dm.clauseCitation} in official source`}
                          title="Open official text at anchored section"
                          className="p-1 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      </div>

                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => onInspectClause(dm)}
                          className="text-xs font-mono text-amber-800 hover:underline inline-flex items-center gap-1 text-left cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{dm.clauseCitation}</span>
                        </button>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                        {dm.rationale}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column C: Interoperability Friction & Normative Clashes */}
          <div className="p-6 sm:p-7 bg-rose-50/25">
            <div className="pb-4 border-b border-slate-200">
              <AlignmentIndicator type="friction" />
              <h4 className="text-base font-semibold text-slate-950 mt-1">
                Interoperability Friction ({brief.frictionMappings.length})
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Categorical prohibitions, conflicting incident clocks, or privacy-vs-audit tensions where technical controls alone cannot bridge regimes.
              </p>
            </div>

            {brief.frictionMappings.length === 0 ? (
              <p className="py-6 text-xs text-slate-500">
                No regulatory friction points match the current filter selection.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {brief.frictionMappings.map((fm) => {
                  const inst = instMap.get(fm.instrumentId);
                  const ctrl = ctrlMap.get(fm.controlId);
                  const uc = ucMap.get(fm.useCaseId);
                  const { url: deepLinkUrl } = resolveDeepLinkUrl(fm);

                  return (
                    <div key={fm.id} className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onSelectEntity({ type: 'instrument', id: fm.instrumentId })
                            }
                            className="font-semibold text-rose-900 hover:underline underline-offset-4 cursor-pointer"
                          >
                            {inst?.shortName ?? fm.instrumentId}
                          </button>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-slate-600">
                            {brief.focusType === 'control'
                              ? uc?.title ?? fm.useCaseId
                              : ctrl?.title ?? fm.controlId}
                          </span>
                        </div>

                        <a
                          href={deepLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Jump directly to ${fm.clauseCitation} in official source`}
                          title="Open official text at anchored section"
                          className="p-1 text-slate-400 hover:text-rose-900 rounded hover:bg-rose-100/60 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      </div>

                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => onInspectClause(fm)}
                          className="text-xs font-mono text-rose-800 hover:underline inline-flex items-center gap-1 text-left cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{fm.clauseCitation}</span>
                        </button>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-800 leading-relaxed">
                        {fm.rationale}
                      </p>
                      <p className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
                        Verified {fm.lastVerified}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
