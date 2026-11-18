import type {
  AlignmentType,
  AtlasDataset,
  GovernanceInstrument,
  InteropMapping,
  OperationalControl,
  UseCase,
} from '../types/atlas';
import type { FocusSelection } from './atlasAnalytics';

export type SectorBucketId =
  | 'all'
  | 'public-civic'
  | 'social-markets'
  | 'climate-infrastructure';

export interface SectorFilterOption {
  id: SectorBucketId;
  label: string;
  count: number;
}

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
  primaryMapping: InteropMapping;
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

export interface FlowLayoutOptions {
  sectorFilter?: SectorBucketId;
  compactFocus?: boolean;
}

const VIEWBOX_WIDTH = 1320;
const HEADER_OFFSET_Y = 54;
const COL_WIDTH = 336;
const COL_X = {
  useCase: 14,
  control: 492,
  instrument: 970,
} as const;

const NODE_HEIGHT = 90;
const NODE_GAP = 12;
const PORT_MARGIN_Y = 17;

export function classifySectorBucket(sector: string): Exclude<SectorBucketId, 'all'> {
  const s = sector.toLowerCase();
  if (
    s.includes('climate') ||
    s.includes('energy') ||
    s.includes('infrastructure') ||
    s.includes('agri') ||
    s.includes('utilities') ||
    s.includes('emergency') ||
    s.includes('civil protection')
  ) {
    return 'climate-infrastructure';
  }
  if (
    s.includes('health') ||
    s.includes('education') ||
    s.includes('financ') ||
    s.includes('credit') ||
    s.includes('employ') ||
    s.includes('labor') ||
    s.includes('hiring')
  ) {
    return 'social-markets';
  }
  return 'public-civic';
}

export function deriveSectorFilterOptions(useCases: UseCase[]): SectorFilterOption[] {
  let publicCivic = 0;
  let socialMarkets = 0;
  let climateInfra = 0;

  for (const uc of useCases) {
    const bucket = classifySectorBucket(uc.sector);
    if (bucket === 'public-civic') publicCivic += 1;
    else if (bucket === 'social-markets') socialMarkets += 1;
    else climateInfra += 1;
  }

  const allOptions: SectorFilterOption[] = [
    { id: 'all', label: 'All Sectors', count: useCases.length },
    { id: 'public-civic', label: 'Public Sector & Civic', count: publicCivic },
    { id: 'social-markets', label: 'Health, Finance & Labor', count: socialMarkets },
    { id: 'climate-infrastructure', label: 'Climate, Energy & Agri', count: climateInfra },
  ];

  return allOptions.filter((opt) => opt.id === 'all' || opt.count > 0);
}

function alignmentOrder(type: AlignmentType): number {
  if (type === 'equivalent') return 0;
  if (type === 'delta') return 1;
  return 2;
}

function buildCubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = (x2 - x1) * 0.48;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function distributePortY(node: FlowNodeBox, index: number, total: number): number {
  if (total <= 1) {
    return node.y + node.height / 2;
  }
  const usableHeight = Math.max(12, node.height - PORT_MARGIN_Y * 2);
  return node.y + PORT_MARGIN_Y + (index / (total - 1)) * usableHeight;
}

/**
 * Computes a deterministic 3-column bipartite multi-port Sankey layout:
 * Left: Concrete Use Cases -> Center: Shared Operational Controls -> Right: Global Instruments
 */
export function computeFlowLayout(
  dataset: AtlasDataset,
  selection: FocusSelection,
  alignmentFilter: AlignmentType | 'all' = 'all',
  options: FlowLayoutOptions = {}
): FlowDiagramLayout {
  const sectorFilter = options.sectorFilter ?? 'all';
  const compactFocus = options.compactFocus ?? false;

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

  let displayedUseCases = dataset.useCases.filter((uc) => {
    if (sectorFilter === 'all') return true;
    return (
      classifySectorBucket(uc.sector) === sectorFilter ||
      (selection.type === 'useCase' && uc.id === selection.id)
    );
  });

  let displayedControls = dataset.controls;
  let displayedInstruments = dataset.instruments;

  if (compactFocus) {
    displayedUseCases = displayedUseCases.filter((uc) => activeUseCases.has(uc.id));
    displayedControls = displayedControls.filter((c) => activeControls.has(c.id));
    displayedInstruments = displayedInstruments.filter((i) => activeInstruments.has(i.id));
  }

  const displayedUcIds = new Set(displayedUseCases.map((u) => u.id));
  const displayedCtrlIds = new Set(displayedControls.map((c) => c.id));
  const displayedInstIds = new Set(displayedInstruments.map((i) => i.id));

  const scopedMappings = visibleMappings.filter(
    (m) =>
      displayedUcIds.has(m.useCaseId) &&
      displayedCtrlIds.has(m.controlId) &&
      displayedInstIds.has(m.instrumentId)
  );

  const maxCount = Math.max(
    displayedUseCases.length,
    displayedControls.length,
    displayedInstruments.length,
    1
  );

  const contentHeight = maxCount * NODE_HEIGHT + (maxCount - 1) * NODE_GAP;
  const viewBoxHeight = HEADER_OFFSET_Y + contentHeight + 24;

  const columnStartY = (count: number): number => {
    const colHeight = count * NODE_HEIGHT + Math.max(0, count - 1) * NODE_GAP;
    return HEADER_OFFSET_Y + Math.max(0, Math.round((contentHeight - colHeight) / 2));
  };

  const ucStartY = columnStartY(displayedUseCases.length);
  const ctrlStartY = columnStartY(displayedControls.length);
  const instStartY = columnStartY(displayedInstruments.length);

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

  const ucNodes: FlowNodeBox[] = displayedUseCases.map((uc: UseCase, idx: number) => {
    const pool = selection.type === 'useCase' ? scopedMappings : activeMappings;
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

  const ctrlNodes: FlowNodeBox[] = displayedControls.map((ctrl: OperationalControl, idx: number) => {
    const pool = selection.type === 'control' ? scopedMappings : activeMappings;
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

  const instNodes: FlowNodeBox[] = displayedInstruments.map(
    (inst: GovernanceInstrument, idx: number) => {
      const pool = selection.type === 'instrument' ? scopedMappings : activeMappings;
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
        secondaryLabel: `${inst.jurisdictionOrScope}`,
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

  interface RawLinkBucket {
    id: string;
    side: 'left' | 'right';
    sourceId: string;
    targetId: string;
    alignmentType: AlignmentType;
    all: InteropMapping[];
    active: InteropMapping[];
  }

  const leftBuckets = new Map<string, RawLinkBucket>();
  const rightBuckets = new Map<string, RawLinkBucket>();

  for (const m of scopedMappings) {
    const isAct = activeMappings.includes(m);

    const leftKey = `${m.useCaseId}__${m.controlId}__${m.alignmentType}`;
    const existingLeft = leftBuckets.get(leftKey);
    if (existingLeft) {
      existingLeft.all.push(m);
      if (isAct) existingLeft.active.push(m);
    } else {
      leftBuckets.set(leftKey, {
        id: `left-${leftKey}`,
        side: 'left',
        sourceId: m.useCaseId,
        targetId: m.controlId,
        alignmentType: m.alignmentType,
        all: [m],
        active: isAct ? [m] : [],
      });
    }

    const rightKey = `${m.controlId}__${m.instrumentId}__${m.alignmentType}`;
    const existingRight = rightBuckets.get(rightKey);
    if (existingRight) {
      existingRight.all.push(m);
      if (isAct) existingRight.active.push(m);
    } else {
      rightBuckets.set(rightKey, {
        id: `right-${rightKey}`,
        side: 'right',
        sourceId: m.controlId,
        targetId: m.instrumentId,
        alignmentType: m.alignmentType,
        all: [m],
        active: isAct ? [m] : [],
      });
    }
  }

  const rawLinks = [...leftBuckets.values(), ...rightBuckets.values()].filter(
    (b) => nodeMap.has(b.sourceId) && nodeMap.has(b.targetId)
  );

  // Assign distinct multi-port Y coordinates on both outgoing (right) and incoming (left) faces
  const outPortYByLinkId = new Map<string, number>();
  const inPortYByLinkId = new Map<string, number>();

  const outGroups = new Map<string, RawLinkBucket[]>();
  const inGroups = new Map<string, RawLinkBucket[]>();

  for (const link of rawLinks) {
    const outList = outGroups.get(`${link.side}::${link.sourceId}`);
    if (outList) outList.push(link);
    else outGroups.set(`${link.side}::${link.sourceId}`, [link]);

    const inList = inGroups.get(`${link.side}::${link.targetId}`);
    if (inList) inList.push(link);
    else inGroups.set(`${link.side}::${link.targetId}`, [link]);
  }

  for (const [, group] of outGroups.entries()) {
    const srcNode = nodeMap.get(group[0].sourceId)!;
    group.sort((a, b) => {
      const tgtA = nodeMap.get(a.targetId)!.y;
      const tgtB = nodeMap.get(b.targetId)!.y;
      if (tgtA !== tgtB) return tgtA - tgtB;
      return alignmentOrder(a.alignmentType) - alignmentOrder(b.alignmentType);
    });
    group.forEach((link, idx) => {
      outPortYByLinkId.set(link.id, distributePortY(srcNode, idx, group.length));
    });
  }

  for (const [, group] of inGroups.entries()) {
    const tgtNode = nodeMap.get(group[0].targetId)!;
    group.sort((a, b) => {
      const srcA = nodeMap.get(a.sourceId)!.y;
      const srcB = nodeMap.get(b.sourceId)!.y;
      if (srcA !== srcB) return srcA - srcB;
      return alignmentOrder(a.alignmentType) - alignmentOrder(b.alignmentType);
    });
    group.forEach((link, idx) => {
      inPortYByLinkId.set(link.id, distributePortY(tgtNode, idx, group.length));
    });
  }

  const links: FlowLinkPath[] = rawLinks.map((bucket) => {
    const src = nodeMap.get(bucket.sourceId)!;
    const tgt = nodeMap.get(bucket.targetId)!;
    const isActive = bucket.active.length > 0;
    const relevantList = isActive ? bucket.active : bucket.all;
    const x1 = src.x + src.width;
    const y1 = outPortYByLinkId.get(bucket.id) ?? src.y + src.height / 2;
    const x2 = tgt.x;
    const y2 = inPortYByLinkId.get(bucket.id) ?? tgt.y + tgt.height / 2;

    return {
      id: bucket.id,
      side: bucket.side,
      sourceId: bucket.sourceId,
      targetId: bucket.targetId,
      alignmentType: bucket.alignmentType,
      weight: relevantList.length,
      d: buildCubicPath(x1, y1, x2, y2),
      strokeWidth: isActive ? Math.min(5.2, 2 + relevantList.length * 0.72) : 1.15,
      isActive,
      citations: relevantList.map((m) => m.clauseCitation),
      primaryMapping: relevantList[0],
    };
  });

  // Render dimmed background links first, then active links sorted equivalent -> delta -> friction
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
        title: `Concrete AI Use Cases (${displayedUseCases.length})`,
      },
      {
        column: 'control',
        x: COL_X.control,
        width: COL_WIDTH,
        indexLabel: '02',
        title: `Operational Controls & Artifacts (${displayedControls.length})`,
      },
      {
        column: 'instrument',
        x: COL_X.instrument,
        width: COL_WIDTH,
        indexLabel: '03',
        title: `Global Instruments & Standards (${displayedInstruments.length})`,
      },
    ],
    nodes: [...ucNodes, ...ctrlNodes, ...instNodes],
    links,
  };
}
