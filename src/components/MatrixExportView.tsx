import { BookOpen, Download, ExternalLink, FileCode2, FileText, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AlignmentType, AtlasDataset, InteropMapping, UseCase } from '../types/atlas';
import {
  buildUseCaseMatrix,
  generateProcurementMarkdown,
  generateUseCaseJsonExport,
} from '../utils/atlasAnalytics';
import { resolveDeepLinkUrl } from '../utils/clauseNavigation';
import { AlignmentIndicator } from './AlignmentIndicator';
import { triggerFileDownload } from './ExportPreviewModal';

interface MatrixExportViewProps {
  dataset: AtlasDataset;
  selectedUseCase: UseCase;
  onChangeUseCase: (useCaseId: string) => void;
  onInspectClause: (mapping: InteropMapping) => void;
  onOpenExportModal: () => void;
}

export function MatrixExportView({
  dataset,
  selectedUseCase,
  onChangeUseCase,
  onInspectClause,
  onOpenExportModal,
}: MatrixExportViewProps) {
  const [matrixFilter, setMatrixFilter] = useState<AlignmentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedMapping, setInspectedMapping] = useState<InteropMapping | null>(null);

  const rows = useMemo(
    () => buildUseCaseMatrix(dataset, selectedUseCase.id, matrixFilter, searchQuery),
    [dataset, selectedUseCase.id, matrixFilter, searchQuery]
  );

  const instMap = useMemo(
    () => new Map(dataset.instruments.map((i) => [i.id, i])),
    [dataset.instruments]
  );
  const ctrlMap = useMemo(
    () => new Map(dataset.controls.map((c) => [c.id, c])),
    [dataset.controls]
  );

  const instSummaryById = useMemo(() => {
    const map = new Map<string, { eq: number; dl: number; fr: number }>();
    for (const inst of dataset.instruments) {
      map.set(inst.id, { eq: 0, dl: 0, fr: 0 });
    }
    for (const row of rows) {
      for (const inst of dataset.instruments) {
        for (const m of row.cellsByInstrumentId[inst.id] ?? []) {
          const entry = map.get(inst.id);
          if (!entry) continue;
          if (m.alignmentType === 'equivalent') entry.eq += 1;
          else if (m.alignmentType === 'delta') entry.dl += 1;
          else if (m.alignmentType === 'friction') entry.fr += 1;
        }
      }
    }
    return map;
  }, [dataset.instruments, rows]);

  const handleDirectMarkdownDownload = () => {
    const md = generateProcurementMarkdown(dataset, selectedUseCase);
    const slug = selectedUseCase.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    triggerFileDownload(`procurement-checklist-${slug}.md`, md, 'text/markdown;charset=utf-8');
  };

  const handleDirectJsonDownload = () => {
    const json = generateUseCaseJsonExport(dataset, selectedUseCase);
    const slug = selectedUseCase.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    triggerFileDownload(`atlas-mapping-${slug}.json`, json, 'application/json;charset=utf-8');
  };

  return (
    <section
      id="comparison-matrix"
      aria-labelledby="matrix-section-heading"
      className="scroll-mt-16 border-t border-[var(--atlas-rule)] bg-[var(--atlas-ground)] py-8"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        {/* Section Header & Export Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[var(--atlas-rule)]">
          <div>
            <h2
              id="matrix-section-heading"
              className="font-editorial text-[22px] sm:text-[26px] font-semibold text-[var(--atlas-ink)]"
            >
              Obligations Table &amp; Procurement Export
            </h2>
            <p className="text-sm text-[var(--atlas-ink-secondary)] mt-1 max-w-[68ch]">
              Review what all {dataset.instruments.length} frameworks require for{' '}
              <span className="font-medium text-[var(--atlas-ink)]">{selectedUseCase.title}</span>,
              inspect clauses in the sidebar, or export a checklist.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDirectMarkdownDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[var(--atlas-accent)] hover:bg-[var(--atlas-accent-hover)] rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Export Checklist (.md)</span>
            </button>

            <button
              type="button"
              onClick={handleDirectJsonDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Export JSON (.json)</span>
            </button>

            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--atlas-ink-secondary)] bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px] hover:text-[var(--atlas-ink)] hover:border-[var(--atlas-border-control)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Preview Deliverable</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="py-4 border-b border-[var(--atlas-rule)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <label
                htmlFor="matrix-usecase-select"
                className="text-xs font-medium text-[var(--atlas-ink-secondary)] whitespace-nowrap shrink-0"
              >
                Use Case:
              </label>
              <select
                id="matrix-usecase-select"
                value={selectedUseCase.id}
                onChange={(e) => {
                  onChangeUseCase(e.target.value);
                  setInspectedMapping(null);
                }}
                className="text-base sm:text-sm bg-white border border-[var(--atlas-border-control)] rounded-[2px] px-3 py-1.5 text-[var(--atlas-ink)] max-w-md w-full truncate focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
              >
                {dataset.useCases.map((uc) => (
                  <option key={uc.id} value={uc.id}>
                    {uc.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-xs">
              <label htmlFor="matrix-search-input" className="sr-only">
                Search controls, citations, or rationales
              </label>
              <Search
                className="w-4 h-4 text-[var(--atlas-ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="matrix-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter clause, article, or artifact..."
                className="w-full pl-9 pr-3 py-1.5 text-base sm:text-sm bg-white border border-[var(--atlas-border-control)] rounded-[2px] text-[var(--atlas-ink)] placeholder:text-[var(--atlas-ink-muted)] focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
              />
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter matrix cells by alignment type"
            className="flex flex-wrap items-center gap-1 p-1 bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px] self-start lg:self-auto"
          >
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'equivalent', label: 'Comply Once' },
                { value: 'delta', label: 'Extra Step' },
                { value: 'friction', label: 'Rule Clash' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMatrixFilter(opt.value)}
                aria-pressed={matrixFilter === opt.value}
                className={`px-3 py-1 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  matrixFilter === opt.value
                    ? 'bg-white text-[var(--atlas-ink)] border border-[var(--atlas-rule)]'
                    : 'text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-ink)] border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inspected Citation Detail Bar (when a matrix cell is clicked) */}
        {inspectedMapping && (
          <div className="mt-4 p-5 bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2.5 max-w-4xl">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                <AlignmentIndicator type={inspectedMapping.alignmentType} dotOnly />
                <span className="font-semibold text-[var(--atlas-ink)]">
                  {instMap.get(inspectedMapping.instrumentId)?.title}
                </span>
                <span className="text-[var(--atlas-ink-secondary)]">
                  ({ctrlMap.get(inspectedMapping.controlId)?.title})
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--atlas-ink)] font-medium tabular-nums">
                {inspectedMapping.clauseCitation}, verified {inspectedMapping.lastVerified}
              </p>
              {inspectedMapping.clauseExcerpt && (
                <p className="text-xs sm:text-sm text-[var(--atlas-ink)] bg-white p-3.5 border border-[var(--atlas-rule)] rounded-[2px] leading-[1.6] max-w-[68ch]">
                  {inspectedMapping.clauseExcerpt}
                </p>
              )}
              <p className="text-xs sm:text-sm text-[var(--atlas-ink-secondary)] leading-[1.55] max-w-[68ch]">
                {inspectedMapping.rationale}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => onInspectClause(inspectedMapping)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[var(--atlas-accent)] rounded-[2px] hover:bg-[var(--atlas-accent-hover)] transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Open Full Clause Reader &amp; Verification Steps</span>
                </button>
                <a
                  href={resolveDeepLinkUrl(inspectedMapping).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--atlas-accent)] underline underline-offset-4"
                >
                  <span>Jump to Section in Official Text</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectedMapping(null)}
              aria-label="Dismiss citation inspector"
              className="p-1.5 text-[var(--atlas-ink-muted)] hover:text-[var(--atlas-ink)] rounded-[2px] hover:bg-white self-start cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Calm Hairline Crosswalk Table */}
        {rows.length === 0 ? (
          <div className="mt-6 py-12 text-center border border-[var(--atlas-rule)] rounded-[2px] bg-[var(--atlas-surface)]">
            <p className="text-sm font-medium text-[var(--atlas-ink)]">
              No control mappings match your current search and alignment filter.
            </p>
            <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
              Clear the query or switch back to &ldquo;All&rdquo; alignment types to view the full crosswalk.
            </p>
            <button
              type="button"
              onClick={() => {
                setMatrixFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[var(--atlas-accent)] rounded-[2px] hover:bg-[var(--atlas-accent-hover)] transition-colors cursor-pointer"
            >
              Reset Matrix Filters
            </button>
          </div>
        ) : (
          <div className="mt-6 border border-[var(--atlas-rule)] rounded-[2px] overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1320px]">
              <thead>
                <tr className="bg-[var(--atlas-elevated)] border-b border-[var(--atlas-rule)]">
                  <th
                    scope="col"
                    className="sticky left-0 z-20 bg-[var(--atlas-elevated)] py-3.5 px-4 text-xs font-semibold text-[var(--atlas-ink)] w-64 border-r border-[var(--atlas-rule)]"
                  >
                    Operational Control &amp; Artifact
                  </th>
                  {dataset.instruments.map((inst) => {
                    const summary = instSummaryById.get(inst.id) ?? { eq: 0, dl: 0, fr: 0 };
                    return (
                      <th
                        key={inst.id}
                        scope="col"
                        className="py-3 px-2.5 text-xs font-semibold text-[var(--atlas-ink)] align-top border-r last:border-r-0 border-[var(--atlas-rule)] w-36"
                      >
                        <div className="leading-snug">{inst.shortName}</div>
                        <div className="text-[11px] font-normal text-[var(--atlas-ink-muted)] font-mono tabular-nums mt-0.5">
                          {inst.adoptionYear}, {inst.legalNature.split(' ')[0]}
                        </div>
                        <div className="text-[10.5px] font-mono font-normal tabular-nums mt-1 text-[var(--atlas-ink-secondary)]">
                          <span className="text-[var(--align-equivalent-ink)]">{summary.eq} once</span>,{' '}
                          <span className="text-[var(--align-delta-ink)]">{summary.dl} extra</span>,{' '}
                          <span className="text-[var(--align-friction-ink)]">{summary.fr} clash</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atlas-rule-subtle)] bg-white">
                {rows.map((row) => (
                  <tr key={row.control.id} className="hover:bg-[var(--atlas-surface)]/50 transition-colors">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 py-3.5 px-4 align-top border-r border-[var(--atlas-rule)] bg-white"
                    >
                      <div className="text-xs font-semibold text-[var(--atlas-ink)] leading-snug">
                        {row.control.title}
                      </div>
                      <div className="text-[11px] text-[var(--atlas-ink-muted)] mt-1 leading-snug font-normal">
                        {row.control.artifactName}
                      </div>
                    </th>

                    {dataset.instruments.map((inst) => {
                      const cellItems = row.cellsByInstrumentId[inst.id] ?? [];
                      return (
                        <td
                          key={inst.id}
                          className="p-2 align-top border-r last:border-r-0 border-[var(--atlas-rule-subtle)] bg-white"
                        >
                          {cellItems.length === 0 ? (
                            <span className="text-[11px] text-[var(--atlas-ink-muted)] font-mono select-none">
                              —
                            </span>
                          ) : (
                            <div className="space-y-1.5">
                              {cellItems.map((m) => {
                                const isSelected = inspectedMapping?.id === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setInspectedMapping(m)}
                                    onDoubleClick={() => onInspectClause(m)}
                                    aria-label={`Inspect ${inst.shortName} ${m.clauseCitation} for ${row.control.title}`}
                                    className={`w-full text-left p-2 rounded-[2px] border transition-colors cursor-pointer bg-white hover:bg-[var(--atlas-surface)] ${
                                      isSelected
                                        ? 'border-[var(--atlas-accent)] ring-1 ring-[var(--atlas-accent)] bg-[var(--atlas-accent-tint)]'
                                        : 'border-[var(--atlas-rule)]'
                                    }`}
                                  >
                                    <AlignmentIndicator
                                      type={m.alignmentType}
                                      compact
                                      dotOnly
                                    />
                                    <p className="text-[11px] font-mono text-[var(--atlas-ink)] leading-tight mt-1 line-clamp-2">
                                      {m.clauseCitation}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
