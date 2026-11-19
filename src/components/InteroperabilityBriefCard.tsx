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
  useCase: 'Selected use case, 80/20 interoperability brief',
  control: 'Selected operational control, cross-instrument brief',
  instrument: 'Selected governance instrument, obligations brief',
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
      <div className="bg-white border border-[var(--atlas-rule)] rounded-[2px] overflow-hidden">
        {/* Top Synthesis Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--atlas-rule)]">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="max-w-[68ch]">
              <p className="text-xs font-mono text-[var(--atlas-ink-muted)]">
                {FOCUS_KIND_LABEL[brief.focusType]}, {brief.subtitle}
              </p>
              <h3
                id="brief-card-heading"
                className="font-editorial text-[22px] sm:text-[26px] font-semibold text-[var(--atlas-ink)] mt-1.5"
              >
                {brief.title}
              </h3>
              <p className="mt-2.5 text-sm text-[var(--atlas-ink-secondary)] leading-[1.6]">
                {brief.summary}
              </p>
              <p className="mt-3 text-xs text-[var(--atlas-ink-muted)] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Click any clause citation below to read substantive text and verification steps inside
                  the sidebar reader.
                </span>
              </p>
            </div>

            <div className="lg:w-80 shrink-0 flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-mono tabular-nums text-[var(--atlas-ink-secondary)]">
                <span>{brief.counts.total} active clause mappings</span>
                <span>
                  {brief.counts.equivalent} once, {brief.counts.delta} extra, {brief.counts.friction} clash
                </span>
              </div>

              <div
                className="h-2 w-full bg-[var(--atlas-elevated)] rounded-[1px] overflow-hidden flex"
                aria-hidden="true"
              >
                {brief.counts.equivalent > 0 && (
                  <div
                    style={{ width: `${eqPct}%` }}
                    className="bg-[var(--align-equivalent-ink)] h-full"
                  />
                )}
                {brief.counts.delta > 0 && (
                  <div
                    style={{ width: `${dlPct}%` }}
                    className="bg-[var(--align-delta-ink)] h-full"
                  />
                )}
                {brief.counts.friction > 0 && (
                  <div
                    style={{ width: `${frPct}%` }}
                    className="bg-[var(--align-friction-ink)] h-full"
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-[var(--align-equivalent-ink)]">{eqPct}% Comply Once</span>
                <span className="text-[var(--align-delta-ink)]">{dlPct}% Extra Step</span>
                <span className="text-[var(--align-friction-ink)]">{frPct}% Rule Clash</span>
              </div>

              <button
                type="button"
                onClick={onOpenExportModal}
                className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-[var(--atlas-ink)] bg-[var(--atlas-surface)] hover:bg-[var(--atlas-elevated)] border border-[var(--atlas-border-control)] rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Generate Procurement Checklist</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Column 80/20 Analytical Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[var(--atlas-rule)]">
          {/* Column A: Comply Once */}
          <div className="p-5 sm:p-6">
            <div className="pb-3.5 border-b border-[var(--atlas-rule)]">
              <AlignmentIndicator type="equivalent" dotOnly />
              <h4 className="font-sans text-sm font-semibold text-[var(--atlas-ink)] mt-1">
                Comply Once, Verify Across ({brief.counts.equivalent})
              </h4>
              <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                Operational artifacts satisfying multiple global governance instruments together.
              </p>
            </div>

            {brief.coreControls.filter((c) => c.equivalentMappings.length > 0).length === 0 ? (
              <p className="py-6 text-xs text-[var(--atlas-ink-muted)]">
                No equivalent core mappings match the current filter selection.
              </p>
            ) : (
              <div className="divide-y divide-[var(--atlas-rule-subtle)]">
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
                          className="text-[13px] font-semibold text-[var(--atlas-ink)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 text-left cursor-pointer"
                        >
                          {item.control.title}
                        </button>
                        <span className="text-xs font-mono tabular-nums text-[var(--align-equivalent-ink)] shrink-0">
                          {item.coveredInstruments.length}/{dataset.instruments.length} regimes
                        </span>
                      </div>

                      <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                        Artifact:{' '}
                        <span className="font-medium text-[var(--atlas-ink)]">
                          {item.control.artifactName}
                        </span>
                      </p>

                      <ul className="mt-2.5 divide-y divide-[var(--atlas-rule-subtle)]">
                        {item.equivalentMappings.map((eq) => {
                          const inst = instMap.get(eq.instrumentId);
                          const uc = ucMap.get(eq.useCaseId);
                          const contextName =
                            brief.focusType === 'instrument'
                              ? uc?.title ?? eq.useCaseId
                              : inst?.shortName ?? eq.instrumentId;
                          const { url: deepLinkUrl } = resolveDeepLinkUrl(eq);

                          return (
                            <li key={eq.id} className="py-2 first:pt-1">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => onInspectClause(eq)}
                                  className="text-left group cursor-pointer min-w-0 flex-1"
                                >
                                  <div className="flex flex-wrap items-baseline gap-2 text-xs">
                                    <span className="font-semibold text-[var(--atlas-ink)]">
                                      {contextName}
                                    </span>
                                    <span className="font-mono text-[var(--atlas-accent)] group-hover:underline inline-flex items-center gap-1">
                                      <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                                      <span>{eq.clauseCitation}</span>
                                    </span>
                                  </div>
                                  <p className="text-xs text-[var(--atlas-ink-secondary)] mt-0.5 line-clamp-2 leading-snug">
                                    {eq.rationale}
                                  </p>
                                </button>

                                <a
                                  href={deepLinkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Jump directly to ${eq.clauseCitation} in official source`}
                                  title="Open official text at anchored section"
                                  className="p-1 text-[var(--atlas-ink-muted)] hover:text-[var(--atlas-accent)] rounded-[2px] shrink-0"
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
          <div className="p-5 sm:p-6">
            <div className="pb-3.5 border-b border-[var(--atlas-rule)]">
              <AlignmentIndicator type="delta" dotOnly />
              <h4 className="font-sans text-sm font-semibold text-[var(--atlas-ink)] mt-1">
                Jurisdictional &amp; Normative Deltas ({brief.deltaMappings.length})
              </h4>
              <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                Extra statutory filings, local cohort validations, or agentic checkpoints.
              </p>
            </div>

            {brief.deltaMappings.length === 0 ? (
              <p className="py-6 text-xs text-[var(--atlas-ink-muted)]">
                No jurisdictional deltas match the current filter selection.
              </p>
            ) : (
              <div className="divide-y divide-[var(--atlas-rule-subtle)]">
                {brief.deltaMappings.map((dm) => {
                  const inst = instMap.get(dm.instrumentId);
                  const ctrl = ctrlMap.get(dm.controlId);
                  const uc = ucMap.get(dm.useCaseId);
                  const { url: deepLinkUrl } = resolveDeepLinkUrl(dm);

                  return (
                    <div key={dm.id} className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onSelectEntity({ type: 'instrument', id: dm.instrumentId })
                            }
                            className="font-semibold text-[var(--atlas-ink)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 cursor-pointer"
                          >
                            {inst?.shortName ?? dm.instrumentId}
                          </button>
                          <span className="text-[var(--atlas-ink-muted)]">
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
                          className="p-1 text-[var(--atlas-ink-muted)] hover:text-[var(--atlas-accent)] rounded-[2px] shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      </div>

                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => onInspectClause(dm)}
                          className="text-xs font-mono text-[var(--align-delta-ink)] hover:underline inline-flex items-center gap-1 text-left cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{dm.clauseCitation}</span>
                        </button>
                      </div>

                      <p className="mt-1.5 text-xs text-[var(--atlas-ink-secondary)] leading-relaxed">
                        {dm.rationale}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column C: Direct Rule Clashes */}
          <div className="p-5 sm:p-6">
            <div className="pb-3.5 border-b border-[var(--atlas-rule)]">
              <AlignmentIndicator type="friction" dotOnly />
              <h4 className="font-sans text-sm font-semibold text-[var(--atlas-ink)] mt-1">
                Interoperability Friction ({brief.frictionMappings.length})
              </h4>
              <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                Categorical prohibitions, competing incident clocks, or privacy-vs-audit tensions.
              </p>
            </div>

            {brief.frictionMappings.length === 0 ? (
              <p className="py-6 text-xs text-[var(--atlas-ink-muted)]">
                No regulatory friction points match the current filter selection.
              </p>
            ) : (
              <div className="divide-y divide-[var(--atlas-rule-subtle)]">
                {brief.frictionMappings.map((fm) => {
                  const inst = instMap.get(fm.instrumentId);
                  const ctrl = ctrlMap.get(fm.controlId);
                  const uc = ucMap.get(fm.useCaseId);
                  const { url: deepLinkUrl } = resolveDeepLinkUrl(fm);

                  return (
                    <div key={fm.id} className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onSelectEntity({ type: 'instrument', id: fm.instrumentId })
                            }
                            className="font-semibold text-[var(--align-friction-ink)] hover:underline underline-offset-4 cursor-pointer"
                          >
                            {inst?.shortName ?? fm.instrumentId}
                          </button>
                          <span className="text-[var(--atlas-ink-muted)]">
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
                          className="p-1 text-[var(--atlas-ink-muted)] hover:text-[var(--align-friction-ink)] rounded-[2px] shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      </div>

                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => onInspectClause(fm)}
                          className="text-xs font-mono text-[var(--align-friction-ink)] hover:underline inline-flex items-center gap-1 text-left cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{fm.clauseCitation}</span>
                        </button>
                      </div>

                      <p className="mt-1.5 text-xs text-[var(--atlas-ink)] leading-relaxed">
                        {fm.rationale}
                      </p>
                      <p className="mt-1 text-[11px] font-mono tabular-nums text-[var(--atlas-ink-muted)]">
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
