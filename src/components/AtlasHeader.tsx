import { ArrowDownToLine, ArrowUpRight, BookMarked, History } from 'lucide-react';
import type { AtlasDataset } from '../types/atlas';
import { countAlignments } from '../utils/atlasAnalytics';

interface AtlasHeaderProps {
  dataset: AtlasDataset;
  onOpenUpdates: () => void;
  onOpenExportModal: () => void;
  onOpenCiteModal: () => void;
}

export function AtlasHeader({
  dataset,
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

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-8 h-16">
          <a
            href="#top"
            className="font-editorial text-[15px] sm:text-xl font-semibold tracking-tight text-slate-950 whitespace-nowrap truncate min-w-0 sm:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
          >
            <span className="sm:hidden">AI Governance Atlas</span>
            <span className="hidden sm:inline">Open Atlas of AI Governance</span>
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#regime-overview"
              className="hover:text-slate-950 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Regime Convergence
            </a>
            <a
              href="#interoperability-flow"
              className="hover:text-slate-950 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Interoperability Flow
            </a>
            <a
              href="#comparison-matrix"
              className="hover:text-slate-950 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Crosswalk Matrix
            </a>
            <a
              href="#use-case-sandbox"
              className="hover:text-slate-950 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Scenario Sandbox
            </a>
            <a
              href="#methodology-schema"
              className="hover:text-slate-950 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Methodology
            </a>
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

        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-9 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2.5 py-1 rounded border border-slate-200 bg-white text-[11px] font-mono text-slate-600 mb-3">
                <span>OPEN GOVERNANCE OBSERVATORY</span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span>CC-BY-4.0 CORPUS</span>
              </div>

              <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[2.65rem] font-medium tracking-tight text-slate-950 leading-[1.13]">
                Comply Once Where Norms Converge. Isolate Deltas Where Jurisdictions Diverge.
              </h1>

              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                Rather than comparing abstract legal texts in isolation, this observatory anchors
                global AI governance on concrete operational deployments: showing policymakers,
                procurement officers, and engineering teams which verification artifacts satisfy
                multiple regimes at once and where statutory friction demands targeted escalation.
              </p>

              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/95 border border-emerald-200/80 rounded-md px-3.5 py-2.5">
                  <dt className="font-semibold text-emerald-800">01. Equivalent Core ({eqPct}%)</dt>
                  <dd className="text-slate-600 mt-0.5">
                    Shared control satisfies multiple frameworks
                  </dd>
                </div>
                <div className="bg-white/95 border border-amber-200/80 rounded-md px-3.5 py-2.5">
                  <dt className="font-semibold text-amber-800">02. Jurisdictional Delta ({dlPct}%)</dt>
                  <dd className="text-slate-600 mt-0.5">
                    Extra local filing, scope, or audit threshold
                  </dd>
                </div>
                <div className="bg-white/95 border border-rose-200/80 rounded-md px-3.5 py-2.5">
                  <dt className="font-semibold text-rose-800">03. Interop Friction ({frPct}%)</dt>
                  <dd className="text-slate-600 mt-0.5">
                    Conflicting ban, clock, or copyright duty
                  </dd>
                </div>
              </dl>
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
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-600 mb-1.5">
                    <span>Portfolio Mix</span>
                    <span>
                      {globalCounts.equivalent}E · {globalCounts.delta}D · {globalCounts.friction}F
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
