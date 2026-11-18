import { ArrowDownToLine, History } from 'lucide-react';
import type { AtlasDataset } from '../types/atlas';

interface AtlasHeaderProps {
  dataset: AtlasDataset;
  onOpenUpdates: () => void;
  onOpenExportModal: () => void;
}

export function AtlasHeader({
  dataset,
  onOpenUpdates,
  onOpenExportModal,
}: AtlasHeaderProps) {
  const { metadata, useCases, controls, instruments, mappings } = dataset;

  return (
    <>
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 sm:gap-8 px-4 sm:px-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="font-editorial text-[15px] sm:text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap truncate min-w-0 sm:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
          >
            Open Atlas of AI Governance
          </a>

          {/* Zone 2: 4 single-line navigation links */}
          <nav
            aria-label="Primary sections"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#interoperability-flow"
              className="hover:text-slate-900 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Interoperability Flow
            </a>
            <a
              href="#comparison-matrix"
              className="hover:text-slate-900 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Comparison Matrix
            </a>
            <a
              href="#use-case-sandbox"
              className="hover:text-slate-900 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Use-Case Sandbox
            </a>
            <a
              href="#methodology-schema"
              className="hover:text-slate-900 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Methodology &amp; Schema
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
              <span>Export Checklist</span>
            </button>
          </div>
        </div>
      </header>

      {/* Autonomous Update Feed Operational Utility Strip + Institutional Masthead */}
      <section id="top" className="border-b border-slate-200 bg-white">
        {/* Operational Utility Ribbon */}
        <div className="border-b border-slate-200 bg-slate-50/80">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono tabular-nums">
              <span className="text-slate-900 font-medium">
                Dataset v{metadata.datasetVersion}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>Schema {metadata.schemaVersion}</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>{useCases.length} Concrete Use Cases</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>{controls.length} Operational Controls</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>{instruments.length} Global Instruments</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-900 font-medium">
                {mappings.length} Verified Citations
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenUpdates}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 hover:text-slate-950 underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <History className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Recent Automated Updates ({metadata.recentUpdates.length})
              </span>
            </button>
          </div>
        </div>

        {/* Editorial Masthead */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <p className="text-xs font-medium tracking-wide text-slate-500 mb-3">
                Open Policy &amp; Verification Reference · Use-Case-Anchored Governance Mapping
              </p>
              <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[2.65rem] font-medium tracking-tight text-slate-950 leading-[1.15]">
                Comply Once Where Norms Converge. Isolate Deltas Where Jurisdictions Diverge.
              </h1>
              <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-2xl">
                Rather than comparing abstract legal texts clause-by-clause in isolation, this
                atlas anchors global AI governance on concrete operational deployments—showing
                policymakers, standards bodies, procurement officers, and engineers which
                verification artifacts satisfy multiple regimes simultaneously and where statutory
                frictions require targeted legal escalation.
              </p>
            </div>

            <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8">
              <dl className="space-y-3 text-xs">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-medium text-emerald-800">01. Equivalent Core</dt>
                  <dd className="text-slate-600 text-right">
                    Shared control satisfies multiple frameworks
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-slate-100 pt-3">
                  <dt className="font-medium text-amber-800">02. Jurisdictional Delta</dt>
                  <dd className="text-slate-600 text-right">
                    Extra procedural filing, threshold, or scope
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-slate-100 pt-3">
                  <dt className="font-medium text-rose-800">03. Interop Friction</dt>
                  <dd className="text-slate-600 text-right">
                    Conflicting prohibition, clock, or liability rule
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
