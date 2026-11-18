import { AlertTriangle, CheckCircle2, PlusSquare } from 'lucide-react';
import type { AlignmentType } from '../types/atlas';

interface AlignmentIndicatorProps {
  type: AlignmentType;
  showLabel?: boolean;
  compact?: boolean;
}

const ALIGNMENT_CONFIG: Record<
  AlignmentType,
  {
    label: string;
    shortLabel: string;
    textClass: string;
    Icon: typeof CheckCircle2;
  }
> = {
  equivalent: {
    label: 'Comply Once (Shared Core)',
    shortLabel: 'Comply Once',
    textClass: 'text-emerald-800',
    Icon: CheckCircle2,
  },
  delta: {
    label: 'Extra Local Step',
    shortLabel: 'Extra Step',
    textClass: 'text-amber-800',
    Icon: PlusSquare,
  },
  friction: {
    label: 'Direct Rule Clash',
    shortLabel: 'Rule Clash',
    textClass: 'text-rose-800',
    Icon: AlertTriangle,
  },
};

export function AlignmentIndicator({
  type,
  showLabel = true,
  compact = false,
}: AlignmentIndicatorProps) {
  const cfg = ALIGNMENT_CONFIG[type];
  const { Icon } = cfg;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${cfg.textClass}`}>
      <Icon className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} aria-hidden="true" />
      {showLabel && (
        <span className={compact ? 'text-xs' : 'text-xs sm:text-sm'}>
          {compact ? cfg.shortLabel : cfg.label}
        </span>
      )}
    </span>
  );
}
