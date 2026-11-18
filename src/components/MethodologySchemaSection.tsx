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
      className="scroll-mt-16 border-t border-slate-200 bg-white py-12"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Tracked Global & Regional Instruments */}
          <div className="lg:col-span-7">
            <p className="text-xs font-mono text-slate-500">
              04. Normative Corpus &amp; Automated Repository Architecture
            </p>
            <h2
              id="methodology-heading"
              className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1"
            >
              Tracked Instruments &amp; Open Data Specification
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              Every edge in the Atlas is anchored on a three-part tuple (
              <code className="font-mono text-xs text-slate-800">
                useCaseId &rarr; controlId &rarr; instrumentId
              </code>
              ) rather than isolated abstract text similarity, ensuring procurement officers and
              engineers verify concrete operational artifacts against authoritative statutory text.
            </p>

            <div className="mt-6 divide-y divide-slate-200 border-t border-b border-slate-200">
              {dataset.instruments.map((inst) => (
                <div
                  key={inst.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2"
                >
                  <div className="max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectInstrument({ type: 'instrument', id: inst.id });
                          document
                            .getElementById('interoperability-flow')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="font-sans text-sm font-semibold text-slate-900 hover:text-emerald-800 hover:underline underline-offset-4 cursor-pointer text-left"
                      >
                        {inst.title}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {inst.issuingBody} · {inst.jurisdictionOrScope} · {inst.legalNature} (
                      <span className="tabular-nums">{inst.adoptionYear}</span>)
                    </p>
                  </div>

                  <a
                    href={inst.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950 underline underline-offset-4 whitespace-nowrap shrink-0"
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
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <h3 className="font-editorial text-lg font-medium text-slate-950">
                Decoupled Schema for Scheduled GitHub Actions
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Domain records in <code className="font-mono text-slate-900">src/data/atlas.json</code>{' '}
                are strictly decoupled from React components via{' '}
                <code className="font-mono text-slate-900">src/types/atlas.ts</code>. Scheduled CI
                pipelines (<code className="font-mono text-slate-900">{dataset.metadata.repositoryWorkflow}</code>)
                validate statutory amendments, append verified <code className="font-mono text-slate-900">InteropMapping</code>{' '}
                records, and log entries into <code className="font-mono text-slate-900">metadata.recentUpdates</code>.
              </p>

              <pre className="mt-4 p-4 bg-slate-950 text-slate-100 rounded-md text-[11.5px] font-mono leading-relaxed overflow-x-auto">
                {SAMPLE_EDGE_SCHEMA}
              </pre>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadFullAtlas}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Download Full atlas.json</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenUpdates}
                  className="px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
