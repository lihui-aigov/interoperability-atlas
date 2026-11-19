import { ArrowDownToLine, ArrowUpRight, BookMarked, Search, X } from 'lucide-react';
import type { AtlasDataset } from '../types/atlas';
import { countAlignments } from '../utils/atlasAnalytics';

export type WorkspaceTabId = 'spotlights' | 'compare' | 'use-cases' | 'sandbox';

interface AtlasHeaderProps {
  dataset: AtlasDataset;
  activeTab: WorkspaceTabId;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onSelectTab: (tab: WorkspaceTabId) => void;
  onOpenUpdates: () => void;
  onOpenExportModal: () => void;
  onOpenCiteModal: () => void;
}

const HEADER_TABS: { id: WorkspaceTabId; label: string }[] = [
  { id: 'spotlights', label: 'News Briefings' },
  { id: 'compare', label: 'Compare Frameworks' },
  { id: 'use-cases', label: 'Use-Case Checklists' },
  { id: 'sandbox', label: 'Sandbox & Data' },
];

export function AtlasHeader({
  dataset,
  activeTab,
  isSearchOpen,
  onToggleSearch,
  onSelectTab,
  onOpenUpdates,
  onOpenExportModal,
  onOpenCiteModal,
}: AtlasHeaderProps) {
  const { metadata, useCases, instruments, mappings } = dataset;
  const globalCounts = countAlignments(mappings);
  const totalSafe = Math.max(globalCounts.total, 1);
  const eqPct = Math.round((globalCounts.equivalent / totalSafe) * 100);
  const dlPct = Math.round((globalCounts.delta / totalSafe) * 100);
  const frPct = Math.max(0, 100 - eqPct - dlPct);

  const handleHeaderTabClick = (tab: WorkspaceTabId) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div id="top" />
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[var(--atlas-rule)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleHeaderTabClick('spotlights');
            }}
            className="font-editorial text-[17px] sm:text-[19px] font-semibold tracking-[-0.015em] text-[var(--atlas-ink)] whitespace-nowrap truncate min-w-0 h-12 lg:h-14 flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--atlas-accent)]"
          >
            <span className="sm:hidden">AI Gov Atlas</span>
            <span className="hidden sm:inline">Open Atlas of AI Governance</span>
          </a>

          <nav
            id="workspace-tabs"
            role="tablist"
            aria-label="Primary workbench views"
            className="order-3 lg:order-none w-full lg:w-auto flex items-center gap-1 sm:gap-2 overflow-x-auto border-t lg:border-t-0 border-[var(--atlas-rule-subtle)] -mx-4 px-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0"
          >
            {HEADER_TABS.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  id={`workspace-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleHeaderTabClick(t.id)}
                  className={`px-2.5 sm:px-3 h-10 lg:h-14 inline-flex items-center border-b-2 text-xs sm:text-[13px] whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--atlas-accent)] ${
                    isActive
                      ? 'border-[var(--atlas-accent)] text-[var(--atlas-ink)] font-semibold'
                      : 'border-transparent text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-ink)] font-medium'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="order-2 lg:order-none flex items-center gap-1.5 sm:gap-2 shrink-0 h-12 lg:h-14">
            <button
              id="header-search-toggle"
              type="button"
              onClick={onToggleSearch}
              aria-expanded={isSearchOpen}
              aria-controls="global-clause-finder"
              aria-label={isSearchOpen ? 'Close clause search' : 'Search clauses and articles'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-[2px] border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--atlas-accent)] ${
                isSearchOpen
                  ? 'bg-[var(--atlas-accent-tint)] text-[var(--atlas-accent)] border-[var(--atlas-accent)]'
                  : 'bg-white text-[var(--atlas-ink-secondary)] border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] hover:text-[var(--atlas-ink)]'
              }`}
            >
              {isSearchOpen ? (
                <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="hidden xl:inline">{isSearchOpen ? 'Close' : 'Search'}</span>
            </button>

            <a
              href="https://github.com/lihui-aigov/interoperability-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-ink)] transition-colors whitespace-nowrap shrink-0"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3 h-3 text-[var(--atlas-ink-muted)]" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={onOpenCiteModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--atlas-ink)] bg-white hover:bg-[var(--atlas-surface)] border border-[var(--atlas-border-control)] rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--atlas-accent)]"
            >
              <BookMarked className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Cite</span>
            </button>

            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-white bg-[var(--atlas-accent)] hover:bg-[var(--atlas-accent-hover)] rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--atlas-accent)]"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="sm:hidden">Export</span>
              <span className="hidden sm:inline">Export Checklist</span>
            </button>
          </div>
        </div>
      </header>

      {/* Non-sticky quiet context strip: alignment key + live corpus volume */}
      <div className="bg-[var(--atlas-surface)] border-b border-[var(--atlas-rule-subtle)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--atlas-ink-secondary)]">
            <span
              className="inline-flex items-center gap-1.5"
              title="One shared verification test, audit, or log satisfies multiple regimes simultaneously"
            >
              <span
                className="w-2 h-2 rounded-full bg-[var(--align-equivalent-ink)] inline-block shrink-0"
                aria-hidden="true"
              />
              <span>
                Comply Once <span className="tabular-nums text-[var(--atlas-ink-muted)]">({eqPct}%)</span>
              </span>
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              title="Additional national filing, public notice, or local threshold beyond core controls"
            >
              <span
                className="w-2 h-2 rounded-full bg-[var(--align-delta-ink)] inline-block shrink-0"
                aria-hidden="true"
              />
              <span>
                Extra Local Step <span className="tabular-nums text-[var(--atlas-ink-muted)]">({dlPct}%)</span>
              </span>
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              title="Incompatible legal prohibition, reporting clock, or disclosure rule requiring legal review"
            >
              <span
                className="w-2 h-2 rounded-full bg-[var(--align-friction-ink)] inline-block shrink-0"
                aria-hidden="true"
              />
              <span>
                Direct Rule Clash <span className="tabular-nums text-[var(--atlas-ink-muted)]">({frPct}%)</span>
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono tabular-nums text-[var(--atlas-ink-muted)]">
            <span>
              {useCases.length} use cases, {instruments.length} regimes, {mappings.length} verified clauses
            </span>
            <button
              type="button"
              onClick={onOpenUpdates}
              className="text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-accent)] underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              v{metadata.datasetVersion} log ({metadata.recentUpdates.length})
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
