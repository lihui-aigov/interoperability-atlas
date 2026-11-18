import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { AtlasDataset, UpdateChangeType } from '../types/atlas';
import type { FocusSelection } from '../utils/atlasAnalytics';

interface RecentUpdatesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: AtlasDataset;
  onSelectEntity: (selection: FocusSelection) => void;
}

const CHANGE_TYPE_LABELS: Record<UpdateChangeType, { label: string; colorClass: string }> = {
  new_mapping: { label: 'New Verified Mapping', colorClass: 'text-emerald-800' },
  citation_verified: { label: 'Citation Re-Verified', colorClass: 'text-slate-800' },
  instrument_update: { label: 'Instrument Amendment', colorClass: 'text-amber-800' },
  friction_alert: { label: 'Regulatory Friction Alert', colorClass: 'text-rose-800' },
};

export function RecentUpdatesDrawer({
  isOpen,
  onClose,
  dataset,
  onSelectEntity,
}: RecentUpdatesDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { metadata } = dataset;

  const resolveEntityLabel = (id: string): { label: string; selection: FocusSelection } | null => {
    const uc = dataset.useCases.find((u) => u.id === id);
    if (uc) return { label: uc.title, selection: { type: 'useCase', id: uc.id } };
    const ctrl = dataset.controls.find((c) => c.id === id);
    if (ctrl) return { label: ctrl.title, selection: { type: 'control', id: ctrl.id } };
    const inst = dataset.instruments.find((i) => i.id === id);
    if (inst) return { label: inst.shortName, selection: { type: 'instrument', id: inst.id } };
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="updates-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden animate-drawer-in">
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-slate-500 tabular-nums">
              {metadata.repositoryWorkflow} · v{metadata.datasetVersion}
            </p>
            <h2
              id="updates-drawer-title"
              className="font-editorial text-xl font-medium text-slate-950 mt-1"
            >
              Recent Automated Dataset Updates
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close automated updates drawer"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 leading-relaxed">
          All domain records reside in <code className="font-mono text-slate-900">src/data/atlas.json</code>{' '}
          conforming to <code className="font-mono text-slate-900">src/types/atlas.ts</code> (Schema{' '}
          <span className="font-mono tabular-nums">{metadata.schemaVersion}</span>). External
          scheduled GitHub Actions append verified clause citations without modifying UI code.
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-200 px-6">
          {metadata.recentUpdates.map((entry) => {
            const typeMeta = CHANGE_TYPE_LABELS[entry.changeType];
            return (
              <article key={entry.id} className="py-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-500">
                  <span className={`font-sans font-semibold ${typeMeta.colorClass}`}>
                    {typeMeta.label}
                  </span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={entry.timestamp}>{entry.timestamp.slice(0, 10)}</time>
                  <span aria-hidden="true">·</span>
                  <span>{entry.runId}</span>
                </div>

                <p className="mt-2 text-sm text-slate-800 leading-relaxed">{entry.summary}</p>

                <p className="mt-2 text-xs text-slate-500">
                  Source: <span className="text-slate-700">{entry.sourceReference}</span>
                </p>

                {entry.affectedIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    <span className="text-slate-500">Inspect in Flow:</span>
                    {entry.affectedIds.map((affectedId) => {
                      const resolved = resolveEntityLabel(affectedId);
                      if (!resolved) return null;
                      return (
                        <button
                          key={affectedId}
                          type="button"
                          onClick={() => {
                            onSelectEntity(resolved.selection);
                            onClose();
                          }}
                          className="text-slate-900 font-medium underline underline-offset-4 hover:text-emerald-800 transition-colors cursor-pointer text-left"
                        >
                          {resolved.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
