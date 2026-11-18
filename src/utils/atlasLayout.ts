import type {
  AlignmentType,
  AtlasDataset,
  GovernanceInstrument,
  InteropMapping,
  OperationalControl,
  UseCase,
} from '../types/atlas';
import type { FocusSelection } from './atlasAnalytics';

export interface FlowNodeBox {
  id: string;
  column: 'useCase' | 'control' | 'instrument';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  kicker: string;
  secondaryLabel: string;
  isActive: boolean;
  isSelected: boolean;
  isCustomSandbox?: boolean;
  equivalentCount: number;
  deltaCount: number;
  frictionCount: number;
}

export interface FlowLinkPath {
  id: string;
  side: 'left' | 'right';
  sourceId: string;
  targetId: string;
  alignmentType: AlignmentType;
  weight: number;
  d: string;
  strokeWidth: number;
  isActive: boolean;
  citations: string[];
}

export interface FlowDiagramLayout {
  viewBoxWidth: number;
  viewBoxHeight: number;
  columnHeaders: Array<{
    column: 'useCase' | 'control' | 'instrument';
    x: number;
    width: number;
    indexLabel: string;
    title: string;
  }>;
  nodes: FlowNodeBox[];
  links: FlowLinkPath[];
}

const VIEWBOX_WIDTH = 1320;
const HEADER_OFFSET_Y = 54;
const COL_WIDTH = 332;
const COL_X = {
  useCase: 16,
  control: 494,
  instrument: 972,
} as const;

const NODE_HEIGHT = 88;
const NODE_GAP = 12;

function alignmentOrder(type: AlignmentType): number {
  if (type === 'equivalent') return 0;
  if (type === 'delta') return 1;
  return 2;
}

function buildCubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = (x2 - x1) * 0.48;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/**
 * Computes a deterministic 3-column bipartite node-link layout:
 * Left: Concrete Use Cases -> Center: Shared Operational Controls -> Right: Global Instruments
 */
export function computeFlowLayout(
  dataset: AtlasDataset,
  selection: FocusSelection,
  alignmentFilter: AlignmentType | 'all' = 'all'
): FlowDiagramLayout {
  const visibleMappings =
    alignmentFilter === 'all'
      ? dataset.mappings
      : dataset.mappings.filter((m) => m.alignmentType === alignmentFilter);

  const activeMappings = visibleMappings.filter((m) => {
    if (selection.type === 'useCase') return m.useCaseId === selection.id;
    if (selection.type === 'control') return m.controlId === selection.id;
    return m.instrumentId === selection.id;
  });

  const activeUseCases = new Set<string>();
  const activeControls = new Set<string>();
  const activeInstruments = new Set<string>();

  if (selection.type === 'useCase') activeUseCases.add(selection.id);
  if (selection.type === 'control') activeControls.add(selection.id);
  if (selection.type === 'instrument') activeInstruments.add(selection.id);

  for (const m of activeMappings) {
    activeUseCases.add(m.useCaseId);
    activeControls.add(m.controlId);
    activeInstruments.add(m.instrumentId);
  }

  const maxCount = Math.max(
    dataset.useCases.length,
    dataset.controls.length,
    dataset.instruments.length,
    1
  );

  const contentHeight = maxCount * NODE_HEIGHT + (maxCount - 1) * NODE_GAP;
  const viewBoxHeight = HEADER_OFFSET_Y + contentHeight + 24;

  const columnStartY = (count: number): number => {
    const colHeight = count * NODE_HEIGHT + Math.max(0, count - 1) * NODE_GAP;
    return HEADER_OFFSET_Y + Math.max(0, Math.round((contentHeight - colHeight) / 2));
  };

  const ucStartY = columnStartY(dataset.useCases.length);
  const ctrlStartY = columnStartY(dataset.controls.length);
  const instStartY = columnStartY(dataset.instruments.length);

  const countPool = (
    pool: InteropMapping[],
    predicate: (m: InteropMapping) => boolean
  ): { eq: number; dl: number; fr: number } => {
    let eq = 0;
    let dl = 0;
    let fr = 0;
    for (const m of pool) {
      if (!predicate(m)) continue;
      if (m.alignmentType === 'equivalent') eq += 1;
      else if (m.alignmentType === 'delta') dl += 1;
      else if (m.alignmentType === 'friction') fr += 1;
    }
    return { eq, dl, fr };
  };

  const ucNodes: FlowNodeBox[] = dataset.useCases.map((uc: UseCase, idx: number) => {
    const pool = selection.type === 'useCase' ? visibleMappings : activeMappings;
    const c = countPool(pool, (m) => m.useCaseId === uc.id);
    return {
      id: uc.id,
      column: 'useCase',
      x: COL_X.useCase,
      y: ucStartY + idx * (NODE_HEIGHT + NODE_GAP),
      width: COL_WIDTH,
      height: NODE_HEIGHT,
      title: uc.title,
      kicker: uc.isCustomSandbox ? `${uc.sector} · Live Sandbox` : uc.sector,
      secondaryLabel: uc.riskProfile,
      isActive: activeUseCases.has(uc.id),
      isSelected: selection.type === 'useCase' && selection.id === uc.id,
      isCustomSandbox: uc.isCustomSandbox,
      equivalentCount: c.eq,
      deltaCount: c.dl,
      frictionCount: c.fr,
    };
  });

  const ctrlNodes: FlowNodeBox[] = dataset.controls.map((ctrl: OperationalControl, idx: number) => {
    const pool = selection.type === 'control' ? visibleMappings : activeMappings;
    const c = countPool(pool, (m) => m.controlId === ctrl.id);
    return {
      id: ctrl.id,
      column: 'control',
      x: COL_X.control,
      y: ctrlStartY + idx * (NODE_HEIGHT + NODE_GAP),
      width: COL_WIDTH,
      height: NODE_HEIGHT,
      title: ctrl.title,
      kicker: ctrl.category,
      secondaryLabel: ctrl.artifactName,
      isActive: activeControls.has(ctrl.id),
      isSelected: selection.type === 'control' && selection.id === ctrl.id,
      equivalentCount: c.eq,
      deltaCount: c.dl,
      frictionCount: c.fr,
    };
  });

  const instNodes: FlowNodeBox[] = dataset.instruments.map(
    (inst: GovernanceInstrument, idx: number) => {
      const pool = selection.type === 'instrument' ? visibleMappings : activeMappings;
      const c = countPool(pool, (m) => m.instrumentId === inst.id);
      return {
        id: inst.id,
        column: 'instrument',
        x: COL_X.instrument,
        y: instStartY + idx * (NODE_HEIGHT + NODE_GAP),
        width: COL_WIDTH,
        height: NODE_HEIGHT,
        title: inst.shortName,
        kicker: `${inst.legalNature} · ${inst.adoptionYear}`,
        secondaryLabel: inst.issuingBody,
        isActive: activeInstruments.has(inst.id),
        isSelected: selection.type === 'instrument' && selection.id === inst.id,
        equivalentCount: c.eq,
        deltaCount: c.dl,
        frictionCount: c.fr,
      };
    }
  );

  const nodeMap = new Map<string, FlowNodeBox>();
  for (const n of [...ucNodes, ...ctrlNodes, ...instNodes]) {
    nodeMap.set(n.id, n);
  }

  // Aggregate left links (UseCase -> Control by alignmentType)
  const leftBuckets = new Map<
    string,
    {
      sourceId: string;
      targetId: string;
      alignmentType: AlignmentType;
      all: InteropMapping[];
      active: InteropMapping[];
    }
  >();

  for (const m of visibleMappings) {
    const key = `${m.useCaseId}__${m.controlId}__${m.alignmentType}`;
    const existing = leftBuckets.get(key);
    const isAct = activeMappings.includes(m);
    if (existing) {
      existing.all.push(m);
      if (isAct) existing.active.push(m);
    } else {
      leftBuckets.set(key, {
        sourceId: m.useCaseId,
        targetId: m.controlId,
        alignmentType: m.alignmentType,
        all: [m],
        active: isAct ? [m] : [],
      });
    }
  }

  // Aggregate right links (Control -> Instrument by alignmentType)
  const rightBuckets = new Map<
    string,
    {
      sourceId: string;
      targetId: string;
      alignmentType: AlignmentType;
      all: InteropMapping[];
      active: InteropMapping[];
    }
  >();

  for (const m of visibleMappings) {
    const key = `${m.controlId}__${m.instrumentId}__${m.alignmentType}`;
    const existing = rightBuckets.get(key);
    const isAct = activeMappings.includes(m);
    if (existing) {
      existing.all.push(m);
      if (isAct) existing.active.push(m);
    } else {
      rightBuckets.set(key, {
        sourceId: m.controlId,
        targetId: m.instrumentId,
        alignmentType: m.alignmentType,
        all: [m],
        active: isAct ? [m] : [],
      });
    }
  }

  const portOffset = (type: AlignmentType): number => {
    if (type === 'equivalent') return -7;
    if (type === 'delta') return 0;
    return 7;
  };

  const links: FlowLinkPath[] = [];

  for (const [key, bucket] of leftBuckets.entries()) {
    const src = nodeMap.get(bucket.sourceId);
    const tgt = nodeMap.get(bucket.targetId);
    if (!src || !tgt) continue;
    const isActive = bucket.active.length > 0;
    const relevantList = isActive ? bucket.active : bucket.all;
    const offset = portOffset(bucket.alignmentType);
    const x1 = src.x + src.width;
    const y1 = src.y + src.height / 2 + offset;
    const x2 = tgt.x;
    const y2 = tgt.y + tgt.height / 2 + offset;

    links.push({
      id: `left-${key}`,
      side: 'left',
      sourceId: bucket.sourceId,
      targetId: bucket.targetId,
      alignmentType: bucket.alignmentType,
      weight: relevantList.length,
      d: buildCubicPath(x1, y1, x2, y2),
      strokeWidth: isActive ? Math.min(5.5, 2 + relevantList.length * 0.75) : 1.25,
      isActive,
      citations: relevantList.map((m) => m.clauseCitation),
    });
  }

  for (const [key, bucket] of rightBuckets.entries()) {
    const src = nodeMap.get(bucket.sourceId);
    const tgt = nodeMap.get(bucket.targetId);
    if (!src || !tgt) continue;
    const isActive = bucket.active.length > 0;
    const relevantList = isActive ? bucket.active : bucket.all;
    const offset = portOffset(bucket.alignmentType);
    const x1 = src.x + src.width;
    const y1 = src.y + src.height / 2 + offset;
    const x2 = tgt.x;
    const y2 = tgt.y + tgt.height / 2 + offset;

    links.push({
      id: `right-${key}`,
      side: 'right',
      sourceId: bucket.sourceId,
      targetId: bucket.targetId,
      alignmentType: bucket.alignmentType,
      weight: relevantList.length,
      d: buildCubicPath(x1, y1, x2, y2),
      strokeWidth: isActive ? Math.min(5.5, 2 + relevantList.length * 0.75) : 1.25,
      isActive,
      citations: relevantList.map((m) => m.clauseCitation),
    });
  }

  // Render dimmed background links first, then active links sorted equivalent -> delta -> friction so critical friction/deltas remain crisp on top
  links.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? 1 : -1;
    return alignmentOrder(a.alignmentType) - alignmentOrder(b.alignmentType);
  });

  return {
    viewBoxWidth: VIEWBOX_WIDTH,
    viewBoxHeight,
    columnHeaders: [
      {
        column: 'useCase',
        x: COL_X.useCase,
        width: COL_WIDTH,
        indexLabel: '01',
        title: 'Concrete AI Use Cases',
      },
      {
        column: 'control',
        x: COL_X.control,
        width: COL_WIDTH,
        indexLabel: '02',
        title: 'Operational Controls & Artifacts',
      },
      {
        column: 'instrument',
        x: COL_X.instrument,
        width: COL_WIDTH,
        indexLabel: '03',
        title: 'Global Instruments & Standards',
      },
    ],
    nodes: [...ucNodes, ...ctrlNodes, ...instNodes],
    links,
  };
}
