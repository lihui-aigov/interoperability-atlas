import { ExternalLink, FileJson, FileText, Map as MapIcon, Rss } from 'lucide-react';
import { useMemo } from 'react';
import type { AtlasDataset } from '../types/atlas';
import { computePairwiseRegimeMatrix } from '../utils/atlasAnalytics';
import {
  buildCanonicalPairSlug,
  CANONICAL_BASE_URL,
  instrumentToSlug,
} from '../utils/seoSlugs';

interface CrawlableFooterDirectoryProps {
  dataset: AtlasDataset;
}

const FEATURED_COMPARE_IDS: [string, string][] = [
  ['inst-eu-ai-act', 'inst-nist-ai-rmf'],
  ['inst-eu-ai-act', 'inst-iso-42001'],
  ['inst-unesco-rec', 'inst-eu-ai-act'],
  ['inst-eu-ai-act', 'inst-br-kr-laws'],
  ['inst-unesco-rec', 'inst-nist-ai-rmf'],
  ['inst-iso-42001', 'inst-nist-ai-rmf'],
  ['inst-eu-ai-act', 'inst-coe-treaty'],
  ['inst-eu-ai-act', 'inst-sg-agentic'],
  ['inst-nist-ai-rmf', 'inst-sg-agentic'],
  ['inst-unesco-rec', 'inst-br-kr-laws'],
];

export function CrawlableFooterDirectory({ dataset }: CrawlableFooterDirectoryProps) {
  const instMap = useMemo(
    () => new Map(dataset.instruments.map((i) => [i.id, i])),
    [dataset.instruments]
  );

  const featuredPairs = useMemo(() => {
    const matrix = computePairwiseRegimeMatrix(dataset);
    const items: { slug: string; label: string; meta: string }[] = [];
    for (const [aId, bId] of FEATURED_COMPARE_IDS) {
      const a = instMap.get(aId);
      const b = instMap.get(bId);
      const cell = matrix.cellsByPair[aId]?.[bId];
      if (!a || !b || !cell || cell.sharedContextsCount === 0) continue;
      items.push({
        slug: buildCanonicalPairSlug(aId, bId, dataset.instruments),
        label: `${a.shortName} vs. ${b.shortName}`,
        meta: `${cell.convergenceRate ?? 0}%`,
      });
    }
    return items;
  }, [dataset, instMap]);

  const spotlights = dataset.spotlights ?? [];

  return (
    <section
      id="indexed-directory"
      aria-label="Indexed Governance Crosswalks and Reference Pages"
      className="border-t border-slate-200 bg-slate-50 py-10"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-5 border-b border-slate-200">
          <div>
            <h2 className="font-editorial text-lg sm:text-xl font-medium text-slate-950">
              Printable Reference Pages &amp; Open Data Feeds
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Static crawlable pages for search indexing, academic citation, and offline reading.
            </p>
          </div>
          <a
            href={`${CANONICAL_BASE_URL}directory.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-emerald-800 underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            <span>Browse Full Reference Directory</span>
            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          {/* Column 1: Popular Framework Comparisons */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2.5">
              Popular Framework Comparisons
            </h3>
            <ul className="space-y-1.5 text-slate-600">
              {featuredPairs.map((pair) => (
                <li key={pair.slug}>
                  <a
                    href={`${CANONICAL_BASE_URL}compare/${encodeURIComponent(pair.slug)}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-950 hover:underline underline-offset-2 inline-flex items-baseline justify-between gap-2 w-full"
                  >
                    <span className="truncate">{pair.label}</span>
                    <span className="font-mono text-[10.5px] text-emerald-800 shrink-0 tabular-nums">
                      {pair.meta}
                    </span>
                  </a>
                </li>
              ))}
              <li className="pt-1">
                <a
                  href={`${CANONICAL_BASE_URL}directory.html#compare-directory`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-900 hover:underline underline-offset-2"
                >
                  All pairwise comparisons &rarr;
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: AI Use-Case Checklists */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2.5">
              AI Use-Case Checklists ({dataset.useCases.length})
            </h3>
            <ul className="space-y-1.5 text-slate-600">
              {dataset.useCases
                .filter((u) => !u.isCustomSandbox)
                .map((uc) => (
                  <li key={uc.id}>
                    <a
                      href={`${CANONICAL_BASE_URL}use-cases/${encodeURIComponent(uc.id)}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-slate-950 hover:underline underline-offset-2 block truncate"
                    >
                      {uc.title}
                    </a>
                  </li>
                ))}
            </ul>
          </div>

          {/* Column 3: Tracked Regimes & Standards */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2.5">
              Tracked Regimes &amp; Standards ({dataset.instruments.length})
            </h3>
            <ul className="space-y-1.5 text-slate-600">
              {dataset.instruments.map((inst) => (
                <li key={inst.id}>
                  <a
                    href={`${CANONICAL_BASE_URL}instruments/${encodeURIComponent(
                      instrumentToSlug(inst.id)
                    )}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-950 hover:underline underline-offset-2 inline-flex items-baseline justify-between gap-2 w-full"
                  >
                    <span className="truncate">{inst.shortName}</span>
                    <span className="font-mono text-[10.5px] text-slate-400 shrink-0 tabular-nums">
                      {inst.adoptionYear}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Policy Briefings & Machine-Readable Feeds */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2.5">
              Policy Briefings &amp; Open Feeds
            </h3>
            <ul className="space-y-1.5 text-slate-600">
              {spotlights.map((s) => (
                <li key={s.id}>
                  <a
                    href={`${CANONICAL_BASE_URL}spotlights/${encodeURIComponent(s.id)}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-950 hover:underline underline-offset-2 block truncate"
                  >
                    {s.headline}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <a
                href={`${CANONICAL_BASE_URL}sitemap.xml`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 hover:underline"
              >
                <MapIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>sitemap.xml</span>
              </a>
              <a
                href={`${CANONICAL_BASE_URL}feed.xml`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 hover:underline"
              >
                <Rss className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>feed.xml</span>
              </a>
              <a
                href={`${CANONICAL_BASE_URL}llms.txt`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 hover:underline"
              >
                <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>llms.txt</span>
              </a>
              <a
                href={`${CANONICAL_BASE_URL}llms-full.txt`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 hover:underline"
              >
                <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>llms-full.txt</span>
              </a>
              <a
                href={`${CANONICAL_BASE_URL}atlas-dataset.json`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 hover:underline col-span-2"
              >
                <FileJson className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>atlas-dataset.json (CC-BY-4.0)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
