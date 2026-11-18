import { ArrowLeftRight, BookOpen, CheckCircle2, Layers, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AtlasDataset, InteropMapping } from '../types/atlas';
import {
  computeInstrumentBreakdown,
  computePairwiseRegimeMatrix,
  type FocusSelection,
} from '../utils/atlasAnalytics';

interface RegimeConvergenceOverviewProps {
  dataset: AtlasDataset;
  selection: FocusSelection;
  onSelectEntity: (selection: FocusSelection) => void;
  onInspectClause: (mapping: InteropMapping) => void;
}

const COMPACT_CODE: Record<string, string> = {
  'inst-unesco-eia': 'UNESCO',
  'inst-eu-ai-act': 'EU AI Act',
  'inst-iso-42001': 'ISO 42001',
  'inst-nist-ai-rmf': 'NIST RMF',
  'inst-sg-agentic': 'SG Agentic',
  'inst-au-strategy': 'AU Strategy',
  'inst-br-kr-laws': 'BR / KR',
  'inst-coe-treaty': 'CoE Treaty',
  'inst-asean-guide': 'ASEAN',
};

function shortCode(id: string, fallback: string): string {
  return COMPACT_CODE[id] ?? fallback.split(' ').slice(0, 2).join(' ');
}

export function RegimeConvergenceOverview({
  dataset,
  selection,
  onSelectEntity,
  onInspectClause,
}: RegimeConvergenceOverviewProps) {
  const breakdown = useMemo(() => computeInstrumentBreakdown(dataset), [dataset]);
  const matrix = useMemo(() => computePairwiseRegimeMatrix(dataset), [dataset]);

  const maxTotal = useMemo(
    () => Math.max(...breakdown.map((b) => b.counts.total), 1),
    [breakdown]
  );

  const [selectedPair, setSelectedPair] = useState<{ aId: string; bId: string }>(() => {
    const hasEu = dataset.instruments.some((i) => i.id === 'inst-eu-ai-act');
    const hasBrKr = dataset.instruments.some((i) => i.id === 'inst-br-kr-laws');
    if (hasEu && hasBrKr) {
      return { aId: 'inst-eu-ai-act', bId: 'inst-br-kr-laws' };
    }
    return {
      aId: dataset.instruments[0]?.id ?? '',
      bId: dataset.instruments[1]?.id ?? '',
    };
  });

  const activeCell =
    matrix.cellsByPair[selectedPair.aId]?.[selectedPair.bId] ?? null;

  const instMap = useMemo(
    () => new Map(dataset.instruments.map((i) => [i.id, i])),
    [dataset.instruments]
  );
  const ctrlMap = useMemo(
    () => new Map(dataset.controls.map((c) => [c.id, c])),
    [dataset.controls]
  );

  const selectedInstA = instMap.get(selectedPair.aId);
  const selectedInstB = instMap.get(selectedPair.bId);

  const handleSelectInstrumentFromOverview = (instrumentId: string) => {
    onSelectEntity({ type: 'instrument', id: instrumentId });
    document.getElementById('interoperability-flow')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="regime-overview"
      aria-labelledby="regime-overview-heading"
      className="scroll-mt-16 border-b border-slate-200 bg-[#F7F8FA] py-10"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6">
          <div>
            <p className="text-xs font-mono text-slate-500">
              00. Cross-Regime Empirical Synthesis · Macro Convergence Map
            </p>
            <h2
              id="regime-overview-heading"
              className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1"
            >
              Where Global Instruments Converge and Clash
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 max-w-3xl">
              Inspect obligation structures across all {dataset.instruments.length} tracked regimes,
              then click any cell in the pairwise convergence heatmap to surface exact shared core
              controls and statutory friction clauses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 mr-1">Quick Pairs:</span>
            <button
              type="button"
              onClick={() =>
                setSelectedPair({ aId: 'inst-eu-ai-act', bId: 'inst-nist-ai-rmf' })
              }
              className={`px-2.5 py-1.5 rounded border font-medium transition-colors cursor-pointer ${
                selectedPair.aId === 'inst-eu-ai-act' && selectedPair.bId === 'inst-nist-ai-rmf'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              EU AI Act × NIST RMF
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedPair({ aId: 'inst-eu-ai-act', bId: 'inst-br-kr-laws' })
              }
              className={`px-2.5 py-1.5 rounded border font-medium transition-colors cursor-pointer ${
                selectedPair.aId === 'inst-eu-ai-act' && selectedPair.bId === 'inst-br-kr-laws'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              EU AI Act × BR/KR Laws
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedPair({ aId: 'inst-unesco-eia', bId: 'inst-nist-ai-rmf' })
              }
              className={`px-2.5 py-1.5 rounded border font-medium transition-colors cursor-pointer ${
                selectedPair.aId === 'inst-unesco-eia' && selectedPair.bId === 'inst-nist-ai-rmf'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              UNESCO × NIST RMF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left Panel: Instrument Obligation Profile Bars */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
            <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Instrument Obligation Footprint
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any instrument to focus it in the topology below
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">E · D · F</span>
            </div>

            <div className="mt-3 space-y-2.5 flex-1">
              {breakdown.map(({ instrument, counts, useCasesCovered }) => {
                const isSelected =
                  selection.type === 'instrument' && selection.id === instrument.id;
                const widthScale = Math.max(10, Math.round((counts.total / maxTotal) * 100));
                const eqW = counts.total > 0 ? (counts.equivalent / counts.total) * 100 : 0;
                const dlW = counts.total > 0 ? (counts.delta / counts.total) * 100 : 0;
                const frW = counts.total > 0 ? (counts.friction / counts.total) * 100 : 0;

                return (
                  <button
                    key={instrument.id}
                    type="button"
                    onClick={() => handleSelectInstrumentFromOverview(instrument.id)}
                    className={`w-full text-left p-2.5 rounded-md border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-900'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0 flex items-baseline gap-2">
                        <span className="text-xs font-semibold truncate">
                          {instrument.shortName}
                        </span>
                        <span
                          className={`text-[10.5px] font-mono hidden sm:inline ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {instrument.legalNature.split(' ')[0]} · {useCasesCovered} UC
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-mono tabular-nums shrink-0 ${
                          isSelected ? 'text-slate-200' : 'text-slate-700'
                        }`}
                      >
                        <span className="font-semibold">{counts.total}</span>{' '}
                        <span className={isSelected ? 'text-emerald-300' : 'text-emerald-700'}>
                          ({counts.equivalent}E
                        </span>
                        {' · '}
                        <span className={isSelected ? 'text-amber-300' : 'text-amber-700'}>
                          {counts.delta}D
                        </span>
                        {' · '}
                        <span className={isSelected ? 'text-rose-300' : 'text-rose-700'}>
                          {counts.friction}F)
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full bg-slate-200/70 rounded-xs overflow-hidden">
                      <div
                        style={{ width: `${widthScale}%` }}
                        className="h-full flex rounded-xs overflow-hidden"
                      >
                        {counts.equivalent > 0 && (
                          <div style={{ width: `${eqW}%` }} className="bg-emerald-600 h-full" />
                        )}
                        {counts.delta > 0 && (
                          <div style={{ width: `${dlW}%` }} className="bg-amber-500 h-full" />
                        )}
                        {counts.friction > 0 && (
                          <div style={{ width: `${frW}%` }} className="bg-rose-600 h-full" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: N x N Cross-Regime Pairwise Interoperability Heatmap */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Cross-Regime Pairwise Interoperability Matrix ({matrix.instruments.length}&times;
                  {matrix.instruments.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cell % shows mutual <span className="text-emerald-800 font-medium">Equivalent Core</span> rate across co-mapped use-case controls; rose dot marks statutory friction
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200 border border-emerald-400 inline-block" />
                  High Convergence
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                  Friction Flag
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table
                className="w-full border-collapse text-center min-w-[540px]"
                aria-label="Pairwise interoperability convergence matrix across tracked governance instruments"
              >
                <thead>
                  <tr>
                    <th className="p-1.5 text-left text-[10.5px] font-mono text-slate-400 w-24">
                      Regime
                    </th>
                    {matrix.instruments.map((inst) => (
                      <th
                        key={`col-${inst.id}`}
                        scope="col"
                        title={inst.title}
                        className="p-1 text-[10.5px] font-semibold text-slate-700 leading-tight"
                      >
                        {shortCode(inst.id, inst.shortName)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.instruments.map((instA) => (
                    <tr key={`row-${instA.id}`}>
                      <th
                        scope="row"
                        title={instA.title}
                        className="py-1 pr-2 text-left text-[11px] font-semibold text-slate-800 whitespace-nowrap"
                      >
                        {shortCode(instA.id, instA.shortName)}
                      </th>
                      {matrix.instruments.map((instB) => {
                        const cell = matrix.cellsByPair[instA.id][instB.id];
                        const isPairSelected =
                          !cell.isDiagonal &&
                          ((selectedPair.aId === instA.id && selectedPair.bId === instB.id) ||
                            (selectedPair.aId === instB.id && selectedPair.bId === instA.id));

                        if (cell.isDiagonal) {
                          return (
                            <td key={`${instA.id}-${instB.id}`} className="p-0.5">
                              <div
                                title={`${instA.shortName}: ${cell.totalA} verified clause mappings`}
                                className="h-11 rounded bg-slate-900 text-white flex flex-col items-center justify-center font-mono tabular-nums"
                              >
                                <span className="text-[11px] font-semibold">{cell.totalA}</span>
                                <span className="text-[9px] text-slate-300">clauses</span>
                              </div>
                            </td>
                          );
                        }

                        let cellBg = 'bg-slate-50 text-slate-400 border-slate-200/70 hover:border-slate-400';
                        if (cell.sharedContextsCount > 0) {
                          const rate = cell.convergenceRate ?? 0;
                          if (cell.frictionSharedCount > 0 && rate < 50) {
                            cellBg =
                              'bg-rose-50 text-rose-950 border-rose-200 hover:border-rose-400';
                          } else if (rate >= 75) {
                            cellBg =
                              'bg-emerald-100/90 text-emerald-950 border-emerald-300 hover:border-emerald-500';
                          } else if (rate >= 40) {
                            cellBg =
                              'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-400';
                          } else {
                            cellBg =
                              'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-400';
                          }
                        }

                        return (
                          <td key={`${instA.id}-${instB.id}`} className="p-0.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPair({ aId: instA.id, bId: instB.id })}
                              title={
                                cell.sharedContextsCount > 0
                                  ? `${shortCode(instA.id, instA.shortName)} × ${shortCode(instB.id, instB.shortName)}: ${cell.convergenceRate}% mutual equivalent (${cell.equivalentSharedCount}/${cell.sharedContextsCount} co-mapped contexts, ${cell.frictionSharedCount} friction)`
                                  : `${shortCode(instA.id, instA.shortName)} × ${shortCode(instB.id, instB.shortName)}: ${cell.sharedControlIds.length} shared control domains across different use cases`
                              }
                              className={`relative w-full h-11 rounded border flex flex-col items-center justify-center font-mono tabular-nums transition-all cursor-pointer ${cellBg} ${
                                isPairSelected ? 'ring-2 ring-slate-950 ring-offset-1 z-10' : ''
                              }`}
                            >
                              {cell.frictionSharedCount > 0 && (
                                <span
                                  aria-label="Contains statutory friction"
                                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-600"
                                />
                              )}
                              {cell.sharedContextsCount > 0 ? (
                                <>
                                  <span className="text-[11px] font-semibold leading-none">
                                    {cell.convergenceRate}%
                                  </span>
                                  <span className="text-[9px] opacity-75 mt-0.5 leading-none">
                                    {cell.equivalentSharedCount}/{cell.sharedContextsCount}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10.5px] leading-none">
                                    {cell.sharedControlIds.length}d
                                  </span>
                                  <span className="text-[8.5px] opacity-70 mt-0.5 leading-none">
                                    domains
                                  </span>
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inline Pairwise Regime Comparison Strip */}
            {activeCell && selectedInstA && selectedInstB && (
              <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-950">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>
                      {selectedInstA.shortName} &harr; {selectedInstB.shortName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums">
                    {activeCell.sharedContextsCount > 0 ? (
                      <>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                          {activeCell.equivalentSharedCount} Equivalent Co-Controls
                        </span>
                        {activeCell.deltaSharedCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                            {activeCell.deltaSharedCount} Delta Contexts
                          </span>
                        )}
                        {activeCell.frictionSharedCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200">
                            {activeCell.frictionSharedCount} Friction Clashes
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {activeCell.sharedControlIds.length} Shared Control Domains (Across Separate Use Cases)
                      </span>
                    )}
                  </div>
                </div>

                {activeCell.contexts.length > 0 ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {activeCell.contexts.map((ctx) => {
                      const mapA = ctx.mappingsA[0];
                      const mapB = ctx.mappingsB[0];
                      const badgeTone =
                        ctx.status === 'friction'
                          ? 'border-rose-200 bg-rose-50/60'
                          : ctx.status === 'equivalent'
                            ? 'border-emerald-200 bg-emerald-50/45'
                            : 'border-amber-200 bg-amber-50/45';

                      return (
                        <div
                          key={`${ctx.useCaseId}-${ctx.controlId}`}
                          className={`p-2.5 rounded border text-xs ${badgeTone}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-900 leading-snug line-clamp-1">
                              {ctx.controlTitle}
                            </p>
                            {ctx.status === 'friction' ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-700 shrink-0" aria-hidden="true" />
                            ) : ctx.status === 'equivalent' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                            ) : (
                              <Layers className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 truncate mt-0.5">
                            {ctx.useCaseTitle}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {mapA && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapA)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-slate-400 text-[10.5px] font-mono text-slate-800 cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[155px]">{mapA.clauseCitation}</span>
                              </button>
                            )}
                            {mapB && (
                              <button
                                type="button"
                                onClick={() => onInspectClause(mapB)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-slate-400 text-[10.5px] font-mono text-slate-800 cursor-pointer"
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[155px]">{mapB.clauseCitation}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    No identical use-case &times; control tuple is co-mapped yet between{' '}
                    <span className="font-semibold text-slate-900">{selectedInstA.shortName}</span>{' '}
                    and{' '}
                    <span className="font-semibold text-slate-900">{selectedInstB.shortName}</span>.
                    {activeCell.sharedControlIds.length > 0 && (
                      <span>
                        {' '}
                        Both instruments address:{' '}
                        <span className="font-medium text-slate-800">
                          {activeCell.sharedControlIds
                            .map((cid) => ctrlMap.get(cid)?.title ?? cid)
                            .join(', ')}
                        </span>
                        .
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
