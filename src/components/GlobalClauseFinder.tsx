import { BookOpen, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AtlasDataset, InteropMapping } from '../types/atlas';
import { searchAtlasClauses } from '../utils/clauseNavigation';
import { AlignmentIndicator } from './AlignmentIndicator';

interface GlobalClauseFinderProps {
  dataset: AtlasDataset;
  isOpen: boolean;
  onClose: () => void;
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

export function GlobalClauseFinder({
  dataset,
  isOpen,
  onClose,
  onOpenClause,
}: GlobalClauseFinderProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  const results = useMemo(
    () => searchAtlasClauses(dataset, query, 12),
    [dataset, query]
  );

  if (!isOpen) return null;

  return (
    <section
      id="global-clause-finder"
      aria-label="Instant Clause & Keyword Navigator"
      className="border-b border-[var(--atlas-rule)] bg-white animate-fade-in"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-2xl">
            <label htmlFor="global-clause-search" className="sr-only">
              Search any article, section, keyword, or operational requirement across all frameworks
            </label>
            <Search
              className="w-4 h-4 text-[var(--atlas-ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="global-clause-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clauses, articles, or regimes (Art. 10, ASEAN)..."
              className="w-full pl-9 pr-9 py-2 text-base sm:text-sm bg-white border border-[var(--atlas-border-control)] rounded-[2px] text-[var(--atlas-ink)] placeholder:text-[var(--atlas-ink-muted)] focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear clause search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--atlas-ink-muted)] hover:text-[var(--atlas-ink)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[var(--atlas-ink-muted)] mr-1 hidden sm:inline">Jump to:</span>
            {QUICK_CLAUSE_QUERIES.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() =>
                  setQuery((prev) => (prev === chip.query ? '' : chip.query))
                }
                className={`px-2.5 py-1 text-xs font-medium rounded-[2px] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  query === chip.query
                    ? 'bg-[var(--atlas-accent)] text-white border-[var(--atlas-accent)]'
                    : 'bg-[var(--atlas-surface)] text-[var(--atlas-ink-secondary)] border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] hover:text-[var(--atlas-ink)]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Search Results Panel */}
        {query.trim().length >= 2 && (
          <div className="mt-3 bg-white border border-[var(--atlas-rule)] rounded-[2px] overflow-hidden">
            <div className="px-4 py-2 bg-[var(--atlas-surface)] border-b border-[var(--atlas-rule)] flex items-center justify-between text-xs text-[var(--atlas-ink-secondary)]">
              <span className="font-mono tabular-nums">
                {results.length} matching clause provisions for &ldquo;{query.trim()}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[var(--atlas-accent)] hover:underline underline-offset-4 font-medium cursor-pointer"
              >
                Clear Search
              </button>
            </div>

            {results.length === 0 ? (
              <div className="px-4 py-6 text-xs text-[var(--atlas-ink-muted)] text-center">
                No clause provisions matched &ldquo;{query.trim()}&rdquo;. Try searching an article
                number (<code className="font-mono">Art. 14</code>), domain (<code className="font-mono">hiring</code>), or standard (<code className="font-mono">42001</code>).
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-[var(--atlas-rule-subtle)]">
                {results.map((res) => (
                  <button
                    key={res.mapping.id}
                    type="button"
                    onClick={() => {
                      onOpenClause(res.mapping);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--atlas-surface)] transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 max-w-4xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <AlignmentIndicator type={res.mapping.alignmentType} compact dotOnly />
                        <span className="font-semibold text-[var(--atlas-ink)]">
                          {res.instrumentShortName}
                        </span>
                        <span className="font-mono text-[var(--atlas-ink-secondary)]">
                          {res.mapping.clauseCitation}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1 line-clamp-2 leading-relaxed">
                        {res.matchSnippet}
                      </p>
                      <p className="text-[11px] text-[var(--atlas-ink-muted)] mt-1">
                        {res.useCaseTitle} — {res.controlTitle}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--atlas-accent)] shrink-0 self-start sm:self-center">
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
