import type {
  AlignmentType,
  AtlasDataset,
  GovernanceInstrument,
  InteropMapping,
  OperationalControl,
  UseCase,
} from '../types/atlas';
import { deriveSectionAnchor, resolveDeepLinkUrl } from './clauseNavigation';

export type NodeFocusType = 'useCase' | 'control' | 'instrument';

export interface FocusSelection {
  type: NodeFocusType;
  id: string;
}

export interface AlignmentCounts {
  equivalent: number;
  delta: number;
  friction: number;
  total: number;
}

export interface CoreControlSummary {
  control: OperationalControl;
  coveredInstruments: GovernanceInstrument[];
  equivalentMappings: InteropMapping[];
  deltaMappings: InteropMapping[];
  frictionMappings: InteropMapping[];
  coverageRatio: number;
}

export interface InteroperabilityBrief {
  focusType: NodeFocusType;
  focusId: string;
  title: string;
  subtitle: string;
  summary: string;
  counts: AlignmentCounts;
  coreControls: CoreControlSummary[];
  deltaMappings: InteropMapping[];
  frictionMappings: InteropMapping[];
  equivalentMappings: InteropMapping[];
  activeUseCaseIds: Set<string>;
  activeControlIds: Set<string>;
  activeInstrumentIds: Set<string>;
  activeMappings: InteropMapping[];
}

export function countAlignments(mappings: InteropMapping[]): AlignmentCounts {
  let equivalent = 0;
  let delta = 0;
  let friction = 0;
  for (const m of mappings) {
    if (m.alignmentType === 'equivalent') equivalent += 1;
    else if (m.alignmentType === 'delta') delta += 1;
    else if (m.alignmentType === 'friction') friction += 1;
  }
  return {
    equivalent,
    delta,
    friction,
    total: mappings.length,
  };
}

/**
 * Computes the active subgraph and the "80/20 Interoperability Brief"
 * for any selected Use Case, Operational Control, or Governance Instrument.
 */
export function buildInteroperabilityBrief(
  dataset: AtlasDataset,
  selection: FocusSelection,
  alignmentFilter: AlignmentType | 'all' = 'all'
): InteroperabilityBrief {
  const filteredPool =
    alignmentFilter === 'all'
      ? dataset.mappings
      : dataset.mappings.filter((m) => m.alignmentType === alignmentFilter);

  const activeMappings = filteredPool.filter((m) => {
    if (selection.type === 'useCase') return m.useCaseId === selection.id;
    if (selection.type === 'control') return m.controlId === selection.id;
    return m.instrumentId === selection.id;
  });

  const activeUseCaseIds = new Set<string>();
  const activeControlIds = new Set<string>();
  const activeInstrumentIds = new Set<string>();

  if (selection.type === 'useCase') activeUseCaseIds.add(selection.id);
  if (selection.type === 'control') activeControlIds.add(selection.id);
  if (selection.type === 'instrument') activeInstrumentIds.add(selection.id);

  for (const m of activeMappings) {
    activeUseCaseIds.add(m.useCaseId);
    activeControlIds.add(m.controlId);
    activeInstrumentIds.add(m.instrumentId);
  }

  const instrumentMap = new Map<string, GovernanceInstrument>(
    dataset.instruments.map((inst) => [inst.id, inst])
  );

  // Build core control summaries sorted by multi-instrument coverage
  const totalInstruments = Math.max(dataset.instruments.length, 1);
  const coreControls: CoreControlSummary[] = [];

  for (const ctrl of dataset.controls) {
    const ctrlMappings = activeMappings.filter((m) => m.controlId === ctrl.id);
    if (ctrlMappings.length === 0) continue;

    const eq = ctrlMappings.filter((m) => m.alignmentType === 'equivalent');
    const dl = ctrlMappings.filter((m) => m.alignmentType === 'delta');
    const fr = ctrlMappings.filter((m) => m.alignmentType === 'friction');

    // Instruments satisfied via equivalent or delta implementation of this control
    const satisfiedInstIds = new Set<string>(
      [...eq, ...dl].map((m) => m.instrumentId)
    );
    const coveredInstruments = Array.from(satisfiedInstIds)
      .map((id) => instrumentMap.get(id))
      .filter((inst): inst is GovernanceInstrument => Boolean(inst));

    coreControls.push({
      control: ctrl,
      coveredInstruments,
      equivalentMappings: eq,
      deltaMappings: dl,
      frictionMappings: fr,
      coverageRatio: coveredInstruments.length / totalInstruments,
    });
  }

  coreControls.sort((a, b) => {
    if (b.coveredInstruments.length !== a.coveredInstruments.length) {
      return b.coveredInstruments.length - a.coveredInstruments.length;
    }
    return b.equivalentMappings.length - a.equivalentMappings.length;
  });

  let title = '';
  let subtitle = '';
  let summary = '';

  if (selection.type === 'useCase') {
    const uc = dataset.useCases.find((u) => u.id === selection.id);
    title = uc?.title ?? selection.id;
    subtitle = uc ? `${uc.sector} · ${uc.riskProfile}` : 'Use Case';
    summary = uc?.summary ?? '';
  } else if (selection.type === 'control') {
    const ctrl = dataset.controls.find((c) => c.id === selection.id);
    title = ctrl?.title ?? selection.id;
    subtitle = ctrl ? `${ctrl.category} · Artifact: ${ctrl.artifactName}` : 'Operational Control';
    summary = ctrl?.description ?? '';
  } else {
    const inst = dataset.instruments.find((i) => i.id === selection.id);
    title = inst?.title ?? selection.id;
    subtitle = inst
      ? `${inst.issuingBody} · ${inst.legalNature} (${inst.adoptionYear})`
      : 'Governance Instrument';
    summary = inst?.summary ?? '';
  }

  return {
    focusType: selection.type,
    focusId: selection.id,
    title,
    subtitle,
    summary,
    counts: countAlignments(activeMappings),
    coreControls,
    equivalentMappings: activeMappings.filter((m) => m.alignmentType === 'equivalent'),
    deltaMappings: activeMappings.filter((m) => m.alignmentType === 'delta'),
    frictionMappings: activeMappings.filter((m) => m.alignmentType === 'friction'),
    activeUseCaseIds,
    activeControlIds,
    activeInstrumentIds,
    activeMappings,
  };
}

/**
 * Builds the Control x Instrument matrix for a given Use Case,
 * optionally filtered by alignment type and text search.
 */
export interface MatrixRow {
  control: OperationalControl;
  cellsByInstrumentId: Record<string, InteropMapping[]>;
  rowTotal: number;
}

export function buildUseCaseMatrix(
  dataset: AtlasDataset,
  useCaseId: string,
  alignmentFilter: AlignmentType | 'all' = 'all',
  searchQuery = ''
): MatrixRow[] {
  const q = searchQuery.trim().toLowerCase();

  const useCaseMappings = dataset.mappings.filter((m) => {
    if (m.useCaseId !== useCaseId) return false;
    if (alignmentFilter !== 'all' && m.alignmentType !== alignmentFilter) return false;
    if (!q) return true;
    return (
      m.clauseCitation.toLowerCase().includes(q) ||
      m.rationale.toLowerCase().includes(q) ||
      (m.clauseExcerpt?.toLowerCase().includes(q) ?? false)
    );
  });

  const rows: MatrixRow[] = [];

  for (const control of dataset.controls) {
    const controlMatchesQuery =
      q.length > 0 &&
      (control.title.toLowerCase().includes(q) ||
        control.artifactName.toLowerCase().includes(q) ||
        control.category.toLowerCase().includes(q));

    const cellsByInstrumentId: Record<string, InteropMapping[]> = {};
    let rowTotal = 0;

    for (const inst of dataset.instruments) {
      let cellMappings: InteropMapping[];
      if (controlMatchesQuery) {
        // Include all mappings for this control (respecting alignmentFilter) when control title matches search
        cellMappings = dataset.mappings.filter(
          (m) =>
            m.useCaseId === useCaseId &&
            m.controlId === control.id &&
            m.instrumentId === inst.id &&
            (alignmentFilter === 'all' || m.alignmentType === alignmentFilter)
        );
      } else {
        cellMappings = useCaseMappings.filter(
          (m) => m.controlId === control.id && m.instrumentId === inst.id
        );
      }
      cellsByInstrumentId[inst.id] = cellMappings;
      rowTotal += cellMappings.length;
    }

    if (rowTotal > 0 || (!q && alignmentFilter === 'all')) {
      rows.push({
        control,
        cellsByInstrumentId,
        rowTotal,
      });
    }
  }

  return rows;
}

/**
 * Generates a policy-grade Procurement & Readiness Checklist in Markdown
 * for a concrete AI use case.
 */
export function generateProcurementMarkdown(
  dataset: AtlasDataset,
  useCase: UseCase
): string {
  const brief = buildInteroperabilityBrief(dataset, {
    type: 'useCase',
    id: useCase.id,
  });

  const instMap = new Map(dataset.instruments.map((i) => [i.id, i]));
  const ctrlMap = new Map(dataset.controls.map((c) => [c.id, c]));

  const lines: string[] = [
    `# AI Governance Procurement & Interoperability Readiness Checklist`,
    ``,
    `**Use Case:** ${useCase.title}`,
    `**Sector:** ${useCase.sector} · **Risk Profile:** ${useCase.riskProfile}`,
    `**Atlas Dataset Version:** ${dataset.metadata.datasetVersion} (Generated ${new Date().toISOString().slice(0, 10)})`,
    ``,
    `> **Deployment Context:** ${useCase.deploymentContext}`,
    ``,
    `---`,
    ``,
    `## 1. Executive 80/20 Interoperability Summary`,
    ``,
    `- **Mapped Clause Citations:** ${brief.counts.total}`,
    `- **Interoperable Core (\`equivalent\`):** ${brief.counts.equivalent} mappings — *Comply Once, Verify Across*`,
    `- **Jurisdictional / Normative Deltas (\`delta\`):** ${brief.counts.delta} mappings — *Targeted Supplemental Obligations*`,
    `- **Interoperability Friction (\`friction\`):** ${brief.counts.friction} mappings — *Divergent Thresholds, Prohibitions, or Clashes*`,
    ``,
    `---`,
    ``,
    `## 2. Shared Core Verification Artifacts ("Comply Once, Verify Across")`,
    ``,
  ];

  for (const item of brief.coreControls) {
    if (item.coveredInstruments.length === 0) continue;
    const instNames = item.coveredInstruments.map((i) => i.shortName).join(', ');
    lines.push(`### [ ] ${item.control.title}`);
    lines.push(`- **Required Vendor/Deployer Artifact:** *${item.control.artifactName}*`);
    lines.push(`- **Verification Method:** ${item.control.verificationMethod}`);
    lines.push(`- **Satisfies Frameworks (${item.coveredInstruments.length}/${dataset.instruments.length}):** ${instNames}`);
    for (const eq of item.equivalentMappings) {
      const inst = instMap.get(eq.instrumentId);
      const deep = resolveDeepLinkUrl(eq);
      const excerptNote = eq.clauseExcerpt ? ` — *"${eq.clauseExcerpt}"*` : '';
      lines.push(
        `  - **${inst?.shortName ?? eq.instrumentId}** ([\`${eq.clauseCitation}\`](${deep.url})): ${eq.rationale}${excerptNote}`
      );
    }
    lines.push(``);
  }

  lines.push(`---`, ``, `## 3. Jurisdictional & Normative Deltas (Supplemental Requirements)`, ``);
  if (brief.deltaMappings.length === 0) {
    lines.push(`_No supplemental jurisdictional deltas recorded for this use case._`, ``);
  } else {
    for (const dm of brief.deltaMappings) {
      const inst = instMap.get(dm.instrumentId);
      const ctrl = ctrlMap.get(dm.controlId);
      const deep = resolveDeepLinkUrl(dm);
      const anchorLabel = deriveSectionAnchor(dm.clauseCitation, dm.sectionAnchor);
      const excerptNote = dm.clauseExcerpt ? ` — *"${dm.clauseExcerpt}"*` : '';
      lines.push(
        `- [ ] **${inst?.shortName ?? dm.instrumentId}** — *${ctrl?.title ?? dm.controlId}* (\`${dm.clauseCitation}\`): ${dm.rationale}${excerptNote} ([Jump to ${anchorLabel}](${deep.url}))`
      );
    }
    lines.push(``);
  }

  lines.push(`---`, ``, `## 4. Interoperability Friction & Legal Escalation Flags`, ``);
  if (brief.frictionMappings.length === 0) {
    lines.push(`_No regulatory friction flags recorded for this use case._`, ``);
  } else {
    for (const fm of brief.frictionMappings) {
      const inst = instMap.get(fm.instrumentId);
      const ctrl = ctrlMap.get(fm.controlId);
      const deep = resolveDeepLinkUrl(fm);
      const anchorLabel = deriveSectionAnchor(fm.clauseCitation, fm.sectionAnchor);
      const excerptNote = fm.clauseExcerpt ? ` — *"${fm.clauseExcerpt}"*` : '';
      lines.push(
        `- **FRICTION ALERT — ${inst?.shortName ?? fm.instrumentId}** / *${ctrl?.title ?? fm.controlId}* (\`${fm.clauseCitation}\`): ${fm.rationale}${excerptNote} ([Jump to ${anchorLabel}](${deep.url}))`
      );
    }
    lines.push(``);
  }

  return lines.join('\n');
}

/**
 * Exports a clean JSON snippet matching `src/data/atlas.json` structure
 * for a single Use Case and its verified InteropMapping edges.
 */
export function generateUseCaseJsonExport(
  dataset: AtlasDataset,
  useCase: UseCase
): string {
  const mappings = dataset.mappings.filter((m) => m.useCaseId === useCase.id);
  const cleanUseCase: UseCase = {
    id: useCase.id,
    title: useCase.title,
    sector: useCase.sector,
    summary: useCase.summary,
    deploymentContext: useCase.deploymentContext,
    riskProfile: useCase.riskProfile,
    primaryActors: useCase.primaryActors,
  };

  return JSON.stringify(
    {
      schemaVersion: dataset.metadata.schemaVersion,
      exportedAt: new Date().toISOString(),
      useCase: cleanUseCase,
      mappings,
    },
    null,
    2
  );
}

export interface InstrumentBreakdownItem {
  instrument: GovernanceInstrument;
  counts: AlignmentCounts;
  useCasesCovered: number;
  controlsCovered: number;
}

export interface PairwiseSharedContext {
  useCaseId: string;
  useCaseTitle: string;
  controlId: string;
  controlTitle: string;
  status: AlignmentType;
  mappingsA: InteropMapping[];
  mappingsB: InteropMapping[];
}

export interface PairwiseRegimeCell {
  instrumentAId: string;
  instrumentBId: string;
  isDiagonal: boolean;
  totalA: number;
  totalB: number;
  sharedContextsCount: number;
  equivalentSharedCount: number;
  deltaSharedCount: number;
  frictionSharedCount: number;
  sharedControlIds: string[];
  /** Percentage (0-100) of co-mapped `(useCaseId, controlId)` contexts where both regimes are jointly satisfied via equivalent controls without friction; `null` if no exact co-mapped context exists yet. */
  convergenceRate: number | null;
  contexts: PairwiseSharedContext[];
}

export interface PairwiseRegimeMatrix {
  instruments: GovernanceInstrument[];
  cellsByPair: Record<string, Record<string, PairwiseRegimeCell>>;
}

/**
 * Summarizes alignment proportions and institutional footprint per tracked instrument.
 */
export function computeInstrumentBreakdown(
  dataset: AtlasDataset
): InstrumentBreakdownItem[] {
  return dataset.instruments.map((instrument) => {
    const instMappings = dataset.mappings.filter(
      (m) => m.instrumentId === instrument.id
    );
    const useCasesCovered = new Set(instMappings.map((m) => m.useCaseId)).size;
    const controlsCovered = new Set(instMappings.map((m) => m.controlId)).size;
    return {
      instrument,
      counts: countAlignments(instMappings),
      useCasesCovered,
      controlsCovered,
    };
  });
}

/**
 * Computes an N x N pairwise convergence and friction matrix across all tracked
 * global AI governance instruments anchored on co-mapped `(useCaseId, controlId)` contexts.
 */
export function computePairwiseRegimeMatrix(
  dataset: AtlasDataset
): PairwiseRegimeMatrix {
  const ucTitleMap = new Map(dataset.useCases.map((u) => [u.id, u.title]));
  const ctrlTitleMap = new Map(dataset.controls.map((c) => [c.id, c.title]));

  // Index mappings per instrument -> (useCaseId::controlId -> InteropMapping[])
  const byInstContext = new Map<string, Map<string, InteropMapping[]>>();
  const controlsByInst = new Map<string, Set<string>>();
  const totalByInst = new Map<string, number>();

  for (const inst of dataset.instruments) {
    byInstContext.set(inst.id, new Map());
    controlsByInst.set(inst.id, new Set());
    totalByInst.set(inst.id, 0);
  }

  for (const m of dataset.mappings) {
    const ctxMap = byInstContext.get(m.instrumentId);
    const ctrlSet = controlsByInst.get(m.instrumentId);
    if (!ctxMap || !ctrlSet) continue;

    const ctxKey = `${m.useCaseId}::${m.controlId}`;
    const existing = ctxMap.get(ctxKey);
    if (existing) {
      existing.push(m);
    } else {
      ctxMap.set(ctxKey, [m]);
    }
    ctrlSet.add(m.controlId);
    totalByInst.set(m.instrumentId, (totalByInst.get(m.instrumentId) ?? 0) + 1);
  }

  const cellsByPair: Record<string, Record<string, PairwiseRegimeCell>> = {};

  for (const instA of dataset.instruments) {
    cellsByPair[instA.id] = {};
    const mapA = byInstContext.get(instA.id)!;
    const ctrlsA = controlsByInst.get(instA.id)!;
    const totalA = totalByInst.get(instA.id) ?? 0;

    for (const instB of dataset.instruments) {
      const mapB = byInstContext.get(instB.id)!;
      const ctrlsB = controlsByInst.get(instB.id)!;
      const totalB = totalByInst.get(instB.id) ?? 0;

      const sharedControlIds = Array.from(ctrlsA).filter((cid) => ctrlsB.has(cid));

      if (instA.id === instB.id) {
        const selfMappings = Array.from(mapA.values()).flat();
        const selfCounts = countAlignments(selfMappings);
        cellsByPair[instA.id][instB.id] = {
          instrumentAId: instA.id,
          instrumentBId: instB.id,
          isDiagonal: true,
          totalA,
          totalB,
          sharedContextsCount: mapA.size,
          equivalentSharedCount: selfCounts.equivalent,
          deltaSharedCount: selfCounts.delta,
          frictionSharedCount: selfCounts.friction,
          sharedControlIds,
          convergenceRate: 100,
          contexts: [],
        };
        continue;
      }

      let equivalentSharedCount = 0;
      let deltaSharedCount = 0;
      let frictionSharedCount = 0;
      const contexts: PairwiseSharedContext[] = [];

      for (const [ctxKey, mappingsA] of mapA.entries()) {
        const mappingsB = mapB.get(ctxKey);
        if (!mappingsB || mappingsB.length === 0) continue;

        const [useCaseId, controlId] = ctxKey.split('::');
        const combined = [...mappingsA, ...mappingsB];
        const hasFriction = combined.some((m) => m.alignmentType === 'friction');
        const hasEqA = mappingsA.some((m) => m.alignmentType === 'equivalent');
        const hasEqB = mappingsB.some((m) => m.alignmentType === 'equivalent');

        let status: AlignmentType;
        if (hasFriction) {
          status = 'friction';
          frictionSharedCount += 1;
        } else if (hasEqA && hasEqB) {
          status = 'equivalent';
          equivalentSharedCount += 1;
        } else {
          status = 'delta';
          deltaSharedCount += 1;
        }

        contexts.push({
          useCaseId,
          useCaseTitle: ucTitleMap.get(useCaseId) ?? useCaseId,
          controlId,
          controlTitle: ctrlTitleMap.get(controlId) ?? controlId,
          status,
          mappingsA,
          mappingsB,
        });
      }

      contexts.sort((a, b) => {
        const rank = (t: AlignmentType) => (t === 'friction' ? 0 : t === 'delta' ? 1 : 2);
        return rank(a.status) - rank(b.status);
      });

      const sharedContextsCount = contexts.length;
      const convergenceRate =
        sharedContextsCount > 0
          ? Math.round((equivalentSharedCount / sharedContextsCount) * 100)
          : null;

      cellsByPair[instA.id][instB.id] = {
        instrumentAId: instA.id,
        instrumentBId: instB.id,
        isDiagonal: false,
        totalA,
        totalB,
        sharedContextsCount,
        equivalentSharedCount,
        deltaSharedCount,
        frictionSharedCount,
        sharedControlIds,
        convergenceRate,
        contexts,
      };
    }
  }

  return {
    instruments: dataset.instruments,
    cellsByPair,
  };
}
