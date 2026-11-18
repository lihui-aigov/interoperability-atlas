import { RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AlignmentType, AtlasDataset } from '../types/atlas';
import type { FocusSelection } from '../utils/atlasAnalytics';
import { computeFlowLayout, type FlowLinkPath, type FlowNodeBox } from '../utils/atlasLayout';

interface InteroperabilityFlowProps {
  dataset: AtlasDataset;
  selection: FocusSelection;
  onSelect: (selection: FocusSelection) => void;
  alignmentFilter: AlignmentType | 'all';
  onChangeAlignmentFilter: (filter: AlignmentType | 'all') => void;
}

const STROKE_STYLE: Record<
  AlignmentType,
  { activeColor: string; inactiveColor: string; dashArray?: string; label: string }
> = {
  equivalent: {
    activeColor: '#059669',
    inactiveColor: '#CBD5E1',
    label: 'Equivalent Core',
  },
  delta: {
    activeColor: '#D97706',
    inactiveColor: '#CBD5E1',
    dashArray: '7 4',
    label: 'Jurisdictional Delta',
  },
  friction: {
    activeColor: '#E11D48',
    inactiveColor: '#CBD5E1',
    dashArray: '3 3',
    label: 'Interoperability Friction',
  },
};

export function InteroperabilityFlow({
  dataset,
  selection,
  onSelect,
  alignmentFilter,
  onChangeAlignmentFilter,
}: InteroperabilityFlowProps) {
  const [hoveredLink, setHoveredLink] = useState<FlowLinkPath | null>(null);
  const [mobileColumn, setMobileColumn] = useState<'useCase' | 'control' | 'instrument'>('useCase');

  const layout = useMemo(
    () => computeFlowLayout(dataset, selection, alignmentFilter),
    [dataset, selection, alignmentFilter]
  );

  const defaultUseCaseId = dataset.useCases[0]?.id ?? 'uc-welfare-triage';
  const isNonDefaultSelection =
    selection.type !== 'useCase' || alignmentFilter !== 'all';

  const handleNodeClick = (node: FlowNodeBox) => {
    onSelect({ type: node.column, id: node.id });
  };

  return (
    <section
      id="interoperability-flow"
      aria-labelledby="flow-section-heading"
      className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-10 pb-8"
    >
      {/* Section Header & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500">
            01. Interactive Bipartite Governance Topology
          </p>
          <h2
            id="flow-section-heading"
            className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1"
          >
            Use-Case to Control to Global Instrument Flow
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Select any concrete use case, operational control, or global governance instrument to
            isolate shared compliance pathways, normative deltas, and legal friction points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Alignment Filter Segmented Control */}
          <div
            role="group"
            aria-label="Filter interoperability pathways by alignment type"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-md"
          >
            {(
              [
                { value: 'all', label: 'All Pathways' },
                { value: 'equivalent', label: 'Equivalent Core' },
                { value: 'delta', label: 'Deltas' },
                { value: 'friction', label: 'Friction' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeAlignmentFilter(opt.value)}
                aria-pressed={alignmentFilter === opt.value}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  alignmentFilter === opt.value
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isNonDefaultSelection && (
            <button
              type="button"
              onClick={() => {
                onSelect({ type: 'useCase', id: defaultUseCaseId });
                onChangeAlignmentFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Reset View</span>
            </button>
          )}
        </div>
      </div>

      {/* Accessible Legend & Hovered Pathway Readout */}
      <div className="py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="inline-flex items-center gap-2 text-slate-700">
            <svg width="28" height="8" aria-hidden="true" className="shrink-0">
              <line x1="0" y1="4" x2="28" y2="4" stroke="#059669" strokeWidth="3" />
            </svg>
            <span className="font-medium text-emerald-800">Equivalent Core</span>
            <span className="text-slate-500 hidden sm:inline">(Comply Once)</span>
          </div>

          <div className="inline-flex items-center gap-2 text-slate-700">
            <svg width="28" height="8" aria-hidden="true" className="shrink-0">
              <line
                x1="0"
                y1="4"
                x2="28"
                y2="4"
                stroke="#D97706"
                strokeWidth="3"
                strokeDasharray="6 3"
              />
            </svg>
            <span className="font-medium text-amber-800">Jurisdictional Delta</span>
            <span className="text-slate-500 hidden sm:inline">(Extra Duty)</span>
          </div>

          <div className="inline-flex items-center gap-2 text-slate-700">
            <svg width="28" height="8" aria-hidden="true" className="shrink-0">
              <line
                x1="0"
                y1="4"
                x2="28"
                y2="4"
                stroke="#E11D48"
                strokeWidth="3"
                strokeDasharray="2.5 2.5"
              />
            </svg>
            <span className="font-medium text-rose-800">Interoperability Friction</span>
            <span className="text-slate-500 hidden sm:inline">(Clash / Ban)</span>
          </div>
        </div>

        <div className="font-mono text-xs text-slate-600 min-h-[1.25rem]">
          {hoveredLink ? (
            <span>
              {STROKE_STYLE[hoveredLink.alignmentType].label} ·{' '}
              <span className="text-slate-900 font-medium">
                {hoveredLink.citations.slice(0, 2).join(' · ')}
              </span>
              {hoveredLink.citations.length > 2
                ? ` (+${hoveredLink.citations.length - 2} more)`
                : ''}
            </span>
          ) : (
            <span className="text-slate-500">
              Hover any ribbon to preview cited clauses · Click any node to pivot
            </span>
          )}
        </div>
      </div>

      {/* Desktop 3-Column Synchronized SVG + Native Button Topology (lg and up) */}
      <div
        data-testid="interoperability-flow-canvas"
        className="hidden lg:block mt-6 bg-white border border-slate-200 rounded-lg p-4 overflow-hidden"
      >
        <div
          className="relative w-full select-none"
          style={{
            aspectRatio: `${layout.viewBoxWidth} / ${layout.viewBoxHeight}`,
          }}
        >
          {/* SVG Ribbon Layer */}
          <svg
            viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            {/* Subtle Architectural Vertical Guide Rails */}
            {layout.columnHeaders.map((col) => (
              <line
                key={`guide-${col.column}`}
                x1={col.x}
                y1={36}
                x2={col.x + col.width}
                y2={36}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
            ))}

            {/* Curved Bipartite Flow Ribbons */}
            {layout.links.map((link) => {
              const styleMeta = STROKE_STYLE[link.alignmentType];
              const stroke = link.isActive ? styleMeta.activeColor : styleMeta.inactiveColor;
              const opacity = link.isActive ? 0.82 : 0.22;

              return (
                <path
                  key={link.id}
                  d={link.d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={
                    hoveredLink?.id === link.id ? link.strokeWidth + 1.8 : link.strokeWidth
                  }
                  strokeDasharray={styleMeta.dashArray}
                  strokeLinecap="round"
                  opacity={hoveredLink?.id === link.id ? 1 : opacity}
                  className="transition-opacity duration-150 cursor-pointer pointer-events-auto"
                  onMouseEnter={() => setHoveredLink(link)}
                  onMouseLeave={() => setHoveredLink(null)}
                />
              );
            })}
          </svg>

          {/* Column Headers */}
          {layout.columnHeaders.map((col) => (
            <div
              key={col.column}
              style={{
                left: `${(col.x / layout.viewBoxWidth) * 100}%`,
                top: '0.4%',
                width: `${(col.width / layout.viewBoxWidth) * 100}%`,
              }}
              className="absolute flex items-baseline justify-between pr-1"
            >
              <span className="text-xs font-semibold text-slate-900 tracking-tight">
                <span className="font-mono text-slate-400 mr-1.5">{col.indexLabel}.</span>
                {col.title}
              </span>
            </div>
          ))}

          {/* Interactive Native Button Nodes */}
          {layout.nodes.map((node) => {
            const leftPct = (node.x / layout.viewBoxWidth) * 100;
            const topPct = (node.y / layout.viewBoxHeight) * 100;
            const widthPct = (node.width / layout.viewBoxWidth) * 100;
            const heightPct = (node.height / layout.viewBoxHeight) * 100;

            let surfaceClasses =
              'bg-white border-slate-200 text-slate-500 opacity-55 hover:opacity-95 hover:border-slate-300';
            if (node.isSelected) {
              surfaceClasses =
                'bg-slate-900 border-slate-900 text-white opacity-100 ring-2 ring-slate-900/20';
            } else if (node.isActive) {
              surfaceClasses =
                'bg-white border-slate-400 text-slate-900 opacity-100 hover:border-slate-700';
            }

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => handleNodeClick(node)}
                aria-pressed={node.isSelected}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                className={`absolute text-left px-3 py-2 rounded-md border transition-opacity duration-150 flex flex-col justify-between overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${surfaceClasses}`}
              >
                <div className="min-w-0 w-full">
                  <div className="flex items-center justify-between gap-2 text-[10px] leading-tight font-mono tabular-nums">
                    <span
                      className={`truncate ${
                        node.isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {node.kicker}
                    </span>
                    <span
                      className={`shrink-0 ${
                        node.isSelected ? 'text-slate-200' : 'text-slate-600'
                      }`}
                    >
                      {node.equivalentCount > 0 && (
                        <span className={node.isSelected ? 'text-emerald-300' : 'text-emerald-700'}>
                          {node.equivalentCount}E
                        </span>
                      )}
                      {node.deltaCount > 0 && (
                        <span
                          className={`ml-1 ${
                            node.isSelected ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          {node.deltaCount}D
                        </span>
                      )}
                      {node.frictionCount > 0 && (
                        <span
                          className={`ml-1 ${
                            node.isSelected ? 'text-rose-300' : 'text-rose-700'
                          }`}
                        >
                          {node.frictionCount}F
                        </span>
                      )}
                    </span>
                  </div>

                  <p
                    className={`text-[12px] font-semibold leading-[1.25] line-clamp-2 mt-0.5 ${
                      node.isSelected ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {node.title}
                  </p>
                </div>

                <p
                  className={`text-[10.5px] leading-tight truncate w-full ${
                    node.isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {node.secondaryLabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Mobile / Tablet 3-Column Navigator (below lg) */}
      <div className="lg:hidden mt-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div
          role="tablist"
          aria-label="Governance topology columns"
          className="grid grid-cols-3 border-b border-slate-200 bg-slate-50"
        >
          {(
            [
              { key: 'useCase', label: '01. Use Cases' },
              { key: 'control', label: '02. Controls' },
              { key: 'instrument', label: '03. Instruments' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={mobileColumn === tab.key}
              onClick={() => setMobileColumn(tab.key)}
              className={`py-3 px-2 text-xs font-medium transition-colors whitespace-nowrap truncate cursor-pointer ${
                mobileColumn === tab.key
                  ? 'bg-white text-slate-950 border-b-2 border-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-200">
          {layout.nodes
            .filter((n) => n.column === mobileColumn)
            .map((node) => (
              <button
                key={`mob-${node.id}`}
                type="button"
                onClick={() => handleNodeClick(node)}
                aria-pressed={node.isSelected}
                className={`w-full text-left px-4 py-3.5 transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                  node.isSelected
                    ? 'bg-slate-900 text-white'
                    : node.isActive
                      ? 'bg-white text-slate-900 hover:bg-slate-50'
                      : 'bg-slate-50/60 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-xs font-mono ${
                      node.isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {node.kicker}
                  </p>
                  <p className="text-sm font-semibold mt-0.5">{node.title}</p>
                  <p
                    className={`text-xs mt-0.5 truncate ${
                      node.isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {node.secondaryLabel}
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums shrink-0 text-right">
                  <span className={node.isSelected ? 'text-emerald-300' : 'text-emerald-700'}>
                    {node.equivalentCount}E
                  </span>{' '}
                  ·{' '}
                  <span className={node.isSelected ? 'text-amber-300' : 'text-amber-700'}>
                    {node.deltaCount}D
                  </span>{' '}
                  ·{' '}
                  <span className={node.isSelected ? 'text-rose-300' : 'text-rose-700'}>
                    {node.frictionCount}F
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
