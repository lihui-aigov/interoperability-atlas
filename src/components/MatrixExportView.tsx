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
      className="scroll-mt-16 border-t border-slate-200 bg-white py-12"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        {/* Section Header & 1-Click Export Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-mono text-slate-500">
              Use-Case Compliance Table · Control-by-Framework Breakdown
            </p>
            <h2
              id="matrix-section-heading"
              className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1"
            >
              System Obligations Checklist &amp; Procurement Export
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
              Review what all {dataset.instruments.length} global regimes require for the selected AI
              use case, read exact primary clauses in the sidebar, or export a team checklist.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleDirectMarkdownDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Export Checklist (.md)</span>
            </button>

            <button
              type="button"
              onClick={handleDirectJsonDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Export JSON (.json)</span>
            </button>

            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Preview Deliverable</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <label
                htmlFor="matrix-usecase-select"
                className="text-xs font-medium text-slate-700 whitespace-nowrap shrink-0"
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
                className="text-xs sm:text-sm bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 max-w-md w-full truncate focus-visible:outline-2 focus-visible:outline-slate-900"
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
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="matrix-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter clause, article, or artifact..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-slate-900"
              />
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter matrix cells by alignment type"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md self-start lg:self-auto"
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
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  matrixFilter === opt.value
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inspected Citation Detail Bar (when a matrix cell is clicked) */}
        {inspectedMapping && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-300 rounded-md flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 max-w-4xl">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                <AlignmentIndicator type={inspectedMapping.alignmentType} />
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="font-semibold text-slate-900">
                  {instMap.get(inspectedMapping.instrumentId)?.title}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-slate-600">
                  {ctrlMap.get(inspectedMapping.controlId)?.title}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-900 font-medium">
                {inspectedMapping.clauseCitation} · Verified {inspectedMapping.lastVerified}
              </p>
              {inspectedMapping.clauseExcerpt && (
                <p className="text-xs sm:text-sm text-slate-800 bg-white p-3 border border-slate-200 rounded leading-relaxed">
                  {inspectedMapping.clauseExcerpt}
                </p>
              )}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {inspectedMapping.rationale}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => onInspectClause(inspectedMapping)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Open Full Clause Reader &amp; Verification Steps</span>
                </button>
                <a
                  href={resolveDeepLinkUrl(inspectedMapping).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 underline underline-offset-4 hover:text-emerald-800"
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
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200/70 self-start cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Matrix Table */}
        {rows.length === 0 ? (
          <div className="mt-6 py-12 text-center border border-slate-200 rounded-lg bg-slate-50/50">
            <p className="text-sm font-medium text-slate-800">
              No control mappings match your current search and alignment filter.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Clear the query or switch back to &ldquo;All&rdquo; alignment types to view the full crosswalk.
            </p>
            <button
              type="button"
              onClick={() => {
                setMatrixFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Reset Matrix Filters
            </button>
          </div>
        ) : (
          <div className="mt-6 border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1320px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th
                    scope="col"
                    className="sticky left-0 z-20 bg-slate-50 py-3.5 px-4 text-xs font-semibold text-slate-900 w-64 border-r border-slate-200 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]"
                  >
                    Operational Control &amp; Artifact
                  </th>
                  {dataset.instruments.map((inst) => {
                    const summary = instSummaryById.get(inst.id) ?? { eq: 0, dl: 0, fr: 0 };
                    return (
                      <th
                        key={inst.id}
                        scope="col"
                        className="py-3.5 px-2.5 text-xs font-semibold text-slate-900 align-top border-r last:border-r-0 border-slate-200 w-36"
                      >
                        <div className="leading-snug">{inst.shortName}</div>
                        <div className="text-[11px] font-normal text-slate-500 font-mono tabular-nums mt-0.5">
                          {inst.adoptionYear} · {inst.legalNature.split(' ')[0]}
                        </div>
                        <div className="text-[10px] font-mono tabular-nums mt-1 text-slate-600">
                          <span className="text-emerald-700">{summary.eq} once</span> ·{' '}
                          <span className="text-amber-700">{summary.dl} extra</span> ·{' '}
                          <span className="text-rose-700">{summary.fr} clash</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.control.id} className="hover:bg-slate-50/50 transition-colors">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 py-3.5 px-4 align-top border-r border-slate-200 bg-white shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]"
                    >
                      <div className="text-xs font-semibold text-slate-900 leading-snug">
                        {row.control.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-snug font-normal">
                        {row.control.artifactName}
                      </div>
                    </th>

                    {dataset.instruments.map((inst) => {
                      const cellItems = row.cellsByInstrumentId[inst.id] ?? [];
                      return (
                        <td
                          key={inst.id}
                          className="p-2 align-top border-r last:border-r-0 border-slate-200"
                        >
                          {cellItems.length === 0 ? (
                            <span className="text-[11px] text-slate-300 font-mono select-none">
                              —
                            </span>
                          ) : (
                            <div className="space-y-2">
                              {cellItems.map((m) => {
                                const isSelected = inspectedMapping?.id === m.id;
                                const bgTone =
                                  m.alignmentType === 'equivalent'
                                    ? 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200'
                                    : m.alignmentType === 'delta'
                                      ? 'bg-amber-50/60 hover:bg-amber-50 border-amber-200'
                                      : 'bg-rose-50/70 hover:bg-rose-50 border-rose-200';

                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setInspectedMapping(m)}
                                    onDoubleClick={() => onInspectClause(m)}
                                    aria-label={`Inspect ${inst.shortName} ${m.clauseCitation} for ${row.control.title}`}
                                    className={`w-full text-left p-2 rounded border transition-colors cursor-pointer ${bgTone} ${
                                      isSelected ? 'ring-2 ring-slate-900' : ''
                                    }`}
                                  >
                                    <AlignmentIndicator
                                      type={m.alignmentType}
                                      compact
                                    />
                                    <p className="text-[11px] font-mono text-slate-800 leading-tight mt-1 line-clamp-2">
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
