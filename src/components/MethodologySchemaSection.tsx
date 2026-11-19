import { Download, ExternalLink } from 'lucide-react';
import type { AtlasDataset } from '../types/atlas';
import type { FocusSelection } from '../utils/atlasAnalytics';
import { triggerFileDownload } from './ExportPreviewModal';

interface MethodologySchemaSectionProps {
  dataset: AtlasDataset;
  onSelectInstrument: (selection: FocusSelection) => void;
  onOpenUpdates: () => void;
}

const SAMPLE_EDGE_SCHEMA = `{
  "id": "map-wt-bias-eu",
  "useCaseId": "uc-welfare-triage",
  "controlId": "ctrl-bias-audit",
  "instrumentId": "inst-eu-ai-act",
  "alignmentType": "equivalent",
  "clauseCitation": "EU AI Act Art. 10(2)(f)-(g) & Annex III(5)(a)",
  "rationale": "Classifies public-assistance eligibility systems as high-risk...",
  "sourceUrl": "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
  "lastVerified": "2026-11-12"
}`;

export function MethodologySchemaSection({
  dataset,
  onSelectInstrument,
  onOpenUpdates,
}: MethodologySchemaSectionProps) {
  const handleDownloadFullAtlas = () => {
    triggerFileDownload(
      `open-atlas-v${dataset.metadata.datasetVersion}.json`,
      JSON.stringify(dataset, null, 2),
      'application/json;charset=utf-8'
    );
  };

  return (
    <section
      id="methodology-schema"
      aria-labelledby="methodology-heading"
      className="scroll-mt-16 border-t border-[var(--atlas-rule)] bg-white py-10"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Tracked Global & Regional Instruments */}
          <div className="lg:col-span-7">
            <h2
              id="methodology-heading"
              className="font-editorial text-[22px] sm:text-[26px] font-semibold text-[var(--atlas-ink)]"
            >
              Tracked Instruments &amp; Open Data Specification
            </h2>
            <p className="text-sm text-[var(--atlas-ink-secondary)] mt-2 max-w-[68ch] leading-[1.6]">
              Every edge in the Atlas is anchored on a three-part tuple (
              <code className="font-mono text-xs text-[var(--atlas-ink)]">
                useCaseId, controlId, instrumentId
              </code>
              ) rather than isolated abstract text similarity, ensuring procurement officers and
              engineers verify concrete operational artifacts against primary statutory text.
            </p>

            <div className="mt-6 divide-y divide-[var(--atlas-rule-subtle)] border-t border-b border-[var(--atlas-rule)]">
              {dataset.instruments.map((inst) => (
                <div
                  key={inst.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2"
                >
                  <div className="max-w-xl">
                    <button
                      type="button"
                      onClick={() => onSelectInstrument({ type: 'instrument', id: inst.id })}
                      className="font-sans text-sm font-semibold text-[var(--atlas-ink)] hover:text-[var(--atlas-accent)] hover:underline underline-offset-4 cursor-pointer text-left"
                    >
                      {inst.title}
                    </button>
                    <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                      {inst.issuingBody}, {inst.jurisdictionOrScope}, {inst.legalNature} (
                      <span className="tabular-nums">{inst.adoptionYear}</span>)
                    </p>
                  </div>

                  <a
                    href={inst.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--atlas-accent)] underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    <span>Official Text</span>
                    <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Decoupled GitHub Actions Ingestion Contract */}
          <div className="lg:col-span-5">
            <div className="bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px] p-6">
              <h3 className="font-editorial text-lg font-semibold text-[var(--atlas-ink)]">
                Decoupled Schema for Scheduled Verification
              </h3>
              <p className="text-xs text-[var(--atlas-ink-secondary)] mt-2 leading-relaxed">
                Domain records in{' '}
                <code className="font-mono text-[var(--atlas-ink)]">src/data/atlas.json</code> are
                decoupled from React components via{' '}
                <code className="font-mono text-[var(--atlas-ink)]">src/types/atlas.ts</code>.
                Scheduled workflows (
                <code className="font-mono text-[var(--atlas-ink)]">
                  {dataset.metadata.repositoryWorkflow}
                </code>
                ) check statutory amendments, validate foreign keys, and log entries into{' '}
                <code className="font-mono text-[var(--atlas-ink)]">metadata.recentUpdates</code>.
              </p>

              <pre className="mt-4 p-4 bg-[#1A1D23] text-[#F5F6F8] rounded-[2px] text-[11.5px] font-mono leading-relaxed overflow-x-auto">
                {SAMPLE_EDGE_SCHEMA}
              </pre>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadFullAtlas}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[var(--atlas-accent)] rounded-[2px] hover:bg-[var(--atlas-accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Download Full atlas.json</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenUpdates}
                  className="px-4 py-2 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] rounded-[2px] hover:bg-[var(--atlas-elevated)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Inspect Update Changelog
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
