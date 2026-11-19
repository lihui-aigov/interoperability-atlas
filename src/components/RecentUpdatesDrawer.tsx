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
  new_mapping: { label: 'New Verified Mapping', colorClass: 'text-[var(--align-equivalent-ink)]' },
  citation_verified: { label: 'Citation Re-Verified', colorClass: 'text-[var(--atlas-ink)]' },
  instrument_update: { label: 'Instrument Amendment', colorClass: 'text-[var(--align-delta-ink)]' },
  friction_alert: { label: 'Regulatory Friction Alert', colorClass: 'text-[var(--align-friction-ink)]' },
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
      className="fixed inset-0 z-50 flex justify-end bg-[#1A1D23]/30"
      role="dialog"
      aria-modal="true"
      aria-labelledby="updates-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white h-full border-l border-[var(--atlas-rule)] flex flex-col overflow-hidden animate-drawer-in">
        <div className="px-6 py-5 border-b border-[var(--atlas-rule)] flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-[var(--atlas-ink-muted)] tabular-nums">
              {metadata.repositoryWorkflow}, v{metadata.datasetVersion}
            </p>
            <h2
              id="updates-drawer-title"
              className="font-editorial text-xl font-semibold text-[var(--atlas-ink)] mt-1"
            >
              Autonomous Dataset Curation Log
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close automated updates drawer"
            className="p-2 text-[var(--atlas-ink-muted)] hover:text-[var(--atlas-ink)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-4 bg-[var(--atlas-surface)] border-b border-[var(--atlas-rule)] text-xs text-[var(--atlas-ink-secondary)] leading-relaxed">
          All domain records reside in{' '}
          <code className="font-mono text-[var(--atlas-ink)]">src/data/atlas.json</code> conforming
          to <code className="font-mono text-[var(--atlas-ink)]">src/types/atlas.ts</code> (Schema{' '}
          <span className="font-mono tabular-nums">{metadata.schemaVersion}</span>). Scheduled
          workflows verify links and append clause records independently from UI code.
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-[var(--atlas-rule-subtle)] px-6">
          {metadata.recentUpdates.map((entry) => {
            const typeMeta = CHANGE_TYPE_LABELS[entry.changeType];
            return (
              <article key={entry.id} className="py-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums text-[var(--atlas-ink-muted)]">
                  <span className={`font-sans font-semibold ${typeMeta.colorClass}`}>
                    {typeMeta.label}
                  </span>
                  <time dateTime={entry.timestamp}>{entry.timestamp.slice(0, 10)}</time>
                  <span>{entry.runId}</span>
                </div>

                <p className="mt-2 text-sm text-[var(--atlas-ink)] leading-relaxed max-w-[68ch]">
                  {entry.summary}
                </p>

                <p className="mt-2 text-xs text-[var(--atlas-ink-muted)]">
                  Source: <span className="text-[var(--atlas-ink-secondary)]">{entry.sourceReference}</span>
                </p>

                {entry.affectedIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    <span className="text-[var(--atlas-ink-muted)]">Inspect:</span>
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
                          className="text-[var(--atlas-accent)] font-medium underline underline-offset-4 cursor-pointer text-left"
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
