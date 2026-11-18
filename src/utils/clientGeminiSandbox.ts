import type { AtlasDataset, GroundingSource, InteropMapping, SandboxMappingResult, UseCase } from '../types/atlas';

const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CLIENT_MODELS = ['gemini-4-hydrogen', 'gemini-3.8-flash'];

function slugifySandboxId(text: string): string {
  return (
    'uc-sandbox-' +
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 34)
  );
}

async function callGeminiRest(
  apiKey: string,
  model: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown>; errorText: string }> {
  const res = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, data: {}, errorText: text };
  }

  try {
    return { ok: true, status: res.status, data: JSON.parse(text) as Record<string, unknown>, errorText: '' };
  } catch {
    return { ok: false, status: res.status, data: {}, errorText: 'Invalid JSON returned by Gemini REST API.' };
  }
}

async function generateWithFallback(
  apiKey: string,
  buildBody: () => Record<string, unknown>
): Promise<Record<string, unknown>> {
  let lastErr = 'Gemini API request failed.';

  for (const model of CLIENT_MODELS) {
    const attempt = await callGeminiRest(apiKey, model, buildBody());
    if (attempt.ok) {
      return attempt.data;
    }

    lastErr = `HTTP ${attempt.status} on ${model}: ${attempt.errorText.slice(0, 220)}`;
    if (attempt.status === 401 || attempt.status === 403) {
      throw new Error(`API key rejected (${attempt.status}). Verify your Google AI Studio key permissions.`);
    }
    // Continue to fallback model only if model unavailable / 404 / bad request on tool or model name
    if (attempt.status !== 404 && attempt.status !== 400) {
      throw new Error(lastErr);
    }
  }

  throw new Error(lastErr);
}

function extractResponseText(data: Record<string, unknown>): string {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = first?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  return parts
    .map((p) => (typeof (p as Record<string, unknown>)?.text === 'string' ? (p as Record<string, string>).text : ''))
    .join('')
    .trim();
}

function extractGroundingSources(data: Record<string, unknown>): GroundingSource[] {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const meta = first?.groundingMetadata as Record<string, unknown> | undefined;
  const chunks = Array.isArray(meta?.groundingChunks) ? meta.groundingChunks : [];

  const seen = new Set<string>();
  const out: GroundingSource[] = [];
  for (const chunk of chunks) {
    const web = (chunk as Record<string, unknown>)?.web as Record<string, unknown> | undefined;
    const uri = typeof web?.uri === 'string' ? web.uri : '';
    const title = typeof web?.title === 'string' ? web.title : uri;
    if (uri && !seen.has(uri) && !uri.includes('vertexaisearch.cloud.google.com')) {
      seen.add(uri);
      out.push({ title, uri });
    }
  }
  return out;
}

/**
 * Browser-native BYOK scenario synthesis calling the official Gemini REST API directly,
 * enabling live custom scenario mapping on static hosts (GitHub Pages / standalone HTML).
 */
export async function synthesizeScenarioClientSide({
  apiKey,
  scenario,
  sectorHint,
  dataset,
}: {
  apiKey: string;
  scenario: string;
  sectorHint?: string;
  dataset: AtlasDataset;
}): Promise<SandboxMappingResult> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Please paste a Google AI Studio Gemini API key first.');
  }

  const controlIds = dataset.controls.map((c) => c.id);
  const instrumentIds = dataset.instruments.map((i) => i.id);
  const instrumentUrlMap = new Map(dataset.instruments.map((i) => [i.id, i.officialUrl]));

  const controlsCatalog = dataset.controls
    .map((c) => `- ${c.id}: ${c.title} (Artifact: ${c.artifactName})`)
    .join('\n');
  const instrumentsCatalog = dataset.instruments
    .map((i) => `- ${i.id}: ${i.shortName} — ${i.title} (${i.officialUrl})`)
    .join('\n');

  // Step 1: Try Google Search-grounded discovery; gracefully degrade to model knowledge if search tool is disallowed on key
  let researchNotes = '';
  let groundingSources: GroundingSource[] = [];

  try {
    const step1Data = await generateWithFallback(trimmedKey, () => ({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Research real-world regulatory obligations, standards clauses, and governance conflicts for this concrete AI deployment scenario:\nScenario: "${scenario}"${
                sectorHint ? `\nSector: "${sectorHint}"` : ''
              }\nCite specific articles, sections, or control IDs across UNESCO, EU AI Act, ISO/IEC 42001, NIST AI RMF, Singapore Agentic AI Framework, ASEAN Guide, CoE CETS 225, AU Strategy, and Brazil/Korea AI statutes.`,
            },
          ],
        },
      ],
      tools: [{ google_search: {} }],
    }));
    researchNotes = extractResponseText(step1Data);
    groundingSources = extractGroundingSources(step1Data);
  } catch {
    researchNotes = `Analyze directly from verified statutory baselines across tracked governance instruments for scenario: ${scenario}`;
  }

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      sector: { type: 'STRING' },
      summary: { type: 'STRING' },
      deploymentContext: { type: 'STRING' },
      riskProfile: { type: 'STRING' },
      primaryActors: { type: 'ARRAY', items: { type: 'STRING' } },
      executiveSynthesis: { type: 'STRING' },
      mappings: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            controlId: { type: 'STRING', enum: controlIds },
            instrumentId: { type: 'STRING', enum: instrumentIds },
            alignmentType: { type: 'STRING', enum: ['equivalent', 'delta', 'friction'] },
            clauseCitation: { type: 'STRING' },
            clauseExcerpt: { type: 'STRING' },
            sectionAnchor: { type: 'STRING' },
            verificationSteps: { type: 'ARRAY', items: { type: 'STRING' } },
            rationale: { type: 'STRING' },
            sourceUrl: { type: 'STRING' },
          },
          required: [
            'controlId',
            'instrumentId',
            'alignmentType',
            'clauseCitation',
            'clauseExcerpt',
            'sectionAnchor',
            'verificationSteps',
            'rationale',
            'sourceUrl',
          ],
        },
      },
    },
    required: [
      'title',
      'sector',
      'summary',
      'deploymentContext',
      'riskProfile',
      'primaryActors',
      'executiveSynthesis',
      'mappings',
    ],
  };

  const step2Data = await generateWithFallback(trimmedKey, () => ({
    systemInstruction: {
      parts: [
        {
          text: `You are an international AI governance analyst building structured interoperability mappings.
Use ONLY exact controlId and instrumentId values listed below.
Generate 8 to 14 precise mappings covering equivalent, delta, and friction alignments.
For UNESCO, cite exact paragraphs of the 2021 UNESCO Recommendation on the Ethics of AI (e.g., 'UNESCO Recommendation §§50–53'); do not merge the 2021 Recommendation with UNESCO's separate 2023 Ethical Impact Assessment (EIA) implementation tool.

Controls:
${controlsCatalog}

Instruments:
${instrumentsCatalog}`,
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Scenario: "${scenario}"${
              sectorHint ? `\nSector Context: "${sectorHint}"` : ''
            }\n\nResearch Notes:\n${researchNotes}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  }));

  const rawJson = extractResponseText(step2Data);
  if (!rawJson) {
    throw new Error('Gemini returned an empty JSON response.');
  }

  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  const todayIso = new Date().toISOString().slice(0, 10);
  const useCaseId = `${slugifySandboxId(String(parsed.title || scenario))}-${Date.now()
    .toString(36)
    .slice(-4)}`;

  const validControls = new Set(controlIds);
  const validInstruments = new Set(instrumentIds);
  const dedupe = new Set<string>();

  const mappings: InteropMapping[] = (Array.isArray(parsed.mappings) ? parsed.mappings : [])
    .filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== 'object') return false;
      const m = item as Record<string, unknown>;
      return (
        typeof m.controlId === 'string' &&
        validControls.has(m.controlId) &&
        typeof m.instrumentId === 'string' &&
        validInstruments.has(m.instrumentId) &&
        (m.alignmentType === 'equivalent' ||
          m.alignmentType === 'delta' ||
          m.alignmentType === 'friction')
      );
    })
    .map((m, idx) => {
      const fallbackUrl =
        instrumentUrlMap.get(String(m.instrumentId)) ??
        'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics';
      const candidateUrl =
        typeof m.sourceUrl === 'string' &&
        m.sourceUrl.startsWith('https://') &&
        !m.sourceUrl.includes('vertexaisearch.cloud.google.com')
          ? m.sourceUrl
          : fallbackUrl;

      return {
        id: `map-${useCaseId}-${idx + 1}`,
        useCaseId,
        controlId: String(m.controlId),
        instrumentId: String(m.instrumentId),
        alignmentType: m.alignmentType as 'equivalent' | 'delta' | 'friction',
        clauseCitation: String(m.clauseCitation || '').trim(),
        clauseExcerpt: String(m.clauseExcerpt || m.rationale || '').trim(),
        sectionAnchor: String(m.sectionAnchor || '').trim() || undefined,
        verificationSteps: Array.isArray(m.verificationSteps)
          ? m.verificationSteps.map(String).slice(0, 4)
          : undefined,
        rationale: String(m.rationale || '').trim(),
        sourceUrl: candidateUrl,
        lastVerified: todayIso,
      };
    })
    .filter((m) => {
      const k = `${m.controlId}::${m.instrumentId}::${m.alignmentType}`;
      if (dedupe.has(k)) return false;
      dedupe.add(k);
      return true;
    });

  const useCase: UseCase = {
    id: useCaseId,
    title: String(parsed.title || scenario),
    sector: String(parsed.sector || sectorHint || 'Cross-Sector Deployment'),
    summary: String(parsed.summary || scenario),
    deploymentContext: String(parsed.deploymentContext || scenario),
    riskProfile: String(parsed.riskProfile || 'Context-Dependent AI Deployment'),
    primaryActors: Array.isArray(parsed.primaryActors)
      ? parsed.primaryActors.map(String).slice(0, 5)
      : ['System Deployer', 'Oversight Regulator', 'Affected Citizens'],
    isCustomSandbox: true,
  };

  return {
    useCase,
    mappings,
    executiveSynthesis: String(parsed.executiveSynthesis || ''),
    groundingSources,
  };
}
