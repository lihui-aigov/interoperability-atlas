/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import rawAtlasData from './data/atlas.json';
import { AtlasHeader } from './components/AtlasHeader';
import { ExportPreviewModal } from './components/ExportPreviewModal';
import { InteroperabilityBriefCard } from './components/InteroperabilityBriefCard';
import { InteroperabilityFlow } from './components/InteroperabilityFlow';
import { MatrixExportView } from './components/MatrixExportView';
import { MethodologySchemaSection } from './components/MethodologySchemaSection';
import { RecentUpdatesDrawer } from './components/RecentUpdatesDrawer';
import { UseCaseSandbox } from './components/UseCaseSandbox';
import type { AlignmentType, AtlasDataset, SandboxMappingResult } from './types/atlas';
import {
  buildInteroperabilityBrief,
  type FocusSelection,
} from './utils/atlasAnalytics';

const baseDataset = rawAtlasData as AtlasDataset;
const SANDBOX_STORAGE_KEY = 'open_atlas_sandbox_results_v1';

export default function App() {
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

  const [selection, setSelection] = useState<FocusSelection>({
    type: 'useCase',
    id: baseDataset.useCases[0].id,
  });

  const [selectedMatrixUseCaseId, setSelectedMatrixUseCaseId] = useState<string>(
    baseDataset.useCases[0].id
  );

  const [alignmentFilter, setAlignmentFilter] = useState<AlignmentType | 'all'>('all');
  const [isUpdatesDrawerOpen, setIsUpdatesDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleSelectEntity = (next: FocusSelection) => {
    setSelection(next);
    if (next.type === 'useCase') {
      setSelectedMatrixUseCaseId(next.id);
    }
  };

  const handleChangeMatrixUseCase = (useCaseId: string) => {
    setSelectedMatrixUseCaseId(useCaseId);
    setSelection({ type: 'useCase', id: useCaseId });
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <AtlasHeader
        dataset={activeDataset}
        onOpenUpdates={() => setIsUpdatesDrawerOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      <main className="flex-1">
        <InteroperabilityFlow
          dataset={activeDataset}
          selection={selection}
          onSelect={handleSelectEntity}
          alignmentFilter={alignmentFilter}
          onChangeAlignmentFilter={setAlignmentFilter}
        />

        <InteroperabilityBriefCard
          dataset={activeDataset}
          brief={brief}
          onSelectEntity={handleSelectEntity}
          onOpenExportModal={() => setIsExportModalOpen(true)}
        />

        <MatrixExportView
          dataset={activeDataset}
          selectedUseCase={selectedUseCase}
          onChangeUseCase={handleChangeMatrixUseCase}
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

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        dataset={activeDataset}
        selectedUseCase={selectedUseCase}
        onChangeUseCase={handleChangeMatrixUseCase}
      />
    </div>
  );
}
