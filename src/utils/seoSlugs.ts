import type { GovernanceInstrument } from '../types/atlas';
import type { PairwiseRegimeCell } from './atlasAnalytics';

export const CANONICAL_BASE_URL =
  'https://lihui-aigov.github.io/interoperability-atlas/';

export const INSTRUMENT_SLUG_MAP: Record<string, string> = {
  'inst-eu-ai-act': 'eu-ai-act',
  'inst-nist-ai-rmf': 'nist-ai-rmf',
  'inst-iso-42001': 'iso-42001',
  'inst-unesco-rec': 'unesco-ai-ethics',
  'inst-unesco-eia': 'unesco-ai-ethics',
  'inst-sg-agentic': 'singapore-agentic-ai',
  'inst-coe-treaty': 'coe-ai-convention',
  'inst-br-kr-laws': 'brazil-korea-ai-laws',
  'inst-asean-guide': 'asean-ai-guide',
  'inst-au-strategy': 'african-union-ai-strategy',
};

export function instrumentToSlug(id: string): string {
  if (INSTRUMENT_SLUG_MAP[id]) return INSTRUMENT_SLUG_MAP[id];
  return id
    .replace(/^inst-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function slugToInstrumentId(
  slug: string,
  instruments: GovernanceInstrument[]
): string | undefined {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return undefined;
  const resolvedSlug =
    normalized === 'inst-unesco-eia' ? 'unesco-ai-ethics' : normalized;
  return instruments.find(
    (inst) =>
      instrumentToSlug(inst.id) === resolvedSlug ||
      inst.id.toLowerCase() === resolvedSlug
  )?.id;
}

export function buildPairSlug(aId: string, bId: string): string {
  return `${instrumentToSlug(aId)}-vs-${instrumentToSlug(bId)}`;
}

/**
 * Returns the canonical static filename slug matching `dataset.instruments` index order
 * so generated `/compare/<slugA>-vs-<slugB>.html` links stay stable regardless of UI swap state.
 */
export function buildCanonicalPairSlug(
  aId: string,
  bId: string,
  instruments: GovernanceInstrument[]
): string {
  const idxA = instruments.findIndex((i) => i.id === aId);
  const idxB = instruments.findIndex((i) => i.id === bId);
  if (idxA !== -1 && idxB !== -1 && idxB < idxA) {
    return buildPairSlug(bId, aId);
  }
  return buildPairSlug(aId, bId);
}

export function parsePairSlug(
  pairSlug: string,
  instruments: GovernanceInstrument[]
): { aId: string; bId: string } | null {
  const cleaned = pairSlug.trim().toLowerCase();
  const sepIndex = cleaned.indexOf('-vs-');
  if (sepIndex <= 0) return null;

  const slugA = cleaned.slice(0, sepIndex);
  const slugB = cleaned.slice(sepIndex + 4);
  const aId = slugToInstrumentId(slugA, instruments);
  const bId = slugToInstrumentId(slugB, instruments);

  if (!aId || !bId || aId === bId) return null;
  return { aId, bId };
}

export interface PlainPairwiseVerdict {
  headline: string;
  summary: string;
  actionAdvice: string;
}

export function buildPlainPairwiseVerdict(
  instA: GovernanceInstrument,
  instB: GovernanceInstrument,
  cell: PairwiseRegimeCell
): PlainPairwiseVerdict {
  if (cell.sharedContextsCount === 0) {
    const themeCount = cell.sharedControlIds.length;
    return {
      headline: `${instA.shortName} and ${instB.shortName} currently map to separate AI deployments in this dataset`,
      summary:
        themeCount > 0
          ? `These two frameworks address ${themeCount} related governance themes (such as human oversight or impact assessment), yet do not share directly co-mapped deployment contexts here.`
          : `No directly co-mapped use-case controls currently link ${instA.shortName} and ${instB.shortName} in this snapshot.`,
      actionAdvice:
        'Try pairing either framework with EU AI Act, UNESCO AI Ethics Recommendation, NIST AI RMF 1.0, or ISO/IEC 42001, or inspect an individual AI use case in Tab 3.',
    };
  }

  const rate = cell.convergenceRate ?? 0;
  const total = cell.sharedContextsCount;
  const eq = cell.equivalentSharedCount;
  const dl = cell.deltaSharedCount;
  const fr = cell.frictionSharedCount;

  const headline = `${rate}% shared compliance baseline across ${total} co-mapped ${
    total === 1 ? 'control' : 'controls'
  } (${eq} of ${total} satisfy both regimes once)`;

  const parts: string[] = [
    `Across the ${total} deployment controls where both ${instA.shortName} and ${instB.shortName} apply, ${eq} can be satisfied once using the same verification evidence.`,
  ];

  if (dl > 0) {
    parts.push(
      `${dl} ${dl === 1 ? 'control requires' : 'controls require'} an extra local filing, public notice, or regional threshold.`
    );
  }
  if (fr > 0) {
    parts.push(
      `${fr} ${fr === 1 ? 'control triggers' : 'controls trigger'} a direct legal clash that technical documentation alone cannot resolve.`
    );
  }

  let actionAdvice: string;
  if (fr > 0) {
    actionAdvice =
      'Legal review required: address the direct rule clashes in Column 3 first, reuse the shared baseline controls in Column 1 across both audits, and attach the extra local filings from Column 2.';
  } else if (dl > 0) {
    actionAdvice =
      'Strong operational overlap with targeted gaps: build one reusable evidence pack for the Comply Once controls in Column 1, then supplement it with the local filings listed in Column 2.';
  } else {
    actionAdvice =
      'Full baseline alignment across co-mapped deployments: one structured verification artifact package covers every overlapping requirement recorded here.';
  }

  return {
    headline,
    summary: parts.join(' '),
    actionAdvice,
  };
}
