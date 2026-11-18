/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  FlaskConical,
  Newspaper,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import rawAtlasData from './data/atlas.json';
import { AtlasHeader, type WorkspaceTabId } from './components/AtlasHeader';
import { CitationModal } from './components/CitationModal';
import { ClauseReaderDrawer } from './components/ClauseReaderDrawer';
import { CrawlableFooterDirectory } from './components/CrawlableFooterDirectory';
import { ExportPreviewModal } from './components/ExportPreviewModal';
import { GlobalClauseFinder } from './components/GlobalClauseFinder';
import { InteroperabilityBriefCard } from './components/InteroperabilityBriefCard';
import { InteroperabilityFlow } from './components/InteroperabilityFlow';
import { MatrixExportView } from './components/MatrixExportView';
import { MethodologySchemaSection } from './components/MethodologySchemaSection';
import { NewsSpotlightSection } from './components/NewsSpotlightSection';
import { RecentUpdatesDrawer } from './components/RecentUpdatesDrawer';
import { RegimeConvergenceOverview } from './components/RegimeConvergenceOverview';
import { UseCaseSandbox } from './components/UseCaseSandbox';
import type {
  AlignmentType,
  AtlasDataset,
  InteropMapping,
  SandboxMappingResult,
} from './types/atlas';
import {
  buildInteroperabilityBrief,
  type FocusSelection,
} from './utils/atlasAnalytics';
import { buildPairSlug, parsePairSlug } from './utils/seoSlugs';

const baseDataset = rawAtlasData as AtlasDataset;
const SANDBOX_STORAGE_KEY = 'open_atlas_sandbox_results_v1';

const VALID_TABS: WorkspaceTabId[] = ['spotlights', 'compare', 'use-cases', 'sandbox'];

const WORKSPACE_TABS: {
  id: WorkspaceTabId;
  step: string;
  title: string;
  subtitle: string;
  Icon: typeof Newspaper;
}[] = [
  {
    id: 'spotlights',
    step: '01',
    title: 'In-the-News Briefings',
    subtitle: 'Cite-ready arguments & 5 regional lenses on live AI controversies',
    Icon: Newspaper,
  },
  {
    id: 'compare',
    step: '02',
    title: 'Compare Two Frameworks',
    subtitle: 'Side-by-side gap check: reusable baseline, extra steps & clashes',
    Icon: ArrowLeftRight,
  },
  {
    id: 'use-cases',
    step: '03',
    title: 'Check an AI Use Case',
    subtitle: 'Cross-border obligations & procurement checklist for 11 AI systems',
    Icon: ClipboardCheck,
  },
  {
    id: 'sandbox',
    step: '04',
    title: 'Test Custom Scenario & Data',
    subtitle: 'Map your own AI deployment, review methodology, or download JSON',
    Icon: FlaskConical,
  },
];

function defaultPairForInstrument(instId: string): { aId: string; bId: string } {
  if (instId === 'inst-eu-ai-act') {
    const second =
      baseDataset.instruments.find((i) => i.id === 'inst-nist-ai-rmf')?.id ??
      baseDataset.instruments[1]?.id ??
      'inst-eu-ai-act';
    return { aId: 'inst-eu-ai-act', bId: second };
  }
  const hasEu = baseDataset.instruments.some((i) => i.id === 'inst-eu-ai-act');
  return {
    aId: hasEu ? 'inst-eu-ai-act' : baseDataset.instruments[0]?.id ?? instId,
    bId: instId,
  };
}

function readInitialQueryParams(): {
  initialTab: WorkspaceTabId;
  spotlightId?: string;
  initialPair: { aId: string; bId: string };
  initialSelection: FocusSelection;
  initialMatrixUseCaseId: string;
} {
  const defaultUcId = baseDataset.useCases[0].id;
  const fallbackPair = defaultPairForInstrument('inst-nist-ai-rmf');

  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as WorkspaceTabId | null;
    const hasExplicitTab = Boolean(tabParam && VALID_TABS.includes(tabParam));
    const pairParam = params.get('pair');
    const spotlightParam = params.get('spotlight') ?? undefined;
    const useCaseParam = params.get('useCase');
    const instParamRaw = params.get('instrument');
    const instParam =
      instParamRaw === 'inst-unesco-eia' ? 'inst-unesco-rec' : instParamRaw;

    const parsedPair = pairParam
      ? parsePairSlug(pairParam, baseDataset.instruments)
      : null;

    let initialPair = fallbackPair;
    if (parsedPair) {
      initialPair = parsedPair;
    } else if (instParam && baseDataset.instruments.some((i) => i.id === instParam)) {
      initialPair = defaultPairForInstrument(instParam);
    }

    let resolvedUcId = defaultUcId;
    let initialSelection: FocusSelection = { type: 'useCase', id: defaultUcId };

    if (useCaseParam && baseDataset.useCases.some((u) => u.id === useCaseParam)) {
      resolvedUcId = useCaseParam;
      initialSelection = { type: 'useCase', id: useCaseParam };
    } else if (instParam && baseDataset.instruments.some((i) => i.id === instParam)) {
      initialSelection = { type: 'instrument', id: instParam };
    } else if (spotlightParam) {
      const matchedSpot = baseDataset.spotlights?.find((s) => s.id === spotlightParam);
      if (
        matchedSpot &&
        baseDataset.useCases.some((u) => u.id === matchedSpot.linkedUseCaseId)
      ) {
        resolvedUcId = matchedSpot.linkedUseCaseId;
        initialSelection = { type: 'useCase', id: matchedSpot.linkedUseCaseId };
      }
    }

    let initialTab: WorkspaceTabId = 'spotlights';
    if (hasExplicitTab && tabParam) {
      initialTab = tabParam;
    } else if (parsedPair || instParam) {
      initialTab = 'compare';
    } else if (useCaseParam && baseDataset.useCases.some((u) => u.id === useCaseParam)) {
      initialTab = 'use-cases';
    } else if (spotlightParam) {
      initialTab = 'spotlights';
    }

    return {
      initialTab,
      spotlightId: spotlightParam,
      initialPair,
      initialSelection,
      initialMatrixUseCaseId: resolvedUcId,
    };
  } catch {
    // Ignore malformed query strings cleanly
  }

  return {
    initialTab: 'spotlights',
    initialPair: fallbackPair,
    initialSelection: { type: 'useCase', id: defaultUcId },
    initialMatrixUseCaseId: defaultUcId,
  };
}

function updateQueryParamSafe(key: string, value: string) {
  try {
    if (window.location.protocol === 'file:') return;
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState(null, '', url.toString());
  } catch {
    // Ignore history API restrictions in embedded frames
  }
}

export default function App() {
  const initialQuery = useMemo(() => readInitialQueryParams(), []);
  const [sandboxResults, setSandboxResults] = useState<SandboxMappingResult[]>(() => {
    try {
      const saved = sessionStorage.getItem(SANDBOX_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as SandboxMappingResult[];
      return parsed.map((res) => ({
        ...res,
        mappings: res.mappings.map((m) =>
          m.instrumentId === 'inst-unesco-eia'
            ? { ...m, instrumentId: 'inst-unesco-rec' }
            : m
        ),
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(sandboxResults));
    } catch {
      // Ignore storage quota issues cleanly
    }
  }, [sandboxResults]);

  // Merge base seed dataset with any live sandbox scenarios mapped during the session
  const activeDataset: AtlasDataset = useMemo(() => {
    if (sandboxResults.length === 0) return baseDataset;
    const extraUseCases = sandboxResults.map((r) => r.useCase);
    const extraMappings = sandboxResults.flatMap((r) => r.mappings);
    return {
      ...baseDataset,
      useCases: [...extraUseCases, ...baseDataset.useCases],
      mappings: [...extraMappings, ...baseDataset.mappings],
    };
  }, [sandboxResults]);

  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(initialQuery.initialTab);
  const [selectedPair, setSelectedPair] = useState<{ aId: string; bId: string }>(
    initialQuery.initialPair
  );
  const [selection, setSelection] = useState<FocusSelection>(
    initialQuery.initialSelection
  );
  const [selectedMatrixUseCaseId, setSelectedMatrixUseCaseId] = useState<string>(
    initialQuery.initialMatrixUseCaseId
  );

  const [showVisualTopology, setShowVisualTopology] = useState<boolean>(false);
  const [scenarioBanner, setScenarioBanner] = useState<string | null>(null);
  const [alignmentFilter, setAlignmentFilter] = useState<AlignmentType | 'all'>('all');
  const [isUpdatesDrawerOpen, setIsUpdatesDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [activeClauseMapping, setActiveClauseMapping] = useState<InteropMapping | null>(null);

  const handleSelectTab = (tab: WorkspaceTabId) => {
    setActiveTab(tab);
    updateQueryParamSafe('tab', tab);
  };

  const handleSelectEntity = (next: FocusSelection) => {
    setSelection(next);
    if (next.type === 'useCase') {
      setSelectedMatrixUseCaseId(next.id);
      updateQueryParamSafe('useCase', next.id);
    } else if (next.type === 'instrument') {
      setSelectedPair(defaultPairForInstrument(next.id));
      updateQueryParamSafe('instrument', next.id);
    }
  };

  const handleChangeMatrixUseCase = (useCaseId: string) => {
    setSelectedMatrixUseCaseId(useCaseId);
    setSelection({ type: 'useCase', id: useCaseId });
    setScenarioBanner(null);
    updateQueryParamSafe('useCase', useCaseId);
  };

  const handleOpenClauseFromFinder = (mapping: InteropMapping) => {
    setSelection({ type: 'useCase', id: mapping.useCaseId });
    setSelectedMatrixUseCaseId(mapping.useCaseId);
    setActiveClauseMapping(mapping);
  };

  const handleAddSandboxResult = (result: SandboxMappingResult) => {
    setSandboxResults((prev) => [result, ...prev]);
    setSelection({ type: 'useCase', id: result.useCase.id });
    setSelectedMatrixUseCaseId(result.useCase.id);
    setAlignmentFilter('all');
    setScenarioBanner(
      'Scenario mapped — reviewing your cross-border compliance checklist below.'
    );
    handleSelectTab('use-cases');
    document.getElementById('workspace-tabs')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRemoveSandboxUseCase = (useCaseId: string) => {
    setSandboxResults((prev) => prev.filter((r) => r.useCase.id !== useCaseId));
    if (selection.type === 'useCase' && selection.id === useCaseId) {
      setSelection({ type: 'useCase', id: baseDataset.useCases[0].id });
    }
    if (selectedMatrixUseCaseId === useCaseId) {
      setSelectedMatrixUseCaseId(baseDataset.useCases[0].id);
    }
  };

  const handlePairChange = (aId: string, bId: string) => {
    setSelectedPair({ aId, bId });
    updateQueryParamSafe('pair', buildPairSlug(aId, bId));
    updateQueryParamSafe('tab', 'compare');
  };

  const selectedUseCase = useMemo(() => {
    return (
      activeDataset.useCases.find((u) => u.id === selectedMatrixUseCaseId) ??
      activeDataset.useCases[0]
    );
  }, [activeDataset.useCases, selectedMatrixUseCaseId]);

  const brief = useMemo(
    () => buildInteroperabilityBrief(activeDataset, selection, alignmentFilter),
    [activeDataset, selection, alignmentFilter]
  );

  const mappingCountByUseCase = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of activeDataset.mappings) {
      counts.set(m.useCaseId, (counts.get(m.useCaseId) ?? 0) + 1);
    }
    return counts;
  }, [activeDataset.mappings]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#0B1220]">
      <AtlasHeader
        dataset={activeDataset}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenUpdates={() => setIsUpdatesDrawerOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenCiteModal={() => setIsCitationModalOpen(true)}
      />

      <GlobalClauseFinder
        dataset={activeDataset}
        onOpenClause={handleOpenClauseFromFinder}
      />

      {/* Primary 4-Mode Task Switcher */}
      <section
        id="workspace-tabs"
        aria-label="Choose an Atlas task mode"
        className="scroll-mt-16 border-b border-slate-200 bg-white"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4">
          <div
            role="tablist"
            aria-label="Open Atlas workbench views"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {WORKSPACE_TABS.map((tab) => {
              const selected = activeTab === tab.id;
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  id={`workspace-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    selected
                      ? 'bg-[#0B1220] text-white border-[#0B1220] shadow-xs'
                      : 'bg-slate-50/80 text-slate-900 border-slate-200 hover:border-slate-400 hover:bg-white'
                  }`}
                >
                  <div
                    className={`p-2 rounded-md shrink-0 mt-0.5 ${
                      selected
                        ? 'bg-white/10 text-emerald-300'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10.5px] font-mono font-semibold tabular-nums ${
                          selected ? 'text-emerald-300' : 'text-emerald-700'
                        }`}
                      >
                        {tab.step}.
                      </span>
                      <span className="text-xs sm:text-sm font-semibold leading-tight">
                        {tab.title}
                      </span>
                    </div>
                    <p
                      className={`text-[11.5px] mt-1 leading-snug ${
                        selected ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {tab.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* TAB 1: In-the-News Briefings */}
        {activeTab === 'spotlights' && (
          <NewsSpotlightSection
            dataset={activeDataset}
            initialSpotlightId={initialQuery.spotlightId}
            onSelectSpotlight={(spotId) => {
              updateQueryParamSafe('spotlight', spotId);
              updateQueryParamSafe('tab', 'spotlights');
            }}
            onTraceUseCase={(useCaseId) => {
              handleChangeMatrixUseCase(useCaseId);
              setAlignmentFilter('all');
              handleSelectTab('use-cases');
            }}
            onOpenCompareTab={() => handleSelectTab('compare')}
          />
        )}

        {/* TAB 2: Compare Two Frameworks */}
        {activeTab === 'compare' && (
          <RegimeConvergenceOverview
            dataset={activeDataset}
            selection={selection}
            selectedPairOverride={selectedPair}
            onPairChange={handlePairChange}
            onSelectEntity={handleSelectEntity}
            onInspectClause={setActiveClauseMapping}
            onOpenUseCaseChecklist={(ucId) => {
              handleChangeMatrixUseCase(ucId);
              handleSelectTab('use-cases');
              document
                .getElementById('workspace-tabs')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        )}

        {/* TAB 3: Check an AI Use Case (Checklist-First + Optional Visual Pathway Map) */}
        {activeTab === 'use-cases' && (
          <div>
            <section
              id="use-case-quick-picker"
              aria-label="Select a concrete AI deployment to inspect"
              className="border-b border-slate-200 bg-[#F7F8FA] py-6"
            >
              <div className="max-w-[1400px] mx-auto px-4 sm:px-8 space-y-4">
                {scenarioBanner && (
                  <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-300 text-xs sm:text-sm text-emerald-950 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                      <span>{scenarioBanner}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScenarioBanner(null)}
                      aria-label="Dismiss scenario notice"
                      className="p-1 text-emerald-800 hover:text-emerald-950 cursor-pointer"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-emerald-800">
                      SYSTEM COMPLIANCE &amp; PROCUREMENT CHECKLIST
                    </p>
                    <h2 className="font-editorial text-xl sm:text-2xl font-medium text-slate-950 mt-0.5">
                      Pick a Concrete AI System ({activeDataset.useCases.length} Deployments)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600">
                    Switching systems updates both the compliance table and the executive summary
                    below.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {activeDataset.useCases.map((uc) => {
                    const isSelected = selectedUseCase.id === uc.id;
                    const clauseTotal = mappingCountByUseCase.get(uc.id) ?? 0;
                    return (
                      <button
                        key={uc.id}
                        type="button"
                        onClick={() => handleChangeMatrixUseCase(uc.id)}
                        className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10.5px] font-mono">
                          <span
                            className={`truncate ${
                              isSelected ? 'text-emerald-300' : 'text-emerald-800'
                            }`}
                          >
                            {uc.isCustomSandbox ? 'Custom Sandbox' : uc.sector}
                          </span>
                          <span
                            className={`shrink-0 tabular-nums ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {clauseTotal} clauses
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-snug mt-1 line-clamp-2">
                          {uc.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <MatrixExportView
              dataset={activeDataset}
              selectedUseCase={selectedUseCase}
              onChangeUseCase={handleChangeMatrixUseCase}
              onInspectClause={setActiveClauseMapping}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />

            <div className="pt-8 bg-[#F7F8FA]">
              <InteroperabilityBriefCard
                dataset={activeDataset}
                brief={brief}
                onSelectEntity={handleSelectEntity}
                onInspectClause={setActiveClauseMapping}
                onOpenExportModal={() => setIsExportModalOpen(true)}
              />
            </div>

            {/* Optional 3-Column Visual Pathway Diagram Toggle */}
            <section
              id="visual-topology-toggle-bar"
              aria-label="Toggle 3-Column Visual Pathway Diagram"
              className="border-t border-slate-200 bg-white py-5"
            >
              <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">
                    Prefer a visual map of how controls connect to regimes?
                  </p>
                  <p className="text-xs text-slate-600">
                    Expand the three-column interactive pathway diagram showing how this AI system
                    links to operational artifacts and global rules.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVisualTopology((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showVisualTopology ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Hide 3-Column Visual Pathway Diagram</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Show 3-Column Visual Pathway Diagram</span>
                    </>
                  )}
                </button>
              </div>
            </section>

            {showVisualTopology && (
              <InteroperabilityFlow
                dataset={activeDataset}
                selection={selection}
                onSelect={handleSelectEntity}
                alignmentFilter={alignmentFilter}
                onChangeAlignmentFilter={setAlignmentFilter}
                onInspectClause={setActiveClauseMapping}
              />
            )}
          </div>
        )}

        {/* TAB 4: Test Custom Scenario & Data */}
        {activeTab === 'sandbox' && (
          <div>
            <UseCaseSandbox
              dataset={activeDataset}
              sandboxResults={sandboxResults}
              onAddSandboxResult={handleAddSandboxResult}
              onRemoveSandboxUseCase={handleRemoveSandboxUseCase}
              onFocusUseCaseInFlow={(useCaseId) => {
                handleChangeMatrixUseCase(useCaseId);
                setScenarioBanner(
                  'Scenario mapped — reviewing your cross-border compliance checklist below.'
                );
                handleSelectTab('use-cases');
                document
                  .getElementById('workspace-tabs')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <MethodologySchemaSection
              dataset={activeDataset}
              onSelectInstrument={(sel) => {
                if (sel.type === 'instrument') {
                  setSelectedPair(defaultPairForInstrument(sel.id));
                  updateQueryParamSafe('instrument', sel.id);
                  handleSelectTab('compare');
                  document
                    .getElementById('workspace-tabs')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              onOpenUpdates={() => setIsUpdatesDrawerOpen(true)}
            />
          </div>
        )}
      </main>

      <CrawlableFooterDirectory dataset={activeDataset} />

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            {activeDataset.metadata.atlasName} · Maintained by{' '}
            {activeDataset.metadata.maintainer}
          </p>
          <p className="font-mono tabular-nums">
            Dataset v{activeDataset.metadata.datasetVersion} · Last Synced{' '}
            {activeDataset.metadata.lastUpdated.slice(0, 10)}
          </p>
        </div>
      </footer>

      <RecentUpdatesDrawer
        isOpen={isUpdatesDrawerOpen}
        onClose={() => setIsUpdatesDrawerOpen(false)}
        dataset={activeDataset}
        onSelectEntity={(sel) => {
          handleSelectEntity(sel);
          if (sel.type === 'instrument') {
            handleSelectTab('compare');
          } else {
            handleSelectTab('use-cases');
            if (sel.type === 'control') {
              setShowVisualTopology(true);
            }
          }
          document.getElementById('workspace-tabs')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <ClauseReaderDrawer
        mapping={activeClauseMapping}
        dataset={activeDataset}
        onClose={() => setActiveClauseMapping(null)}
        onSelectMapping={setActiveClauseMapping}
        onSelectEntity={(sel) => {
          handleSelectEntity(sel);
          if (sel.type === 'instrument') {
            handleSelectTab('compare');
          } else {
            handleSelectTab('use-cases');
          }
        }}
      />

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        dataset={activeDataset}
        selectedUseCase={selectedUseCase}
        onChangeUseCase={handleChangeMatrixUseCase}
      />

      <CitationModal
        isOpen={isCitationModalOpen}
        onClose={() => setIsCitationModalOpen(false)}
        dataset={activeDataset}
      />
    </div>
  );
}
