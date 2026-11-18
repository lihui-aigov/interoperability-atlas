/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import rawAtlasData from './data/atlas.json';
import { AtlasHeader } from './components/AtlasHeader';
import { CitationModal } from './components/CitationModal';
import { ClauseReaderDrawer } from './components/ClauseReaderDrawer';
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

const baseDataset = rawAtlasData as AtlasDataset;
const SANDBOX_STORAGE_KEY = 'open_atlas_sandbox_results_v1';

function readInitialQueryParams(): {
  spotlightId?: string;
  initialSelection: FocusSelection;
  initialMatrixUseCaseId: string;
} {
  const defaultUcId = baseDataset.useCases[0].id;
  try {
    const params = new URLSearchParams(window.location.search);
    const spotlightParam = params.get('spotlight') ?? undefined;
    const useCaseParam = params.get('useCase');
    const instParam = params.get('instrument');

    if (useCaseParam && baseDataset.useCases.some((u) => u.id === useCaseParam)) {
      return {
        spotlightId: spotlightParam,
        initialSelection: { type: 'useCase', id: useCaseParam },
        initialMatrixUseCaseId: useCaseParam,
      };
    }

    if (instParam && baseDataset.instruments.some((i) => i.id === instParam)) {
      return {
        spotlightId: spotlightParam,
        initialSelection: { type: 'instrument', id: instParam },
        initialMatrixUseCaseId: defaultUcId,
      };
    }

    if (spotlightParam) {
      const matchedSpot = baseDataset.spotlights?.find((s) => s.id === spotlightParam);
      if (
        matchedSpot &&
        baseDataset.useCases.some((u) => u.id === matchedSpot.linkedUseCaseId)
      ) {
        return {
          spotlightId: spotlightParam,
          initialSelection: { type: 'useCase', id: matchedSpot.linkedUseCaseId },
          initialMatrixUseCaseId: matchedSpot.linkedUseCaseId,
        };
      }
    }
  } catch {
    // Ignore malformed query strings cleanly
  }

  return {
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
      return saved ? (JSON.parse(saved) as SandboxMappingResult[]) : [];
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

  const [selection, setSelection] = useState<FocusSelection>(
    initialQuery.initialSelection
  );

  const [selectedMatrixUseCaseId, setSelectedMatrixUseCaseId] = useState<string>(
    initialQuery.initialMatrixUseCaseId
  );

  const [alignmentFilter, setAlignmentFilter] = useState<AlignmentType | 'all'>('all');
  const [isUpdatesDrawerOpen, setIsUpdatesDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [activeClauseMapping, setActiveClauseMapping] = useState<InteropMapping | null>(null);

  const handleSelectEntity = (next: FocusSelection) => {
    setSelection(next);
    if (next.type === 'useCase') {
      setSelectedMatrixUseCaseId(next.id);
      updateQueryParamSafe('useCase', next.id);
    } else if (next.type === 'instrument') {
      updateQueryParamSafe('instrument', next.id);
    }
  };

  const handleChangeMatrixUseCase = (useCaseId: string) => {
    setSelectedMatrixUseCaseId(useCaseId);
    setSelection({ type: 'useCase', id: useCaseId });
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#0B1220]">
      <AtlasHeader
        dataset={activeDataset}
        onOpenUpdates={() => setIsUpdatesDrawerOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenCiteModal={() => setIsCitationModalOpen(true)}
      />

      <GlobalClauseFinder
        dataset={activeDataset}
        onOpenClause={handleOpenClauseFromFinder}
      />

      <main className="flex-1">
        <NewsSpotlightSection
          dataset={activeDataset}
          initialSpotlightId={initialQuery.spotlightId}
          onSelectSpotlight={(spotId) => updateQueryParamSafe('spotlight', spotId)}
          onTraceUseCase={(useCaseId) => {
            handleSelectEntity({ type: 'useCase', id: useCaseId });
            setAlignmentFilter('all');
          }}
        />

        <RegimeConvergenceOverview
          dataset={activeDataset}
          selection={selection}
          onSelectEntity={handleSelectEntity}
          onInspectClause={setActiveClauseMapping}
        />

        <InteroperabilityFlow
          dataset={activeDataset}
          selection={selection}
          onSelect={handleSelectEntity}
          alignmentFilter={alignmentFilter}
          onChangeAlignmentFilter={setAlignmentFilter}
          onInspectClause={setActiveClauseMapping}
        />

        <InteroperabilityBriefCard
          dataset={activeDataset}
          brief={brief}
          onSelectEntity={handleSelectEntity}
          onInspectClause={setActiveClauseMapping}
          onOpenExportModal={() => setIsExportModalOpen(true)}
        />

        <MatrixExportView
          dataset={activeDataset}
          selectedUseCase={selectedUseCase}
          onChangeUseCase={handleChangeMatrixUseCase}
          onInspectClause={setActiveClauseMapping}
          onOpenExportModal={() => setIsExportModalOpen(true)}
        />

        <UseCaseSandbox
          dataset={activeDataset}
          sandboxResults={sandboxResults}
          onAddSandboxResult={handleAddSandboxResult}
          onRemoveSandboxUseCase={handleRemoveSandboxUseCase}
          onFocusUseCaseInFlow={(useCaseId) =>
            handleSelectEntity({ type: 'useCase', id: useCaseId })
          }
        />

        <MethodologySchemaSection
          dataset={activeDataset}
          onSelectInstrument={handleSelectEntity}
          onOpenUpdates={() => setIsUpdatesDrawerOpen(true)}
        />
      </main>

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
        onSelectEntity={handleSelectEntity}
      />

      <ClauseReaderDrawer
        mapping={activeClauseMapping}
        dataset={activeDataset}
        onClose={() => setActiveClauseMapping(null)}
        onSelectMapping={setActiveClauseMapping}
        onSelectEntity={handleSelectEntity}
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
