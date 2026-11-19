# Open Atlas of AI Governance Interoperability

> **Live Web Application (No GitHub, Installation, or Login Required)**
>
> **[Open Interactive Observatory: https://lihui-aigov.github.io/interoperability-atlas/](https://lihui-aigov.github.io/interoperability-atlas/)**
>
> Read live AI governance policy briefings, check side-by-side overlap between 9 global instruments, audit use-case compliance duties, and download verified primary clauses and procurement checklists directly in any browser.

[![CI, Standalone Bundle & Visual Audit](https://github.com/lihui-aigov/interoperability-atlas/actions/workflows/ci-verify-and-deploy.yml/badge.svg)](https://github.com/lihui-aigov/interoperability-atlas/actions/workflows/ci-verify-and-deploy.yml)
[![Autonomous Governance Atlas Curator](https://github.com/lihui-aigov/interoperability-atlas/actions/workflows/autonomous-curator.yml/badge.svg)](https://github.com/lihui-aigov/interoperability-atlas/actions/workflows/autonomous-curator.yml)

---

## Why This Exists (Personal Origin and Institutional Neutrality)

I started this project for practical day-to-day use while following fast-moving AI governance news and regulatory debates across jurisdictions. Whenever a new enforcement action, agentic AI deployment, or public procurement controversy appeared, I wanted a fast way to check what existing global instruments actually require on the ground, where regimes share operational controls, and where cross-border interoperability breaks down. Existing trackers mostly list legal documents side by side without connecting them to real deployments or engineering artifacts, so I built this tool for myself and opened it for anyone facing the same questions.

Lihui Xu ([@lihui-aigov](https://github.com/lihui-aigov)) maintains this repository independently in a personal capacity. Every mapping, commentary point, and verification step draws exclusively from publicly enacted statutes, multilateral recommendations, official guidelines, and published standards. Nothing in this codebase or dataset represents official positions of UNESCO or any Member State.

---

## Direct Reference Guides and Headline Crosswalks

The live observatory publishes over 60 static HTML and Markdown reference pages indexed for search engines and AI research assistants (`llms.txt` and `llms-full.txt`):

| Policy Question or Framework Pair | Direct Reference Page | Plain Markdown / Feed |
| :--- | :--- | :--- |
| Which controls satisfy EU AI Act, NIST RMF, ISO 42001 & UNESCO at once? | [Comply Once Global AI Baseline](https://lihui-aigov.github.io/interoperability-atlas/guides/comply-once-global-ai-baseline.html) | [Markdown](https://lihui-aigov.github.io/interoperability-atlas/guides/comply-once-global-ai-baseline.md) |
| Where do global AI laws directly clash or contradict each other? | [Global AI Law Clashes & Prohibitions](https://lihui-aigov.github.io/interoperability-atlas/guides/global-ai-law-clashes-and-prohibitions.html) | [Markdown](https://lihui-aigov.github.io/interoperability-atlas/guides/global-ai-law-clashes-and-prohibitions.md) |
| How does UNESCO Ethics of AI compare with EU AI Act, CoE CETS 225 & BR/KR laws? | [UNESCO Recommendation vs. Binding Laws](https://lihui-aigov.github.io/interoperability-atlas/guides/unesco-ai-ethics-vs-binding-ai-laws.html) | [Markdown](https://lihui-aigov.github.io/interoperability-atlas/guides/unesco-ai-ethics-vs-binding-ai-laws.md) |
| How do EU AI Act, Singapore Agentic Framework & NIST govern autonomous agents? | [Agentic AI Governance Crosswalk](https://lihui-aigov.github.io/interoperability-atlas/guides/agentic-ai-governance-crosswalk.html) | [Markdown](https://lihui-aigov.github.io/interoperability-atlas/guides/agentic-ai-governance-crosswalk.md) |
| What clauses and artifacts belong in public-sector AI procurement RFPs? | [Public-Sector AI Procurement Checklist](https://lihui-aigov.github.io/interoperability-atlas/guides/public-sector-ai-procurement-checklist.html) | [Markdown](https://lihui-aigov.github.io/interoperability-atlas/guides/public-sector-ai-procurement-checklist.md) |
| How do incident clocks, audit logs, and citizen redress rights compare? | [Incident Clocks & Redress Comparison](https://lihui-aigov.github.io/interoperability-atlas/guides/ai-incident-reporting-and-redress-comparison.html) | [Markdown](https://lihui-aigov.github.io/interoperability-atlas/guides/ai-incident-reporting-and-redress-comparison.md) |
| Head-to-head: EU AI Act vs. NIST AI RMF 1.0 (78% overlap) | [Compare EU AI Act vs. NIST RMF](https://lihui-aigov.github.io/interoperability-atlas/compare/eu-ai-act-vs-nist-ai-rmf.html) | [llms.txt](https://lihui-aigov.github.io/interoperability-atlas/llms.txt) |
| Head-to-head: EU AI Act vs. Brazil PL 2338 & Korea AI Act (40% overlap, 3 clashes) | [Compare EU AI Act vs. Brazil / Korea](https://lihui-aigov.github.io/interoperability-atlas/compare/eu-ai-act-vs-brazil-korea-ai-laws.html) | [llms-full.txt](https://lihui-aigov.github.io/interoperability-atlas/llms-full.txt) |

---

## Methodological Thesis: Anchoring Crosswalks in Concrete Deployments

Conventional regulatory crosswalks compare legal instruments side by side in the abstract. That approach helps scholars spot textual overlap, yet it leaves policymakers, procurement officers, and engineering teams guessing on Monday morning when they need evidence-backed arguments for a specific news event or live system procurement.

Every record in this Atlas instead anchors on a three-part operational tuple linking a concrete AI deployment (`useCaseId`) to an observable verification artifact (`controlId`) and an authoritative provision (`instrumentId`). Each edge classifies the cross-regime relationship into one of three categories:

| Alignment Class | Operational meaning | Action required by policy and engineering teams |
| :--- | :--- | :--- |
| **Comply Once** (`equivalent`) | Shared operational control satisfies multiple governance instruments concurrently. | Build and audit one canonical verification artifact across jurisdictions. |
| **Extra Local Step** (`delta`) | Supplemental statutory filing, local cohort check, or threshold beyond baseline standards. | Layer targeted procedural documentation onto the shared baseline control. |
| **Direct Rule Clash** (`friction`) | Conflicting statutory prohibition, disclosure timing clash, or irreconcilable data duty. | Escalate to legal and policy counsel for architectural fencing or scope carve-out. |

As of dataset version 2026.11.7 (updated 2026-11-19), `src/data/atlas.json` tracks 4 real-world news briefings, 12 concrete AI use cases, 8 operational controls, 9 global and regional instruments, and 124 verified clause-level mappings.

---

## Tracked Governance Corpus (9 Instruments)

| Instrument | Scope / Jurisdiction | Legal Nature | Adoption | Primary Authoritative Reference |
| :--- | :--- | :--- | :---: | :--- |
| UNESCO Recommendation on the Ethics of AI | Global Multilateral | Multilateral Norm | 2021 | [UNESCO Portal](https://www.unesco.org/en/artificial-intelligence/recommendation-ethics) |
| EU Artificial Intelligence Act (Reg. 2024/1689) | European Union | Binding Regulation | 2024 | [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) |
| Council of Europe Framework Convention on AI (CETS No. 225) | International Treaty | Binding Regulation | 2024 | [Council of Europe](https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence) |
| ISO/IEC 42001 AI Management System Standard | International Standard | Certifiable Standard | 2023 | [ISO 81230](https://www.iso.org/standard/81230.html) |
| NIST AI Risk Management Framework (AI RMF 1.0) | United States / Global Benchmark | Voluntary Risk Framework | 2023 | [NIST](https://www.nist.gov/itl/ai-risk-management-framework) |
| Singapore IMDA Model AI Governance Framework for Agentic AI | Singapore / ASEAN Reference | Voluntary Risk Framework | 2025 | [IMDA Singapore](https://www.imda.gov.sg/about-imda/emerging-technologies/artificial-intelligence) |
| ASEAN Guide on AI Governance and Ethics | Southeast Asia Regional (10 Member States) | Voluntary Risk Framework | 2024 | [ASEAN](https://asean.org/wp-content/uploads/2024/02/ASEAN-Guide-on-AI-Governance-and-Ethics_beautified_201224_v2.pdf) |
| African Union Continental Artificial Intelligence Strategy | Pan-African Continental | Continental Strategy | 2024 | [African Union](https://au.int/en/documents/20240809/continental-artificial-intelligence-strategy) |
| Brazil AI Bill (PL 2338/2023) & South Korea AI Basic Act | Major G20 Statutory Regimes | Binding Regulation | 2025 | [Senado Federal](https://www25.senado.leg.br/web/atividade/materias/-/materia/157233) |

> **Normative Texts vs. Implementation Tools:** The instruments table tracks formal normative texts, binding statutes, and consensus standards. Operational assessment tools built on top of those texts, including UNESCO's 2023 Ethical Impact Assessment (EIA) methodology implementing Policy Action Area 1 (`§§50–53`) of the 2021 Recommendation, belong to the Operational Controls and Verification Artifacts layer rather than being merged into the 2021 normative instrument.

---

## Four Task-First Views Inside the Web Application

1. **News Briefings:** Translates current AI deployments and enforcement actions into cite-ready policy arguments, five regional legal lenses (`Global Multilateral`, `European Union`, `APAC & ASEAN`, `Africa & Latin America`, `US Patchwork & Standards`), interoperability bottlenecks, and engineering controls directly on screen one.
2. **Compare Frameworks:** Pairs any two instruments with one-click Quick Pairs, plain-language baseline overlap metrics, a hairline three-column breakdown (`Comply Once`, `Extra Local Steps`, `Direct Rule Clashes`), and the full 9-by-9 convergence matrix.
3. **Use-Case Checklists:** Presents a scrollable compliance crosswalk for 12 concrete AI systems with an inline slide-over Clause Reader, verification steps, Markdown/JSON procurement exports, and an optional three-column interactive pathway topology.
4. **Sandbox & Data:** Launches pre-verified offline simulations with zero setup, supports optional browser-only Gemini synthesis (`BYOK`) or server-side analysis, documents the `src/types/atlas.ts` ingestion schema, and provides full JSON downloads.

---

## Autonomous Curation, Verification and Publishing Pipeline

Scheduled workflows under `.github/workflows/autonomous-curator.yml` run twice weekly (Mondays and Thursdays at 07:00 UTC), executing `scripts/curate-atlas.mjs` against strict TypeScript interfaces (`src/types/atlas.ts`).

```mermaid
flowchart LR
    A["Search-Grounded Discovery (Gemini + Google Search)"] --> B["Schema-Locked Extraction (Mappings + News Spotlight)"]
    B --> C{"Deterministic Quality Gate"}
    C -->|"HTTP 200-399 URL + Clause ID + Foreign Keys Valid"| D["Atomic Update: src/data/atlas.json & CHANGELOG.md"]
    C -->|"Dead Link / Vague Citation / Duplicate"| E["Rejected & Logged"]
    D --> F["TypeScript + Unit Tests + SEO/GEO Suite"]
    F --> G["Auto-Publish Live Site, llms.txt & IndexNow"]
```

No candidate mapping or news briefing enters `src/data/atlas.json` unless `runDeterministicQualityGate` verifies HTTP reachability on primary URLs, checks specific clause citations, validates foreign keys, and prevents duplication. Every verified commit triggers `scripts/inject-seo-and-sitemap.mjs` to emit static HTML/Markdown guides, pairwise comparison sheets, Schema.org Knowledge-Graph JSON-LD with `SpeakableSpecification`, `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`, and an IndexNow submission to `https://api.indexnow.org/indexnow`.

---

## Running Locally or Packaging Standalone

```bash
npm install
npm run lint && npm test
npm run build:standalone
GEMINI_API_KEY="your-key" npm start
```

Running `npm run build:standalone` generates the SEO/GEO static distribution under `dist/` and a portable single-file offline HTML bundle at `dist-standalone/open-atlas-interactive.html`.

---

## Citing This Work

Machine-readable citation metadata lives in [`CITATION.cff`](CITATION.cff).

```bibtex
@software{xu_2026_interoperability_atlas,
  author       = {Xu, Lihui},
  title        = {{Open Atlas of AI Governance Interoperability}},
  year         = {2026},
  version      = {2026.11.7},
  url          = {https://lihui-aigov.github.io/interoperability-atlas/}
}
```

## License

Software source code is licensed under the [MIT License](LICENSE). Structured governance mappings, news briefing syntheses, and methodology documentation (`src/data/atlas.json`) carry a Creative Commons Attribution 4.0 International (CC-BY-4.0) license. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for evidentiary rules when submitting updates.
