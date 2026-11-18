import { ArrowUpRight, Compass, Download, Loader2, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import type { AtlasDataset, SandboxMappingResult } from '../types/atlas';
import { generateUseCaseJsonExport } from '../utils/atlasAnalytics';
import { triggerFileDownload } from './ExportPreviewModal';

interface UseCaseSandboxProps {
  dataset: AtlasDataset;
  sandboxResults: SandboxMappingResult[];
  onAddSandboxResult: (result: SandboxMappingResult) => void;
  onRemoveSandboxUseCase: (useCaseId: string) => void;
  onFocusUseCaseInFlow: (useCaseId: string) => void;
}

const EXAMPLE_SCENARIOS = [
  {
    label: 'Wildfire Evacuation Routing Agent',
    scenario:
      'Municipal wildfire evacuation routing agent integrating live satellite thermal imagery, traffic signal control APIs, and multilingual SMS emergency dispatch.',
    sector: 'Climate Resilience & Civil Protection',
  },
  {
    label: 'Kenya Microfinance Credit Scoring',
    scenario:
      'Alternative mobile-money and smallholder agricultural telemetry credit-scoring model used by microfinance lenders in Kenya for unbanked rural borrowers.',
    sector: 'Financial Inclusion & Lending',
  },
  {
    label: 'Customs Tariff & Cargo Triage AI',
    scenario:
      'Automated port customs tariff classification and contraband x-ray cargo risk scoring system flagging shipping containers for physical border inspection.',
    sector: 'Trade, Customs & Border Administration',
  },
];

export function UseCaseSandbox({
  dataset,
  sandboxResults,
  onAddSandboxResult,
  onRemoveSandboxUseCase,
  onFocusUseCaseInFlow,
}: UseCaseSandboxProps) {
  const [scenario, setScenario] = useState('');
  const [sector, setSector] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const trimmed = scenario.trim();
    if (trimmed.length < 10) {
      setValidationError(
        'Please describe a concrete AI deployment scenario (at least 10 characters) before running interoperability analysis.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/atlas/map-use-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: trimmed,
          sector: sector.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Request failed with HTTP ${response.status}`);
      }

      onAddSandboxResult(payload as SandboxMappingResult);
      setScenario('');
      setSector('');
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Unable to complete live scenario mapping. Please verify API configuration.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      id="use-case-sandbox"
      aria-labelledby="sandbox-section-heading"
      className="border-t border-slate-200 bg-[#F8FAFC] py-12"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input Form & Preset Scenarios */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
            <p className="text-xs font-mono text-slate-500">
              03. Live Regulatory Synthesis · Search-Grounded Structured Output
            </p>
            <h2
              id="sandbox-section-heading"
              className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1"
            >
              Map a New AI Use Case
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Enter any real-world or proposed AI deployment scenario. The server analyzes how the
              seven tracked governance instruments converge or clash, injects the mapped pathways
              directly into the topology above, and formats a downloadable JSON patch matching{' '}
              <code className="font-mono text-xs text-slate-800">src/data/atlas.json</code>.
            </p>

            {/* Quick-Fill Example Scenarios */}
            <div className="mt-5">
              <p className="text-xs font-medium text-slate-600 mb-2">
                Load an example deployment scenario:
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_SCENARIOS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setScenario(preset.scenario);
                      setSector(preset.sector);
                      setValidationError(null);
                      setApiError(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="sandbox-scenario-input"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Concrete AI Deployment Scenario <span className="text-rose-700">*</span>
                </label>
                <textarea
                  id="sandbox-scenario-input"
                  rows={4}
                  value={scenario}
                  onChange={(e) => {
                    setScenario(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g., Municipal wildfire evacuation routing agent integrating live satellite thermal feeds and automated traffic signal overrides..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="sandbox-sector-input"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Sector or Jurisdiction Context (Optional)
                </label>
                <input
                  id="sandbox-sector-input"
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="e.g., Emergency Management · Cross-Border Municipal Deployment"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-slate-900"
                />
              </div>

              {validationError && (
                <div
                  role="alert"
                  className="p-3 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-md"
                >
                  {validationError}
                </div>
              )}

              {apiError && (
                <div
                  role="alert"
                  className="p-3.5 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-md leading-relaxed"
                >
                  <p className="font-semibold">Live Grounded Mapping Error</p>
                  <p className="mt-1">{apiError}</p>
                </div>
              )}

              <div className="pt-1 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">
                  Outputs structured <code className="font-mono">InteropMapping[]</code> edges
                </span>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                      <span>Synthesizing Citations...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Analyze &amp; Map Scenario</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Mapped Sandbox Entries & Grounded Sources */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
            <div className="pb-4 border-b border-slate-200 flex items-baseline justify-between gap-4">
              <div>
                <h3 className="font-editorial text-xl font-medium text-slate-950">
                  Session Sandbox Mappings ({sandboxResults.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Newly mapped scenarios render immediately in the 3-column topology and matrix.
                </p>
              </div>
            </div>

            {isLoading && (
              <div
                aria-live="polite"
                className="py-8 border-b border-slate-200 space-y-3 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
                <p className="text-xs font-mono text-slate-500 pt-1">
                  Querying public regulatory texts &amp; verifying control alignments...
                </p>
              </div>
            )}

            {sandboxResults.length === 0 && !isLoading ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-slate-800">
                  No custom scenarios mapped in this session yet.
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Choose one of the preset scenarios on the left or describe your own AI system to
                  generate search-grounded clause mappings and a ready-to-commit{' '}
                  <code className="font-mono">atlas.json</code> patch.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {sandboxResults.map((res) => {
                  const eqCount = res.mappings.filter((m) => m.alignmentType === 'equivalent').length;
                  const dlCount = res.mappings.filter((m) => m.alignmentType === 'delta').length;
                  const frCount = res.mappings.filter((m) => m.alignmentType === 'friction').length;

                  const handleDownloadSnippet = () => {
                    const json = generateUseCaseJsonExport(dataset, res.useCase);
                    triggerFileDownload(
                      `${res.useCase.id}.atlas-patch.json`,
                      json,
                      'application/json;charset=utf-8'
                    );
                  };

                  return (
                    <article key={res.useCase.id} className="py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-mono text-slate-500 tabular-nums">
                            {res.useCase.sector} · {eqCount}E · {dlCount}D · {frCount}F
                          </p>
                          <h4 className="text-base font-semibold text-slate-950 mt-0.5">
                            {res.useCase.title}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveSandboxUseCase(res.useCase.id)}
                          aria-label={`Remove sandbox use case ${res.useCase.title}`}
                          className="p-1.5 text-slate-400 hover:text-rose-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>

                      {res.executiveSynthesis && (
                        <p className="mt-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {res.executiveSynthesis}
                        </p>
                      )}

                      {res.groundingSources.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-mono text-slate-500 mb-1">
                            Grounded Public Web Sources:
                          </p>
                          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {res.groundingSources.slice(0, 4).map((src) => (
                              <li key={src.uri}>
                                <a
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 underline underline-offset-4"
                                >
                                  <span className="truncate max-w-[220px]">{src.title}</span>
                                  <ArrowUpRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            onFocusUseCaseInFlow(res.useCase.id);
                            document
                              .getElementById('interoperability-flow')
                              ?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Inspect in 3-Column Flow
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadSnippet}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Download atlas.json Snippet</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
