import { Minimize2, Maximize2, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AlignmentType, AtlasDataset, InteropMapping } from '../types/atlas';
import type { FocusSelection } from '../utils/atlasAnalytics';
import {
  computeFlowLayout,
  deriveSectorFilterOptions,
  type FlowLinkPath,
  type FlowNodeBox,
  type SectorBucketId,
} from '../utils/atlasLayout';

interface InteroperabilityFlowProps {
  dataset: AtlasDataset;
  selection: FocusSelection;
  onSelect: (selection: FocusSelection) => void;
  alignmentFilter: AlignmentType | 'all';
  onChangeAlignmentFilter: (filter: AlignmentType | 'all') => void;
  onInspectClause: (mapping: InteropMapping) => void;
}

const STROKE_STYLE: Record<
  AlignmentType,
  {
    activeColor: string;
    gradientUrl: string;
    inactiveColor: string;
    dashArray?: string;
    label: string;
  }
> = {
  equivalent: {
    activeColor: '#1B6B4E',
    gradientUrl: 'url(#ribbon-grad-equivalent)',
    inactiveColor: '#D6D9E0',
    label: 'Comply Once',
  },
  delta: {
    activeColor: '#7A5C1F',
    gradientUrl: 'url(#ribbon-grad-delta)',
    inactiveColor: '#D6D9E0',
    dashArray: '7 4',
    label: 'Extra Local Step',
  },
  friction: {
    activeColor: '#993333',
    gradientUrl: 'url(#ribbon-grad-friction)',
    inactiveColor: '#D6D9E0',
    dashArray: '3 3',
    label: 'Direct Rule Clash',
  },
};

export function InteroperabilityFlow({
  dataset,
  selection,
  onSelect,
  alignmentFilter,
  onChangeAlignmentFilter,
  onInspectClause,
}: InteroperabilityFlowProps) {
  const [hoveredLink, setHoveredLink] = useState<FlowLinkPath | null>(null);
  const [sectorFilter, setSectorFilter] = useState<SectorBucketId>('all');
  const [compactFocus, setCompactFocus] = useState<boolean>(false);
  const [mobileColumn, setMobileColumn] = useState<'useCase' | 'control' | 'instrument'>('useCase');

  const sectorOptions = useMemo(
    () => deriveSectorFilterOptions(dataset.useCases),
    [dataset.useCases]
  );

  const layout = useMemo(
    () =>
      computeFlowLayout(dataset, selection, alignmentFilter, {
        sectorFilter,
        compactFocus,
      }),
    [dataset, selection, alignmentFilter, sectorFilter, compactFocus]
  );

  const defaultUseCaseId = dataset.useCases[0]?.id ?? 'uc-welfare-triage';
  const isNonDefaultSelection =
    selection.type !== 'useCase' ||
    alignmentFilter !== 'all' ||
    sectorFilter !== 'all' ||
    compactFocus;

  const handleNodeClick = (node: FlowNodeBox) => {
    onSelect({ type: node.column, id: node.id });
  };

  return (
    <section
      id="interoperability-flow"
      aria-labelledby="flow-section-heading"
      className="scroll-mt-16 max-w-[1400px] mx-auto px-4 sm:px-8 pt-10 pb-8"
    >
      {/* Section Header & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-5 border-b border-[var(--atlas-rule)]">
        <div>
          <h2
            id="flow-section-heading"
            className="font-editorial text-[22px] sm:text-[26px] font-semibold text-[var(--atlas-ink)]"
          >
            Use-Case to Control to Global Instrument Flow
          </h2>
          <p className="text-sm text-[var(--atlas-ink-secondary)] mt-1 max-w-[68ch]">
            Select any node to pivot pathways, filter by sector or alignment type, or click any
            active ribbon to read its underlying statutory clause.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Interactive Alignment Filter Segmented Control */}
          <div
            role="group"
            aria-label="Filter interoperability pathways by alignment type"
            className="flex flex-wrap items-center gap-1 p-1 bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px]"
          >
            {(
              [
                { value: 'all', label: 'All Pathways' },
                { value: 'equivalent', label: 'Comply Once' },
                { value: 'delta', label: 'Extra Steps' },
                { value: 'friction', label: 'Rule Clashes' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeAlignmentFilter(opt.value)}
                aria-pressed={alignmentFilter === opt.value}
                className={`px-3 py-1 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  alignmentFilter === opt.value
                    ? 'bg-white text-[var(--atlas-ink)] border border-[var(--atlas-rule)]'
                    : 'text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-ink)] border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCompactFocus((prev) => !prev)}
            aria-pressed={compactFocus}
            title="Hide unlinked nodes to focus tightly on the selected subgraph"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[2px] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              compactFocus
                ? 'bg-[var(--atlas-accent)] text-white border-[var(--atlas-accent)]'
                : 'bg-white text-[var(--atlas-ink)] border-[var(--atlas-border-control)] hover:bg-[var(--atlas-surface)]'
            }`}
          >
            {compactFocus ? (
              <Maximize2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{compactFocus ? 'Show All Nodes' : 'Focus Subgraph'}</span>
          </button>

          {isNonDefaultSelection && (
            <button
              type="button"
              onClick={() => {
                onSelect({ type: 'useCase', id: defaultUseCaseId });
                onChangeAlignmentFilter('all');
                setSectorFilter('all');
                setCompactFocus(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Reset View</span>
            </button>
          )}
        </div>
      </div>

      {/* Sector Filter Bar */}
      <div className="py-3 border-b border-[var(--atlas-rule)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter use cases by sector">
          <span className="text-[var(--atlas-ink-muted)] mr-1 font-medium">Sector Scope:</span>
          {sectorOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSectorFilter(opt.id)}
              aria-pressed={sectorFilter === opt.id}
              className={`px-2.5 py-1 rounded-[2px] border font-medium transition-colors whitespace-nowrap cursor-pointer ${
                sectorFilter === opt.id
                  ? 'bg-[var(--atlas-accent)] text-white border-[var(--atlas-accent)]'
                  : 'bg-white text-[var(--atlas-ink-secondary)] border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)]'
              }`}
            >
              {opt.label}{' '}
              <span
                className={`font-mono text-[10.5px] ml-0.5 tabular-nums ${
                  sectorFilter === opt.id ? 'text-white/80' : 'text-[var(--atlas-ink-muted)]'
                }`}
              >
                ({opt.count})
              </span>
            </button>
          ))}
        </div>

        <div className="font-mono text-xs text-[var(--atlas-ink-secondary)] min-h-[1.25rem]">
          {hoveredLink ? (
            <span>
              {STROKE_STYLE[hoveredLink.alignmentType].label},{' '}
              <span className="text-[var(--atlas-ink)] font-medium">
                {hoveredLink.citations.slice(0, 2).join(', ')}
              </span>
              {hoveredLink.citations.length > 2
                ? ` (+${hoveredLink.citations.length - 2} more)`
                : ''}{' '}
              <span className="text-[var(--atlas-accent)]">(Click ribbon to read clause)</span>
            </span>
          ) : (
            <span className="text-[var(--atlas-ink-muted)]">
              Hover or click any ribbon to inspect cited clauses, click any card to pivot
            </span>
          )}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <div className="inline-flex items-center gap-2 text-[var(--atlas-ink-secondary)]">
          <svg width="28" height="8" aria-hidden="true" className="shrink-0">
            <line x1="0" y1="4" x2="28" y2="4" stroke="#1B6B4E" strokeWidth="3" />
          </svg>
          <span className="font-medium text-[var(--align-equivalent-ink)]">Comply Once</span>
        </div>

        <div className="inline-flex items-center gap-2 text-[var(--atlas-ink-secondary)]">
          <svg width="28" height="8" aria-hidden="true" className="shrink-0">
            <line
              x1="0"
              y1="4"
              x2="28"
              y2="4"
              stroke="#7A5C1F"
              strokeWidth="3"
              strokeDasharray="6 3"
            />
          </svg>
          <span className="font-medium text-[var(--align-delta-ink)]">Extra Local Step</span>
        </div>

        <div className="inline-flex items-center gap-2 text-[var(--atlas-ink-secondary)]">
          <svg width="28" height="8" aria-hidden="true" className="shrink-0">
            <line
              x1="0"
              y1="4"
              x2="28"
              y2="4"
              stroke="#993333"
              strokeWidth="3"
              strokeDasharray="2.5 2.5"
            />
          </svg>
          <span className="font-medium text-[var(--align-friction-ink)]">Direct Rule Clash</span>
        </div>
      </div>

      {/* Desktop 3-Column Synchronized SVG + Native Button Topology (lg and up) */}
      <div
        data-testid="interoperability-flow-canvas"
        className="hidden lg:block mt-4 bg-white border border-[var(--atlas-rule)] rounded-[2px] p-4 overflow-hidden"
      >
        <div
          className="relative w-full select-none"
          style={{
            aspectRatio: `${layout.viewBoxWidth} / ${layout.viewBoxHeight}`,
          }}
        >
          {/* SVG Multi-Port Ribbon Layer */}
          <svg
            viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="ribbon-grad-equivalent" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1B6B4E" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#268764" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="ribbon-grad-delta" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7A5C1F" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#9C772C" stopOpacity="0.84" />
              </linearGradient>
              <linearGradient id="ribbon-grad-friction" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#993333" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#B84444" stopOpacity="0.86" />
              </linearGradient>
            </defs>

            {/* Architectural Column Guide Rails */}
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

            {/* Curved Bipartite Multi-Port Flow Ribbons */}
            {layout.links.map((link) => {
              const styleMeta = STROKE_STYLE[link.alignmentType];
              const isHovered = hoveredLink?.id === link.id;
              const stroke = link.isActive ? styleMeta.gradientUrl : styleMeta.inactiveColor;
              const opacity = isHovered ? 1 : link.isActive ? 0.85 : 0.2;

              return (
                <g key={link.id}>
                  {(link.isActive || isHovered) && (
                    <path
                      d={link.d}
                      fill="none"
                      stroke={styleMeta.activeColor}
                      strokeWidth={link.strokeWidth + (isHovered ? 6 : 3)}
                      opacity={isHovered ? 0.2 : 0.08}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  )}
                  <path
                    d={link.d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isHovered ? link.strokeWidth + 2 : link.strokeWidth}
                    strokeDasharray={styleMeta.dashArray}
                    strokeLinecap="round"
                    opacity={opacity}
                    className="transition-opacity duration-150 cursor-pointer pointer-events-auto"
                    onMouseEnter={() => setHoveredLink(link)}
                    onMouseLeave={() => setHoveredLink(null)}
                    onClick={() => onInspectClause(link.primaryMapping)}
                  />
                </g>
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
              <span className="text-xs font-semibold text-[var(--atlas-ink)] tracking-tight">
                {col.title}
              </span>
            </div>
          ))}

          {/* Interactive Data-Rich Node Cards */}
          {layout.nodes.map((node) => {
            const leftPct = (node.x / layout.viewBoxWidth) * 100;
            const topPct = (node.y / layout.viewBoxHeight) * 100;
            const widthPct = (node.width / layout.viewBoxWidth) * 100;
            const heightPct = (node.height / layout.viewBoxHeight) * 100;
            const totalNodeMappings =
              node.equivalentCount + node.deltaCount + node.frictionCount;

            let surfaceClasses =
              'bg-white border-[var(--atlas-rule)] text-[var(--atlas-ink-muted)] opacity-60 hover:opacity-95 hover:border-[var(--atlas-border-control)]';
            if (node.isSelected) {
              surfaceClasses =
                'bg-[#1A1D23] border-[#1A1D23] text-white opacity-100 ring-2 ring-[#2554A3]/30';
            } else if (node.isActive) {
              surfaceClasses =
                'bg-white border-[var(--atlas-border-control)] border-l-[3px] border-l-[var(--align-equivalent-ink)] text-[var(--atlas-ink)] opacity-100 hover:border-[var(--atlas-accent)]';
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
                className={`absolute text-left px-3 pt-2 pb-2.5 rounded-[2px] border transition-all duration-150 flex flex-col justify-between overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--atlas-accent)] ${surfaceClasses}`}
              >
                <div className="min-w-0 w-full">
                  <div className="flex items-center justify-between gap-2 text-[10px] leading-tight font-mono tabular-nums">
                    <span
                      className={`truncate ${
                        node.isSelected ? 'text-[#C5CAD4]' : 'text-[var(--atlas-ink-muted)]'
                      }`}
                    >
                      {node.kicker}
                    </span>
                    <span
                      className={`shrink-0 ${
                        node.isSelected ? 'text-[#E8EAEF]' : 'text-[var(--atlas-ink-secondary)]'
                      }`}
                    >
                      {node.equivalentCount > 0 && (
                        <span className={node.isSelected ? 'text-[#8FD1B6]' : 'text-[var(--align-equivalent-ink)]'}>
                          {node.equivalentCount}E
                        </span>
                      )}
                      {node.deltaCount > 0 && (
                        <span
                          className={`ml-1 ${
                            node.isSelected ? 'text-[#E6CA85]' : 'text-[var(--align-delta-ink)]'
                          }`}
                        >
                          {node.deltaCount}D
                        </span>
                      )}
                      {node.frictionCount > 0 && (
                        <span
                          className={`ml-1 ${
                            node.isSelected ? 'text-[#F09A9A]' : 'text-[var(--align-friction-ink)]'
                          }`}
                        >
                          {node.frictionCount}F
                        </span>
                      )}
                    </span>
                  </div>

                  <p
                    className={`text-[12px] font-semibold leading-[1.24] line-clamp-2 mt-0.5 ${
                      node.isSelected ? 'text-white' : 'text-[var(--atlas-ink)]'
                    }`}
                  >
                    {node.title}
                  </p>
                </div>

                <div className="w-full space-y-1">
                  <p
                    className={`text-[10.5px] leading-tight truncate w-full ${
                      node.isSelected ? 'text-[#C5CAD4]' : 'text-[var(--atlas-ink-muted)]'
                    }`}
                  >
                    {node.secondaryLabel}
                  </p>

                  {/* Proportional 3-color micro-bar along bottom inside edge */}
                  {totalNodeMappings > 0 && (
                    <div
                      className={`h-1 w-full rounded-[1px] overflow-hidden flex ${
                        node.isSelected ? 'bg-[#2C313B]' : 'bg-[var(--atlas-elevated)]'
                      }`}
                      aria-hidden="true"
                    >
                      {node.equivalentCount > 0 && (
                        <div
                          style={{ width: `${(node.equivalentCount / totalNodeMappings) * 100}%` }}
                          className="bg-[var(--align-equivalent-ink)] h-full"
                        />
                      )}
                      {node.deltaCount > 0 && (
                        <div
                          style={{ width: `${(node.deltaCount / totalNodeMappings) * 100}%` }}
                          className="bg-[var(--align-delta-ink)] h-full"
                        />
                      )}
                      {node.frictionCount > 0 && (
                        <div
                          style={{ width: `${(node.frictionCount / totalNodeMappings) * 100}%` }}
                          className="bg-[var(--align-friction-ink)] h-full"
                        />
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Mobile / Tablet 3-Column Navigator (below lg) */}
      <div className="lg:hidden mt-5 bg-white border border-[var(--atlas-rule)] rounded-[2px] overflow-hidden">
        <div
          role="tablist"
          aria-label="Governance topology columns"
          className="grid grid-cols-3 border-b border-[var(--atlas-rule)] bg-[var(--atlas-surface)]"
        >
          {(
            [
              { key: 'useCase', label: 'Use Cases' },
              { key: 'control', label: 'Controls' },
              { key: 'instrument', label: 'Instruments' },
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
                      ? 'bg-white text-slate-900 hover:bg-slate-50 border-l-3 border-l-emerald-600'
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
