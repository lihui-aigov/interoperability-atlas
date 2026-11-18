import { ArrowDownToLine, ArrowUpRight, BookMarked, History } from 'lucide-react';
import type { AtlasDataset } from '../types/atlas';
import { countAlignments } from '../utils/atlasAnalytics';

export type WorkspaceTabId = 'spotlights' | 'compare' | 'use-cases' | 'sandbox';

interface AtlasHeaderProps {
  dataset: AtlasDataset;
  activeTab: WorkspaceTabId;
  onSelectTab: (tab: WorkspaceTabId) => void;
  onOpenUpdates: () => void;
  onOpenExportModal: () => void;
  onOpenCiteModal: () => void;
}

const HEADER_TABS: { id: WorkspaceTabId; label: string }[] = [
  { id: 'spotlights', label: 'News Briefings' },
  { id: 'compare', label: 'Compare Frameworks' },
  { id: 'use-cases', label: 'Use-Case Checklists' },
  { id: 'sandbox', label: 'Custom Scenario & Data' },
];

export function AtlasHeader({
  dataset,
  activeTab,
  onSelectTab,
  onOpenUpdates,
  onOpenExportModal,
  onOpenCiteModal,
}: AtlasHeaderProps) {
  const { metadata, useCases, controls, instruments, mappings } = dataset;
  const globalCounts = countAlignments(mappings);
  const totalSafe = Math.max(globalCounts.total, 1);
  const eqPct = Math.round((globalCounts.equivalent / totalSafe) * 100);
  const dlPct = Math.round((globalCounts.delta / totalSafe) * 100);
  const frPct = Math.max(0, 100 - eqPct - dlPct);

  const handleHeaderTabClick = (tab: WorkspaceTabId) => {
    onSelectTab(tab);
    document.getElementById('workspace-tabs')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-8 h-16">
          <a
            href="#top"
            className="font-editorial text-[15px] sm:text-xl font-semibold tracking-tight text-slate-950 whitespace-nowrap truncate min-w-0 sm:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
          >
            <span className="sm:hidden">AI Gov Atlas</span>
            <span className="hidden sm:inline">Open Atlas of AI Governance</span>
          </a>

          <nav
            aria-label="Primary workbench views"
            className="hidden xl:flex items-center gap-1.5 text-sm font-medium text-slate-600"
          >
            {HEADER_TABS.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleHeaderTabClick(t.id)}
                  className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <a
              href="https://github.com/lihui-aigov/interoperability-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-slate-300 bg-white rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={onOpenCiteModal}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookMarked className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Cite</span>
            </button>

            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0B1220] rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
              <span>Export Checklist</span>
            </button>
          </div>
        </div>
      </header>

      <section id="top" className="border-b border-slate-200 bg-white atlas-grid-backdrop">
        <div className="border-b border-slate-200 bg-slate-50/90">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-slate-950 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" aria-hidden="true" />
                Dataset v{metadata.datasetVersion}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>Schema {metadata.schemaVersion}</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>Maintained by @lihui-aigov (Personal Research)</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-800">Updated {metadata.lastUpdated.slice(0, 10)}</span>
            </div>

            <button
              type="button"
              onClick={onOpenUpdates}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 hover:text-slate-950 underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <History className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Autonomous Curation Log ({metadata.recentUpdates.length})
              </span>
            </button>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2.5 py-1 rounded border border-slate-200 bg-white text-[11px] font-mono text-slate-600 mb-3">
                <span>OPEN GOVERNANCE OBSERVATORY</span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span>CC-BY-4.0 CORPUS</span>
              </div>

              <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[2.55rem] font-medium tracking-tight text-slate-950 leading-[1.13]">
                Turn Global AI Rules into Practical Briefings, Gap Checks, and Checklists.
              </h1>

              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                Translate live AI policy debates, framework-to-framework gaps, and system
                compliance duties into verified primary clauses across {instruments.length} global
                regimes.
              </p>

              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/95 border border-emerald-200/80 rounded-md px-3.5 py-2.5">
                  <dt className="font-semibold text-emerald-800 tabular-nums">
                    Comply Once ({eqPct}% · {globalCounts.equivalent} clauses)
                  </dt>
                  <dd className="text-slate-600 mt-0.5">
                    One shared test, audit, or log satisfies multiple regimes
                  </dd>
                </div>
                <div className="bg-white/95 border border-amber-200/80 rounded-md px-3.5 py-2.5">
                  <dt className="font-semibold text-amber-800 tabular-nums">
                    Extra Local Step ({dlPct}% · {globalCounts.delta} clauses)
                  </dt>
                  <dd className="text-slate-600 mt-0.5">
                    Additional national filing, public notice, or local threshold
                  </dd>
                </div>
                <div className="bg-white/95 border border-rose-200/80 rounded-md px-3.5 py-2.5">
                  <dt className="font-semibold text-rose-800 tabular-nums">
                    Direct Rule Clash ({frPct}% · {globalCounts.friction} clauses)
                  </dt>
                  <dd className="text-slate-600 mt-0.5">
                    Conflicting ban, reporting clock, or disclosure rule
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-slate-600 leading-relaxed max-w-2xl border-l-2 border-slate-300 pl-3">
                <span className="font-semibold text-slate-800">Personal note:</span> I started
                this side project because reading AI governance news and policy debates kept
                raising practical questions about what multiple regimes actually require on the
                ground, and no existing tracker linked breaking cases directly to cross-framework
                evidence and operational controls. Maintained in a personal capacity from public
                texts.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-900">
                    Verified Empirical Footprint
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    URL + Clause Checked
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-md">
                    <p className="text-2xl font-editorial font-semibold text-slate-950 tabular-nums">
                      {useCases.length}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">Concrete AI Use Cases</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-md">
                    <p className="text-2xl font-editorial font-semibold text-slate-950 tabular-nums">
                      {controls.length}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">Operational Controls</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-md">
                    <p className="text-2xl font-editorial font-semibold text-slate-950 tabular-nums">
                      {instruments.length}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">Global &amp; Regional Regimes</p>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-950 rounded-md text-white">
                    <p className="text-2xl font-editorial font-semibold tabular-nums">
                      {mappings.length}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">Cited Clause Mappings</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono tabular-nums text-slate-600 mb-1.5">
                    <span>Portfolio Mix</span>
                    <span>
                      {globalCounts.equivalent} Comply Once · {globalCounts.delta} Extra Steps ·{' '}
                      {globalCounts.friction} Clashes
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-sm overflow-hidden flex" aria-hidden="true">
                    <div style={{ width: `${eqPct}%` }} className="bg-emerald-600 h-full" />
                    <div style={{ width: `${dlPct}%` }} className="bg-amber-500 h-full" />
                    <div style={{ width: `${frPct}%` }} className="bg-rose-600 h-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
