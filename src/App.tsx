/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CheckCircle2, Eye, EyeOff, History, X } from 'lucide-react';
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

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen flex flex-col bg-[var(--atlas-ground)] text-[var(--atlas-ink)]">
      <AtlasHeader
        dataset={activeDataset}
        activeTab={activeTab}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
        onSelectTab={handleSelectTab}
        onOpenUpdates={() => setIsUpdatesDrawerOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenCiteModal={() => setIsCitationModalOpen(true)}
      />

      <GlobalClauseFinder
        dataset={activeDataset}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenClause={handleOpenClauseFromFinder}
      />

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
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* TAB 3: Check an AI Use Case (Checklist-First + Optional Visual Pathway Map) */}
        {activeTab === 'use-cases' && (
          <div>
            <section
              id="use-case-quick-picker"
              aria-label="Select a concrete AI deployment to inspect"
              className="bg-[var(--atlas-ground)] pt-6 pb-8"
            >
              <div className="max-w-[1400px] mx-auto px-4 sm:px-8 space-y-5">
                {scenarioBanner && (
                  <div className="p-3.5 rounded-[2px] bg-[var(--align-equivalent-tint)] border border-[var(--align-equivalent-rule)] text-xs sm:text-sm text-[var(--align-equivalent-ink)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{scenarioBanner}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScenarioBanner(null)}
                      aria-label="Dismiss scenario notice"
                      className="p-1 text-[var(--align-equivalent-ink)] hover:opacity-75 cursor-pointer"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[var(--atlas-rule)]">
                  <div>
                    <h1 className="font-editorial text-[26px] sm:text-[30px] font-semibold tracking-[-0.015em] leading-[1.2] text-[var(--atlas-ink)]">
                      Use-Case Compliance Checklists ({activeDataset.useCases.length} Systems)
                    </h1>
                    <p className="text-sm text-[var(--atlas-ink-secondary)] mt-1 max-w-[68ch]">
                      Select an AI deployment below to update both the cross-regime obligations
                      table and the procurement checklist summary.
                    </p>
                  </div>
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
                        aria-pressed={isSelected}
                        className={`p-3 rounded-[2px] border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--atlas-accent-tint)] text-[var(--atlas-ink)] border-[var(--atlas-accent)] ring-1 ring-[var(--atlas-accent)]'
                            : 'bg-white text-[var(--atlas-ink)] border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] hover:bg-[var(--atlas-surface)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                          <span
                            className={`truncate ${
                              isSelected
                                ? 'text-[var(--atlas-accent)] font-medium'
                                : 'text-[var(--atlas-ink-muted)]'
                            }`}
                          >
                            {uc.isCustomSandbox ? 'Custom Sandbox' : uc.sector}
                          </span>
                          <span className="shrink-0 text-[var(--atlas-ink-muted)]">
                            {clauseTotal} clauses
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold leading-snug mt-1 line-clamp-2">
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

            <div className="pt-8 bg-[var(--atlas-ground)]">
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
              className="border-t border-[var(--atlas-rule-subtle)] bg-[var(--atlas-surface)] py-5"
            >
              <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[var(--atlas-ink)]">
                    Prefer a visual map of how controls connect to regimes?
                  </p>
                  <p className="text-xs text-[var(--atlas-ink-secondary)]">
                    Expand the three-column interactive pathway diagram showing how this AI system
                    links to operational artifacts and global rules.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVisualTopology((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] hover:bg-[var(--atlas-elevated)] rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            <MethodologySchemaSection
              dataset={activeDataset}
              onSelectInstrument={(sel) => {
                if (sel.type === 'instrument') {
                  setSelectedPair(defaultPairForInstrument(sel.id));
                  updateQueryParamSafe('instrument', sel.id);
                  handleSelectTab('compare');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              onOpenUpdates={() => setIsUpdatesDrawerOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Quiet Editorial Colophon / Personal-Capacity Origin Note */}
      <section
        aria-label="About this independent observatory"
        className="border-t border-[var(--atlas-rule)] bg-white py-8"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-baseline">
          <div className="lg:col-span-8">
            <h2 className="font-editorial text-lg font-semibold text-[var(--atlas-ink)]">
              About this observatory
            </h2>
            <p className="mt-1.5 text-[13px] text-[var(--atlas-ink-secondary)] leading-relaxed max-w-[68ch]">
              I started this side project because reading AI governance news and policy debates kept
              raising practical questions about what multiple regimes actually require on the ground,
              and no existing tracker linked breaking cases directly to cross-framework evidence and
              operational controls. Maintained independently by {activeDataset.metadata.maintainer} in
              a personal scholarly capacity from published primary texts under a CC-BY-4.0 dataset
              license.
            </p>
          </div>
          <div className="lg:col-span-4 lg:text-right text-xs text-[var(--atlas-ink-muted)] space-y-1.5">
            <p className="font-mono tabular-nums">
              Dataset v{activeDataset.metadata.datasetVersion}, Schema{' '}
              {activeDataset.metadata.schemaVersion}, updated{' '}
              {activeDataset.metadata.lastUpdated.slice(0, 10)}
            </p>
            <div>
              <button
                type="button"
                onClick={() => setIsUpdatesDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--atlas-accent)] hover:underline underline-offset-4 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  View Autonomous Curation Log ({activeDataset.metadata.recentUpdates.length})
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <CrawlableFooterDirectory dataset={activeDataset} />

      <footer className="border-t border-[var(--atlas-rule)] bg-white py-5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--atlas-ink-muted)]">
          <p>
            {activeDataset.metadata.atlasName}, maintained by {activeDataset.metadata.maintainer}
          </p>
          <p className="font-mono tabular-nums">
            Dataset v{activeDataset.metadata.datasetVersion}, last synced{' '}
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
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
