import {
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Download,
  KeyRound,
  Loader2,
  Play,
  Trash2,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { SANDBOX_PRESETS, type SandboxPresetEntry } from '../data/sandboxPresets';
import type { AtlasDataset, SandboxMappingResult } from '../types/atlas';
import { generateUseCaseJsonExport } from '../utils/atlasAnalytics';
import { synthesizeScenarioClientSide } from '../utils/clientGeminiSandbox';
import { triggerFileDownload } from './ExportPreviewModal';

interface UseCaseSandboxProps {
  dataset: AtlasDataset;
  sandboxResults: SandboxMappingResult[];
  onAddSandboxResult: (result: SandboxMappingResult) => void;
  onRemoveSandboxUseCase: (useCaseId: string) => void;
  onFocusUseCaseInFlow: (useCaseId: string) => void;
}

const BYOK_STORAGE_KEY = 'open_atlas_byok_key_session';

export function UseCaseSandbox({
  dataset,
  sandboxResults,
  onAddSandboxResult,
  onRemoveSandboxUseCase,
  onFocusUseCaseInFlow,
}: UseCaseSandboxProps) {
  const [scenario, setScenario] = useState('');
  const [sector, setSector] = useState('');
  const [byokKey, setByokKey] = useState(() => {
    try {
      return sessionStorage.getItem(BYOK_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [showByokPanel, setShowByokPanel] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [staticModeHint, setStaticModeHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveByokKey = (nextVal: string) => {
    setByokKey(nextVal);
    try {
      if (nextVal.trim()) {
        sessionStorage.setItem(BYOK_STORAGE_KEY, nextVal.trim());
      } else {
        sessionStorage.removeItem(BYOK_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota issues cleanly
    }
  };

  const handleRunInstantPreset = (preset: SandboxPresetEntry) => {
    setValidationError(null);
    setApiError(null);
    setStaticModeHint(null);

    const existing = sandboxResults.find((r) => r.useCase.id === preset.result.useCase.id);
    if (existing) {
      onFocusUseCaseInFlow(existing.useCase.id);
      document
        .getElementById('interoperability-flow')
        ?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    onAddSandboxResult(preset.result);
    document
      .getElementById('interoperability-flow')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);
    setStaticModeHint(null);

    const trimmed = scenario.trim();
    if (trimmed.length < 10) {
      setValidationError(
        'Please describe a concrete AI deployment scenario (at least 10 characters) before running interoperability analysis.'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Mode A: Browser-native client-side synthesis if the user provided a BYOK key
      if (byokKey.trim().length > 8) {
        const result = await synthesizeScenarioClientSide({
          apiKey: byokKey,
          scenario: trimmed,
          sectorHint: sector.trim(),
          dataset,
        });
        onAddSandboxResult(result);
        setScenario('');
        setSector('');
        return;
      }

      // Mode B: Server-side synthesis when running on AI Studio / Cloud Run Express backend
      const response = await fetch('/api/atlas/map-use-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: trimmed,
          sector: sector.trim(),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (
        response.status === 404 ||
        response.status === 405 ||
        response.status === 501 ||
        response.status === 503 ||
        !contentType.includes('application/json')
      ) {
        setShowByokPanel(true);
        setStaticModeHint(
          'Static web edition detected (no live Node backend attached): paste a free Google AI Studio API key below to run custom Gemini synthesis directly in your browser, or launch any pre-verified simulation preset above with zero setup.'
        );
        return;
      }

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Request failed with HTTP ${response.status}`);
      }

      onAddSandboxResult(payload as SandboxMappingResult);
      setScenario('');
      setSector('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/failed to fetch|network|not configured|404/i.test(msg) && !byokKey.trim()) {
        setShowByokPanel(true);
        setStaticModeHint(
          'Static / offline web host detected: paste a personal Google AI Studio key below to run live synthesis in your browser, or run any instant simulation preset above.'
        );
      } else {
        setApiError(
          msg || 'Unable to complete live scenario mapping. Please check API key permissions.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      id="use-case-sandbox"
      aria-labelledby="sandbox-section-heading"
      className="border-t border-slate-200 bg-[#F7F8FA] py-12"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Instant Simulations + Custom Scenario Mapper */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
            <p className="text-xs font-mono text-slate-500">
              03. Triple-Mode Scenario Workbench · Instant Presets + Live AI Synthesis
            </p>
            <h2
              id="sandbox-section-heading"
              className="font-editorial text-2xl sm:text-3xl font-medium text-slate-950 mt-1"
            >
              Map a New AI Use Case
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Launch a pre-verified simulation preset immediately (works offline and on static
              hosting), or describe your own scenario to synthesize clause mappings across all{' '}
              {dataset.instruments.length} tracked governance instruments.
            </p>

            {/* Instant Pre-Verified Simulation Presets */}
            <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-md">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-semibold text-slate-900">
                  Instant Pre-Verified Simulations (Zero Key Required)
                </span>
                <span className="text-[11px] font-mono text-emerald-800">Offline Ready</span>
              </div>

              <div className="space-y-2">
                {SANDBOX_PRESETS.map((preset) => {
                  const isLoaded = sandboxResults.some(
                    (r) => r.useCase.id === preset.result.useCase.id
                  );
                  return (
                    <div
                      key={preset.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {preset.label}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {preset.sector} · {preset.result.mappings.length} cited clauses
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(preset.scenario);
                            setSector(preset.sector);
                            setValidationError(null);
                            setApiError(null);
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Edit Prompt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunInstantPreset(preset)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                            isLoaded
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-[#0B1220] text-white hover:bg-slate-800'
                          }`}
                        >
                          {isLoaded ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span>View in Flow</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span>Run Instant Demo</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Scenario Form */}
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="sandbox-scenario-input"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Custom AI Deployment Scenario <span className="text-rose-700">*</span>
                </label>
                <textarea
                  id="sandbox-scenario-input"
                  rows={3}
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

              {/* Collapsible Client-Side BYOK Key Configuration */}
              <div className="border border-slate-200 rounded-md bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowByokPanel((prev) => !prev)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-700 hover:text-slate-950 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span>
                      Browser-Only Gemini Key (Optional BYOK for Static / Offline Hosts)
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {byokKey.trim() ? 'Key Active (Session)' : showByokPanel ? 'Hide' : 'Configure'}
                  </span>
                </button>

                {showByokPanel && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200 space-y-2">
                    <input
                      id="sandbox-byok-key"
                      type="password"
                      value={byokKey}
                      onChange={(e) => handleSaveByokKey(e.target.value)}
                      placeholder="AIza... (kept strictly in browser sessionStorage; never persisted to repo)"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-slate-900"
                    />
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Requests route directly from your browser to Google Gemini REST API when a
                      key is set. Clear the field anytime to revert to server mode.
                    </p>
                  </div>
                )}
              </div>

              {staticModeHint && (
                <div
                  role="status"
                  className="p-3.5 text-xs text-amber-950 bg-amber-50 border border-amber-200 rounded-md leading-relaxed"
                >
                  {staticModeHint}
                </div>
              )}

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
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
            <div className="pb-4 border-b border-slate-200 flex items-baseline justify-between gap-4">
              <div>
                <h3 className="font-editorial text-xl font-medium text-slate-950">
                  Session Sandbox Mappings ({sandboxResults.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Loaded scenarios inject directly into the Alluvial Flow, Heatmap, and Matrix.
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
                  No sandbox scenarios loaded in this session yet.
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Click <span className="font-semibold text-slate-800">Run Instant Demo</span> on
                  any preset at left to watch the 3-column topology and matrix update immediately, or
                  enter a custom scenario below.
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
                            Grounded Public Reference Sources:
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
