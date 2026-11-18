import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const ATLAS_JSON_PATH = path.resolve(__dirname, 'src/data/atlas.json');
const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
const FALLBACK_GEMINI_MODEL = 'gemini-3.8-flash';

function isModelNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /404|not found|not supported|unknown model|deprecated/i.test(msg);
}

function loadAtlasDataset() {
  const raw = fs.readFileSync(ATLAS_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please configure your Gemini API key in the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function slugifyId(text: string): string {
  return (
    'uc-sandbox-' +
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 36)
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Serve canonical Atlas dataset for external consumers & verification
  app.get('/api/atlas', (_req, res) => {
    try {
      const dataset = loadAtlasDataset();
      res.json(dataset);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load atlas.json';
      res.status(500).json({ error: message });
    }
  });

  // Live "Map a New Use Case" Sandbox endpoint using Gemini + Google Search grounding + Structured JSON
  app.post('/api/atlas/map-use-case', async (req, res) => {
    try {
      const scenarioRaw = typeof req.body?.scenario === 'string' ? req.body.scenario.trim() : '';
      const sectorHint = typeof req.body?.sector === 'string' ? req.body.sector.trim() : '';

      if (scenarioRaw.length < 10) {
        res.status(400).json({
          error: 'Please enter a concrete AI deployment scenario (at least 10 characters).',
        });
        return;
      }

      const dataset = loadAtlasDataset();
      const controlIds: string[] = dataset.controls.map((c: { id: string }) => c.id);
      const instrumentIds: string[] = dataset.instruments.map((i: { id: string }) => i.id);
      const instrumentUrlMap = new Map<string, string>(
        dataset.instruments.map((i: { id: string; officialUrl: string }) => [i.id, i.officialUrl])
      );

      const controlsCatalog = dataset.controls
        .map(
          (c: { id: string; title: string; artifactName: string }) =>
            `- ${c.id}: ${c.title} (Artifact: ${c.artifactName})`
        )
        .join('\n');

      const instrumentsCatalog = dataset.instruments
        .map(
          (i: { id: string; shortName: string; title: string; officialUrl: string }) =>
            `- ${i.id}: ${i.shortName} — ${i.title} (${i.officialUrl})`
        )
        .join('\n');

      const ai = getGenAIClient();
      const todayIso = new Date().toISOString().slice(0, 10);

      const systemInstruction = `You are an authoritative international AI governance legal and risk-engineering analyst building verified interoperability mappings for the Open Atlas of AI Governance Interoperability.
Analyze the concrete AI deployment scenario provided by the user across the Atlas's tracked Operational Controls and Global Governance Instruments.
Rules:
1. Anchor every mapping in exact, real articles, clauses, sections, or control identifiers (e.g., "EU AI Act Art. 14 & Annex III", "UNESCO Recommendation §62 & EIA §3.4", "ISO/IEC 42001 Control A.6.2.6", "NIST AI RMF MEASURE 2.11", "Singapore Agentic AI Framework §3.2", "AU Continental AI Strategy §3.1", "Brazil PL 2338 Art. 18 / Korea AI Basic Act Art. 34").
2. Generate between 10 and 16 high-precision mappings spanning at least 5 controls and at least 6 instruments, including:
   - "equivalent" (Comply Once, Verify Across shared core controls),
   - "delta" (unique jurisdictional or framework obligations),
   - "friction" (normative prohibitions, conflicting thresholds, or scope clashes).
3. Use ONLY the exact controlId and instrumentId values listed below.
4. Keep rationale concise (1-2 policy-grade operational sentences).

Tracked Operational Controls:
${controlsCatalog}

Tracked Governance Instruments:
${instrumentsCatalog}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Concise policy-grade title for the concrete AI use case (5-10 words).',
          },
          sector: {
            type: Type.STRING,
            description: 'Primary policy/industry sector (e.g., Climate & Emergency Management, Financial Inclusion).',
          },
          summary: {
            type: Type.STRING,
            description: '1-2 sentence concrete summary of what the AI system does in operation.',
          },
          deploymentContext: {
            type: Type.STRING,
            description: '1-2 sentence description of institutional deployers, decision stakes, and operational environment.',
          },
          riskProfile: {
            type: Type.STRING,
            description: 'Short risk classification label (3-5 words).',
          },
          primaryActors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-4 institutional and affected stakeholder groups.',
          },
          executiveSynthesis: {
            type: Type.STRING,
            description: '2-3 sentence 80/20 synthesis explaining where global frameworks converge on this scenario and the main delta or friction to watch.',
          },
          mappings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                controlId: {
                  type: Type.STRING,
                  enum: controlIds,
                },
                instrumentId: {
                  type: Type.STRING,
                  enum: instrumentIds,
                },
                alignmentType: {
                  type: Type.STRING,
                  enum: ['equivalent', 'delta', 'friction'],
                },
                clauseCitation: {
                  type: Type.STRING,
                  description: 'Exact real clause, article, section, or control ID.',
                },
                clauseExcerpt: {
                  type: Type.STRING,
                  description:
                    'Concise substantive summary or key normative requirement of the cited clause (1-2 sentences) for the in-app Clause Reader.',
                },
                sectionAnchor: {
                  type: Type.STRING,
                  description:
                    'Exact heading or search keyword inside the official document (e.g., "Article 10", "MEASURE 2.11", "Section 3.2").',
                },
                verificationSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2-3 concrete engineering or audit verification steps.',
                },
                rationale: {
                  type: Type.STRING,
                  description: 'Concise 1-2 sentence operational explanation.',
                },
                sourceUrl: {
                  type: Type.STRING,
                  description: 'Official public reference URL for the cited instrument.',
                },
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

      const userPrompt = `Map this concrete AI deployment scenario into the Atlas:\nScenario: "${scenarioRaw}"${
        sectorHint ? `\nSector Context: "${sectorHint}"` : ''
      }`;

      const requestConfig = {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema,
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: PRIMARY_GEMINI_MODEL,
          contents: userPrompt,
          config: requestConfig,
        });
      } catch (primaryErr) {
        if (!isModelNotFoundError(primaryErr) || PRIMARY_GEMINI_MODEL === FALLBACK_GEMINI_MODEL) {
          throw primaryErr;
        }
        response = await ai.models.generateContent({
          model: FALLBACK_GEMINI_MODEL,
          contents: userPrompt,
          config: requestConfig,
        });
      }

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty response while mapping the scenario.');
      }

      const parsed = JSON.parse(rawText);
      const useCaseId = `${slugifyId(parsed.title || scenarioRaw)}-${Date.now().toString(36).slice(-4)}`;

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const groundingSources: Array<{ title: string; uri: string }> = [];
      const seenUris = new Set<string>();

      for (const chunk of groundingChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (uri && !seenUris.has(uri)) {
          seenUris.add(uri);
          groundingSources.push({
            title: title || uri,
            uri,
          });
        }
      }

      const validControlSet = new Set(controlIds);
      const validInstrumentSet = new Set(instrumentIds);
      const dedupeKeySet = new Set<string>();

      const normalizedMappings = (Array.isArray(parsed.mappings) ? parsed.mappings : [])
        .filter(
          (m: Record<string, unknown>) =>
            typeof m.controlId === 'string' &&
            validControlSet.has(m.controlId) &&
            typeof m.instrumentId === 'string' &&
            validInstrumentSet.has(m.instrumentId) &&
            (m.alignmentType === 'equivalent' ||
              m.alignmentType === 'delta' ||
              m.alignmentType === 'friction')
        )
        .map((m: Record<string, unknown>, idx: number) => {
          const fallbackUrl =
            instrumentUrlMap.get(String(m.instrumentId)) ||
            'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics';
          const candidateUrl =
            typeof m.sourceUrl === 'string' && m.sourceUrl.startsWith('http')
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
        .filter((m: { controlId: string; instrumentId: string; alignmentType: string }) => {
          const key = `${m.controlId}::${m.instrumentId}::${m.alignmentType}`;
          if (dedupeKeySet.has(key)) return false;
          dedupeKeySet.add(key);
          return true;
        });

      const useCase = {
        id: useCaseId,
        title: String(parsed.title || scenarioRaw),
        sector: String(parsed.sector || sectorHint || 'Cross-Sector Deployment'),
        summary: String(parsed.summary || scenarioRaw),
        deploymentContext: String(parsed.deploymentContext || scenarioRaw),
        riskProfile: String(parsed.riskProfile || 'Context-Dependent AI Deployment'),
        primaryActors: Array.isArray(parsed.primaryActors)
          ? parsed.primaryActors.map(String).slice(0, 5)
          : ['System Deployer', 'Oversight Regulator', 'Affected Citizens'],
        isCustomSandbox: true,
      };

      res.json({
        useCase,
        mappings: normalizedMappings,
        executiveSynthesis: String(parsed.executiveSynthesis || ''),
        groundingSources,
      });
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'Unexpected error calling Gemini API.';
      const status =
        rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('API_KEY_INVALID')
          ? 403
          : rawMessage.includes('RESOURCE_EXHAUSTED')
            ? 429
            : rawMessage.includes('not configured')
              ? 503
              : 500;

      let userGuidance = rawMessage;
      if (status === 403 || status === 503) {
        userGuidance = `${rawMessage} Verify that a valid Gemini API key is configured in AI Studio under Settings > Secrets.`;
      } else if (status === 429) {
        userGuidance = `${rawMessage} Quota limit reached; consider selecting a billing-enabled API key in Settings > Secrets.`;
      }

      res.status(status).json({ error: userGuidance });
    }
  });

  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProdRuntime =
    process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE);

  if (isProdRuntime && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Open Atlas server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
