import { BookOpen, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AtlasDataset, InteropMapping } from '../types/atlas';
import { searchAtlasClauses } from '../utils/clauseNavigation';
import { AlignmentIndicator } from './AlignmentIndicator';

interface GlobalClauseFinderProps {
  dataset: AtlasDataset;
  onOpenClause: (mapping: InteropMapping) => void;
}

const QUICK_CLAUSE_QUERIES = [
  { label: 'Art. 10 Bias & Data', query: 'Art. 10' },
  { label: 'Art. 27 Public FRIA', query: 'Art. 27' },
  { label: 'Emotion Ban (Art. 5)', query: 'Art. 5(1)(f)' },
  { label: 'Credit & Microfinance', query: 'credit' },
  { label: 'CoE AI Treaty', query: 'CETS 225' },
  { label: 'Agentic Sandboxing', query: 'Agentic' },
];

export function GlobalClauseFinder({ dataset, onOpenClause }: GlobalClauseFinderProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => searchAtlasClauses(dataset, query, 12),
    [dataset, query]
  );

  return (
    <section
      aria-label="Instant Clause & Keyword Navigator"
      className="border-b border-slate-200 bg-slate-50/90"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-2xl">
            <label htmlFor="global-clause-search" className="sr-only">
              Search any article, section, keyword, or operational requirement across all frameworks
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="global-clause-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Instant Clause Finder — type an article, keyword, or regime (e.g., Art. 10, biometric, credit, ASEAN, water)..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-slate-900"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear clause search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 mr-1 hidden sm:inline">Jump to:</span>
            {QUICK_CLAUSE_QUERIES.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() =>
                  setQuery((prev) => (prev === chip.query ? '' : chip.query))
                }
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  query === chip.query
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Search Results Panel */}
        {query.trim().length >= 2 && (
          <div className="mt-3 bg-white border border-slate-300 rounded-md overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="font-mono tabular-nums">
                {results.length} matching clause provisions for &ldquo;{query.trim()}&rdquo; — click any row to open the in-app Clause Reader
              </span>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-700 hover:text-slate-950 font-medium underline underline-offset-4 cursor-pointer"
              >
                Close Results
              </button>
            </div>

            {results.length === 0 ? (
              <div className="px-4 py-6 text-xs text-slate-500 text-center">
                No clause provisions matched &ldquo;{query.trim()}&rdquo;. Try searching an article number (e.g. <code className="font-mono">Art. 14</code>), domain (<code className="font-mono">hiring</code>, <code className="font-mono">grid</code>), or standard (<code className="font-mono">42001</code>).
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-200">
                {results.map((res) => (
                  <button
                    key={res.mapping.id}
                    type="button"
                    onClick={() => onOpenClause(res.mapping)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 max-w-4xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <AlignmentIndicator type={res.mapping.alignmentType} compact />
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-semibold text-slate-900">
                          {res.instrumentShortName}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-mono font-medium text-slate-800">
                          {res.mapping.clauseCitation}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {res.matchSnippet}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {res.useCaseTitle} &rarr; {res.controlTitle}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 shrink-0 self-start sm:self-center">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Read Excerpt</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
