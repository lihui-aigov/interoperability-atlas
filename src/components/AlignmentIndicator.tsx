import { AlertTriangle, CheckCircle2, PlusSquare } from 'lucide-react';
import type { AlignmentType } from '../types/atlas';

interface AlignmentIndicatorProps {
  type: AlignmentType;
  showLabel?: boolean;
  compact?: boolean;
  dotOnly?: boolean;
}

const ALIGNMENT_CONFIG: Record<
  AlignmentType,
  {
    label: string;
    shortLabel: string;
    textClass: string;
    dotClass: string;
    Icon: typeof CheckCircle2;
  }
> = {
  equivalent: {
    label: 'Comply Once (Shared Core)',
    shortLabel: 'Comply Once',
    textClass: 'text-[var(--align-equivalent-ink)]',
    dotClass: 'bg-[var(--align-equivalent-ink)]',
    Icon: CheckCircle2,
  },
  delta: {
    label: 'Extra Local Step',
    shortLabel: 'Extra Step',
    textClass: 'text-[var(--align-delta-ink)]',
    dotClass: 'bg-[var(--align-delta-ink)]',
    Icon: PlusSquare,
  },
  friction: {
    label: 'Direct Rule Clash',
    shortLabel: 'Rule Clash',
    textClass: 'text-[var(--align-friction-ink)]',
    dotClass: 'bg-[var(--align-friction-ink)]',
    Icon: AlertTriangle,
  },
};

export function AlignmentIndicator({
  type,
  showLabel = true,
  compact = false,
  dotOnly = false,
}: AlignmentIndicatorProps) {
  const cfg = ALIGNMENT_CONFIG[type];
  const { Icon } = cfg;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${cfg.textClass}`}>
      {dotOnly ? (
        <span
          className={`w-2 h-2 rounded-full shrink-0 inline-block ${cfg.dotClass}`}
          aria-hidden="true"
        />
      ) : (
        <Icon className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} aria-hidden="true" />
      )}
      {showLabel && (
        <span className={compact ? 'text-xs' : 'text-[13px]'}>
          {compact ? cfg.shortLabel : cfg.label}
        </span>
      )}
    </span>
  );
}
