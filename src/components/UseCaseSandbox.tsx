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
      return;
    }

    onAddSandboxResult(preset.result);
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

      // Mode B: Server-side synthesis when running on Cloud Run / Node Express backend
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
          'Static web edition detected (no live Node backend attached): paste a Google AI Studio API key below to run custom Gemini synthesis directly in your browser, or launch any pre-verified simulation preset above.'
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
          'Static or offline host detected: paste a personal Google AI Studio key below to run live synthesis in your browser, or run any instant simulation preset above.'
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
      className="scroll-mt-16 bg-[var(--atlas-ground)] pt-6 pb-10"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="pb-5 border-b border-[var(--atlas-rule)]">
          <h1
            id="sandbox-section-heading"
            className="font-editorial text-[26px] sm:text-[30px] font-semibold tracking-[-0.015em] leading-[1.2] text-[var(--atlas-ink)]"
          >
            Custom Scenario Sandbox &amp; Open Data
          </h1>
          <p className="text-sm text-[var(--atlas-ink-secondary)] mt-1 max-w-[68ch]">
            Launch a pre-verified offline simulation immediately, test your own AI deployment with a
            session Gemini key, or inspect the open dataset schema below.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Instant Simulations + Custom Scenario Mapper */}
          <div className="lg:col-span-6 space-y-6">
            {/* Instant Pre-Verified Simulation Presets */}
            <div className="p-5 bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-sans text-[13px] font-semibold text-[var(--atlas-ink)]">
                  Instant pre-verified simulations (no API key needed)
                </h2>
                <span className="text-[11px] font-mono text-[var(--align-equivalent-ink)]">
                  Offline ready
                </span>
              </div>

              <div className="divide-y divide-[var(--atlas-rule-subtle)] border-t border-[var(--atlas-rule-subtle)]">
                {SANDBOX_PRESETS.map((preset) => {
                  const isLoaded = sandboxResults.some(
                    (r) => r.useCase.id === preset.result.useCase.id
                  );
                  return (
                    <div
                      key={preset.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--atlas-ink)] truncate">
                          {preset.label}
                        </p>
                        <p className="text-[11px] text-[var(--atlas-ink-muted)] truncate">
                          {preset.sector}, {preset.result.mappings.length} cited clauses
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
                          className="px-2.5 py-1.5 text-[11px] font-medium text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-ink)] bg-white border border-[var(--atlas-rule)] hover:border-[var(--atlas-border-control)] rounded-[2px] transition-colors cursor-pointer"
                        >
                          Edit Prompt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunInstantPreset(preset)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-[2px] transition-colors whitespace-nowrap cursor-pointer ${
                            isLoaded
                              ? 'bg-[var(--align-equivalent-tint)] text-[var(--align-equivalent-ink)] border border-[var(--align-equivalent-rule)]'
                              : 'bg-[var(--atlas-accent)] text-white hover:bg-[var(--atlas-accent-hover)]'
                          }`}
                        >
                          {isLoaded ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span>Open Checklist</span>
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
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="sandbox-scenario-input"
                  className="block text-xs font-medium text-[var(--atlas-ink)] mb-1.5"
                >
                  Custom AI Deployment Scenario{' '}
                  <span className="text-[var(--align-friction-ink)]">*</span>
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
                  className="w-full px-3.5 py-2 text-base sm:text-sm bg-white border border-[var(--atlas-border-control)] rounded-[2px] text-[var(--atlas-ink)] placeholder:text-[var(--atlas-ink-muted)] focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="sandbox-sector-input"
                  className="block text-xs font-medium text-[var(--atlas-ink)] mb-1.5"
                >
                  Sector or Jurisdiction Context (Optional)
                </label>
                <input
                  id="sandbox-sector-input"
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="e.g., Emergency Management, Cross-Border Municipal Deployment"
                  className="w-full px-3.5 py-2 text-base sm:text-sm bg-white border border-[var(--atlas-border-control)] rounded-[2px] text-[var(--atlas-ink)] placeholder:text-[var(--atlas-ink-muted)] focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
                />
              </div>

              {/* Collapsible Client-Side BYOK Key Configuration */}
              <div className="border border-[var(--atlas-rule)] rounded-[2px] bg-[var(--atlas-surface)]">
                <button
                  type="button"
                  onClick={() => setShowByokPanel((prev) => !prev)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-ink)] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[var(--atlas-ink-muted)]" aria-hidden="true" />
                    <span>
                      Browser-Only Gemini Key (Optional BYOK for Static or Offline Hosts)
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-[var(--atlas-ink-muted)]">
                    {byokKey.trim() ? 'Key Active' : showByokPanel ? 'Hide' : 'Configure'}
                  </span>
                </button>

                {showByokPanel && (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-[var(--atlas-rule)] space-y-2">
                    <input
                      id="sandbox-byok-key"
                      type="password"
                      value={byokKey}
                      onChange={(e) => handleSaveByokKey(e.target.value)}
                      placeholder="AIza... (kept strictly in browser sessionStorage; never persisted)"
                      className="w-full px-3 py-1.5 text-base sm:text-xs font-mono bg-white border border-[var(--atlas-border-control)] rounded-[2px] text-[var(--atlas-ink)] placeholder:text-[var(--atlas-ink-muted)] focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
                    />
                    <p className="text-[11px] text-[var(--atlas-ink-secondary)] leading-snug">
                      Requests route directly from your browser to Google Gemini REST API when a
                      key is set. Clear the field anytime to revert to server mode.
                    </p>
                  </div>
                )}
              </div>

              {staticModeHint && (
                <div
                  role="status"
                  className="p-3.5 text-xs text-[var(--align-delta-ink)] bg-[var(--align-delta-tint)] border border-[var(--align-delta-rule)] rounded-[2px] leading-relaxed"
                >
                  {staticModeHint}
                </div>
              )}

              {validationError && (
                <div
                  role="alert"
                  className="p-3 text-xs text-[var(--align-friction-ink)] bg-[var(--align-friction-tint)] border border-[var(--align-friction-rule)] rounded-[2px]"
                >
                  {validationError}
                </div>
              )}

              {apiError && (
                <div
                  role="alert"
                  className="p-3.5 text-xs text-[var(--align-friction-ink)] bg-[var(--align-friction-tint)] border border-[var(--align-friction-rule)] rounded-[2px] leading-relaxed"
                >
                  <p className="font-semibold">Live Grounded Mapping Error</p>
                  <p className="mt-1">{apiError}</p>
                </div>
              )}

              <div className="pt-1 flex items-center justify-between gap-4">
                <span className="text-xs text-[var(--atlas-ink-muted)]">
                  Outputs structured <code className="font-mono">InteropMapping[]</code> records
                </span>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[var(--atlas-accent)] rounded-[2px] hover:bg-[var(--atlas-accent-hover)] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          <div className="lg:col-span-6 border border-[var(--atlas-rule)] rounded-[2px] p-5 sm:p-6 bg-white">
            <div className="pb-4 border-b border-[var(--atlas-rule)]">
              <h2 className="font-editorial text-xl font-semibold text-[var(--atlas-ink)]">
                Session Sandbox Mappings ({sandboxResults.length})
              </h2>
              <p className="text-xs text-[var(--atlas-ink-secondary)] mt-0.5">
                Loaded scenarios feed directly into the compliance table and 3-column pathway map.
              </p>
            </div>

            {isLoading && (
              <div
                aria-live="polite"
                className="py-8 border-b border-[var(--atlas-rule)] space-y-3 animate-pulse"
              >
                <div className="h-4 bg-[var(--atlas-elevated)] rounded-[2px] w-2/3" />
                <div className="h-3 bg-[var(--atlas-surface)] rounded-[2px] w-full" />
                <div className="h-3 bg-[var(--atlas-surface)] rounded-[2px] w-5/6" />
                <p className="text-xs font-mono text-[var(--atlas-ink-muted)] pt-1">
                  Querying public regulatory texts &amp; verifying control alignments...
                </p>
              </div>
            )}

            {sandboxResults.length === 0 && !isLoading ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-[var(--atlas-ink)]">
                  No sandbox scenarios loaded in this session yet.
                </p>
                <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1 max-w-md mx-auto leading-relaxed">
                  Click <span className="font-semibold text-[var(--atlas-ink)]">Run Instant Demo</span> on
                  any preset at left to generate a live checklist, or describe a custom AI deployment.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--atlas-rule-subtle)]">
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
                          <p className="text-xs font-mono text-[var(--atlas-ink-muted)] tabular-nums">
                            {res.useCase.sector}, {eqCount} once, {dlCount} extra, {frCount} clash
                          </p>
                          <h3 className="font-sans text-base font-semibold text-[var(--atlas-ink)] mt-0.5">
                            {res.useCase.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveSandboxUseCase(res.useCase.id)}
                          aria-label={`Remove sandbox use case ${res.useCase.title}`}
                          className="p-1.5 text-[var(--atlas-ink-muted)] hover:text-[var(--align-friction-ink)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>

                      {res.executiveSynthesis && (
                        <p className="mt-2 text-xs sm:text-sm text-[var(--atlas-ink-secondary)] leading-relaxed max-w-[68ch]">
                          {res.executiveSynthesis}
                        </p>
                      )}

                      {res.groundingSources.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-mono text-[var(--atlas-ink-muted)] mb-1">
                            Grounded public reference sources:
                          </p>
                          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {res.groundingSources.slice(0, 4).map((src) => (
                              <li key={src.uri}>
                                <a
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[var(--atlas-accent)] underline underline-offset-4"
                                >
                                  <span className="truncate max-w-[220px]">{src.title}</span>
                                  <ArrowUpRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onFocusUseCaseInFlow(res.useCase.id)}
                          className="px-3.5 py-1.5 text-xs font-medium text-white bg-[var(--atlas-accent)] rounded-[2px] hover:bg-[var(--atlas-accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Open Compliance Checklist
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadSnippet}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
