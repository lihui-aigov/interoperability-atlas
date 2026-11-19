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
      className="border-t border-[var(--atlas-rule)] bg-[var(--atlas-surface)] py-10"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-5 border-b border-[var(--atlas-rule)]">
          <div>
            <h2 className="font-editorial text-xl font-semibold text-[var(--atlas-ink)]">
              Printable Reference Pages &amp; Open Data Feeds
            </h2>
            <p className="text-xs text-[var(--atlas-ink-secondary)] mt-0.5">
              Static crawlable pages for search indexing, academic citation, and offline reading.
            </p>
          </div>
          <a
            href={`${CANONICAL_BASE_URL}directory.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--atlas-ink)] hover:text-[var(--atlas-accent)] underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            <span>Browse Full Reference Directory</span>
            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          {/* Column 1: Popular Framework Comparisons */}
          <div>
            <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)] mb-2.5">
              Popular Framework Comparisons
            </h3>
            <ul className="space-y-1.5">
              {featuredPairs.map((pair) => (
                <li key={pair.slug} className="flex items-baseline justify-between gap-2">
                  <a
                    href={`${CANONICAL_BASE_URL}compare/${encodeURIComponent(pair.slug)}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 truncate"
                  >
                    {pair.label}
                  </a>
                  <span className="font-mono text-[11px] tabular-nums text-[var(--atlas-ink-muted)] shrink-0">
                    {pair.meta}
                  </span>
                </li>
              ))}
              <li className="pt-1">
                <a
                  href={`${CANONICAL_BASE_URL}directory.html#compare-directory`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--atlas-accent)] font-medium hover:underline underline-offset-4"
                >
                  All pairwise comparisons
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Concrete AI Use-Case Checklists */}
          <div>
            <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)] mb-2.5">
              AI Use-Case Checklists ({dataset.useCases.length})
            </h3>
            <ul className="space-y-1.5">
              {dataset.useCases.map((uc) => (
                <li key={uc.id}>
                  <a
                    href={`${CANONICAL_BASE_URL}use-cases/${encodeURIComponent(uc.id)}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 block truncate"
                  >
                    {uc.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Tracked Global & Regional Instruments */}
          <div>
            <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)] mb-2.5">
              Tracked Frameworks ({dataset.instruments.length})
            </h3>
            <ul className="space-y-1.5">
              {dataset.instruments.map((inst) => (
                <li key={inst.id}>
                  <a
                    href={`${CANONICAL_BASE_URL}instruments/${encodeURIComponent(
                      instrumentToSlug(inst.id)
                    )}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 block truncate"
                  >
                    {inst.shortName} ({inst.adoptionYear})
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Policy Briefings & Machine-Readable Feeds */}
          <div className="space-y-5">
            <div>
              <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)] mb-2.5">
                In-the-News Policy Briefings ({spotlights.length})
              </h3>
              <ul className="space-y-1.5">
                {spotlights.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`${CANONICAL_BASE_URL}spotlights/${encodeURIComponent(s.id)}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 block truncate"
                    >
                      {s.headline}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)] mb-2">
                Open Data &amp; LLM Feeds
              </h3>
              <ul className="space-y-1.5 text-[var(--atlas-ink-secondary)]">
                <li>
                  <a
                    href={`${CANONICAL_BASE_URL}atlas-dataset.json`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--atlas-accent)] hover:underline underline-offset-4"
                  >
                    <FileJson className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>atlas-dataset.json (CC-BY-4.0)</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`${CANONICAL_BASE_URL}llms-full.txt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--atlas-accent)] hover:underline underline-offset-4"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>llms.txt &amp; llms-full.txt (AI Search Corpus)</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`${CANONICAL_BASE_URL}feed.xml`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--atlas-accent)] hover:underline underline-offset-4"
                  >
                    <Rss className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Atom Updates Feed (feed.xml)</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`${CANONICAL_BASE_URL}sitemap.xml`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--atlas-accent)] hover:underline underline-offset-4"
                  >
                    <MapIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>sitemap.xml</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
