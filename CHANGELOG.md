# Open Atlas of AI Governance Interoperability — Dataset Changelog

All verified autonomous and editorial updates to `src/data/atlas.json` are recorded in this log.
Automated runs via `scripts/curate-atlas.mjs` enforce HTTP `200–399` source reachability, non-empty statutory/standard clause citations, and strict foreign-key integrity against `src/types/atlas.ts`.

---

## [2026.11.8] — 2026-11-23 (`gh-run-45139699901`)

- **Change Type:** `new_mapping`
- **Summary:** Added uc-tax-audit-scoring with 5 clause mappings across CoE CETS 225, Singapore Agentic MGF v1.5, Expanded ASEAN GenAI Guide, AU Continental AI Strategy, and EU AI Act, plus an EU AI Office Art. 91 sandbox-escape enforcement spotlight.
- **New Use Case Added:** `uc-tax-audit-scoring` — *Automated Tax Audit Selection & Public Revenue Fraud Scoring AI* (Public Finance & Revenue Administration)
- **News Spotlight Published:** `spot-eu-ai-office-art91-agent-rfi` — *EU AI Office Triggers First Article 91 Enforcement Requests After Frontier AI Agents Escape Testing Sandboxes* ([Source](https://iaim.ai/ai-insights/member-briefing-october-2026/))
- **Verified Mappings Added (5):**
  - `equivalent` · **CoE AI Convention (CETS 225) Art. 12 & Art. 16(1)-(2)(f)** (`uc-tax-audit-scoring` → `ctrl-post-market` → `inst-coe-treaty`) — [Verified Source](https://rm.coe.int/1680afae3c)
  - `delta` · **Singapore Agentic AI Framework v1.5 (2026) Dimension 1 (p. 14) & Dimension 3 (§2.3.1, p. 33)** (`uc-tax-audit-scoring` → `ctrl-agent-boundaries` → `inst-sg-agentic`) — [Verified Source](https://aiverifyfoundation.sg/)
  - `friction` · **Expanded ASEAN Guide on AI Governance and Ethics - GenAI (2025) §3.2 (pp. 20-23) & §3.7; ASEAN Guide (2024) Part C** (`uc-tax-audit-scoring` → `ctrl-data-aibom` → `inst-asean-guide`) — [Verified Source](https://asean.org/wp-content/uploads/2025/01/Expanded-ASEAN-Guide-on-AI-Governance-and-Ethics-Generative-AI.pdf)
  - `delta` · **AU Continental AI Strategy (2024) Core Values (Environment & Ecosystem Flourishing) & Infrastructure/Sustainability Pillar** (`uc-tax-audit-scoring` → `ctrl-env-footprint` → `inst-au-strategy`) — [Verified Source](https://au.int/en/documents/20240809/continental-artificial-intelligence-strategy)
  - `friction` · **EU AI Act Art. 53(1)(a), Annex XI §1(2)(e), Art. 40(2) & Art. 95(2)(b) (as amended by Reg. (EU) 2026/1744)** (`uc-tax-audit-scoring` → `ctrl-env-footprint` → `inst-eu-ai-act`) — [Verified Source](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:02024R1689-20260727)
- **Source Reference:** CoE CETS 225 Art. 12 & 16; IMDA Agentic AI MGF v1.5; Expanded ASEAN GenAI Guide §3.2; AU Continental AI Strategy; EU AI Act Reg. (EU) 2024/1689 & 2026/1744 Art. 53(1)(a), 91, Annex XI; IRS IRM 10.24.1.
- **Dataset Totals:** 13 Use Cases · 8 Operational Controls · 9 Global Instruments · 129 Verified Citations

## [2026.11.7] — 2026-11-19 (`gh-run-44487247089`)

- **Change Type:** `new_mapping`
- **Summary:** Added uc-public-defender-triage with 5 cross-instrument mappings (Singapore IMDA Agentic v1.5, ASEAN Expanded GenAI Guide, CoE CETS 225, AU Strategy, EU AI Act) and published a new Spotlight on autonomous agent sandbox escapes and incident-reporting clocks.
- **New Use Case Added:** `uc-public-defender-triage` — *Public Defender, Legal-Aid Eligibility & Judicial Case Triage AI* (Justice, Courts & Public Legal Services)
- **News Spotlight Published:** `spot-agent-escape-breach-reporting` — *Autonomous Agent Sandbox Escapes Trigger California Enforcement Suit and Australian Mandatory Reporting Reforms* ([Source](https://oag.ca.gov/news/press-releases/it%E2%80%99s-golden-state-not-wild-west-attorney-general-bonta-sues-openai-over))
- **Verified Mappings Added (5):**
  - `delta` · **Singapore Model AI Governance Framework for Agentic AI v1.5 (2026), §§2.1.1–2.1.2 & §§2.3.1, 2.3.3** (`uc-public-defender-triage` → `ctrl-agent-boundaries` → `inst-sg-agentic`) — [Verified Source](https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence)
  - `equivalent` · **Expanded ASEAN Guide on AI Governance and Ethics - Generative AI (2025), §3.4 & §3.6; ASEAN Guide (2024), Part C** (`uc-public-defender-triage` → `ctrl-post-market` → `inst-asean-guide`) — [Verified Source](https://asean.org/wp-content/uploads/2025/01/Expanded-ASEAN-Guide-on-AI-Governance-and-Ethics-Generative-AI.pdf)
  - `friction` · **CoE AI Convention (CETS 225) Art. 5, Art. 14 & Art. 16 vs. EU AI Act Annex III(8)(a) & EC Draft Guidelines §3.8.1(416)** (`uc-public-defender-triage` → `ctrl-ex-ante-fria` → `inst-coe-treaty`) — [Verified Source](https://rm.coe.int/1680afae3c)
  - `delta` · **AU Continental AI Strategy (2024), §2.4 (African Data Governance & Localised Datasets) & Action Line 10** (`uc-public-defender-triage` → `ctrl-data-aibom` → `inst-au-strategy`) — [Verified Source](https://au.int/en/documents/20240809/continental-artificial-intelligence-strategy)
  - `friction` · **EU AI Act Art. 53(1)(a) & Annex XI §1(2)(e) vs. UNESCO Recommendation §84 & NIST AI RMF MEASURE 2.12** (`uc-public-defender-triage` → `ctrl-env-footprint` → `inst-eu-ai-act`) — [Verified Source](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- **Source Reference:** IMDA MGF Agentic AI v1.5 (2026); Expanded ASEAN GenAI Guide (2025); CoE CETS 225; AU Continental AI Strategy (2024); EU AI Act Reg. (EU) 2024/1689; California AG Bonta v. OpenAI (Nov 2026); Australia Rapid Review (Nov 2026)
- **Dataset Totals:** 12 Use Cases · 8 Operational Controls · 9 Global Instruments · 124 Verified Citations

## [2026.11.6] — 2026-11-18 (`gh-run-44305078916`)

- **Change Type:** `new_mapping`
- **Summary:** Added agricultural subsidy satellite verification use case (uc-agri-subsidy-verification) with 5 clause-level mappings covering Singapore Agentic AI, ASEAN GenAI Guide, CoE AI Convention, AU Strategy, and Brazil PL 2338/Korea AI Basic Act.
- **New Use Case Added:** `uc-agri-subsidy-verification` — *Agricultural Subsidy Satellite Verification & Climate-Relief Eligibility AI* (Agriculture, Climate Resilience & Public Subsidies)
- **Verified Mappings Added (5):**
  - `delta` · **Singapore Agentic AI Framework §2.1.2 & §2.2.2** (`uc-agri-subsidy-verification` → `ctrl-agent-boundaries` → `inst-sg-agentic`) — [Verified Source](https://www.imda.gov.sg/-/media/imda/files/about/emerging-tech-and-research/artificial-intelligence/mgf-for-agentic-ai.pdf)
  - `equivalent` · **ASEAN AI Guide (2024) Principle 7 & Part C; Expanded GenAI Guide (2025) §3.2** (`uc-agri-subsidy-verification` → `ctrl-data-aibom` → `inst-asean-guide`) — [Verified Source](https://asean.org/wp-content/uploads/2025/01/Expanded-ASEAN-Guide-on-AI-Governance-and-Ethics-Generative-AI.pdf)
  - `delta` · **CoE AI Convention (CETS 225) Art. 16(2)(d)-(g), Art. 16(3)-(4), Art. 12 & Art. 26** (`uc-agri-subsidy-verification` → `ctrl-post-market` → `inst-coe-treaty`) — [Verified Source](https://rm.coe.int/1680afae3c)
  - `delta` · **AU Continental AI Strategy Focus Areas 2-3 & Action 3 vs. EU AI Act Art. 53(1)(a) & Annex XI** (`uc-agri-subsidy-verification` → `ctrl-env-footprint` → `inst-au-strategy`) — [Verified Source](https://au.int/en/documents/20240809/continental-artificial-intelligence-strategy)
  - `friction` · **Brazil PL 2338/2023 Art. 63 & Art. 65 vs. EU AI Act Art. 53(1)(c) & SG Copyright Act §244** (`uc-agri-subsidy-verification` → `ctrl-data-aibom` → `inst-br-kr-laws`) — [Verified Source](https://www25.senado.leg.br/web/atividade/materias/-/materia/157233)
- **Source Reference:** IMDA Agentic AI Framework (2026); Expanded ASEAN GenAI Guide (2025); CoE CETS 225; AU Continental AI Strategy (2024); Brazil PL 2338/2023 & EU AI Act
- **Dataset Totals:** 11 Use Cases · 8 Operational Controls · 9 Global Instruments · 119 Verified Citations

## [2026.11.5] — 2026-11-18 (`curate-2026-11-18`)

- **Change Type:** `instrument_update`
- **Summary:** Expanded Atlas to 10 concrete AI use cases (adding Consumer Credit & Alternative-Data Microfinance, Automated Candidate Screening & Workforce Management, Critical Energy Grid Dispatch, and Municipal Flood/Wildfire Evacuation) and 9 global instruments (adding Council of Europe AI Framework Convention CETS No. 225 and ASEAN AI Governance Guide), while enriching all 114 mappings with in-app `clauseExcerpt` text, `sectionAnchor` locators, and `verificationSteps`.
- **New Instruments Added (2):**
  - `inst-coe-treaty` — *Council of Europe Framework Convention on AI, Human Rights, Democracy and the Rule of Law (CETS No. 225)*
  - `inst-asean-guide` — *ASEAN Guide on AI Governance and Ethics (& Expanded Generative AI Guide)*
- **New Use Cases Added (4):**
  - `uc-credit-microfinance` — *Consumer Creditworthiness & Alternative-Data Microfinance Scoring*
  - `uc-hiring-workforce` — *Automated Candidate Screening, Video Interview Scoring & Workforce Management*
  - `uc-grid-infrastructure` — *Critical Energy Grid Load-Balancing & Autonomous Substation Dispatch*
  - `uc-emergency-wildfire-dispatch` — *Municipal Flood & Wildfire Evacuation Routing & Emergency Triage*
- **Dataset Totals:** 10 Use Cases · 8 Operational Controls · 9 Global Instruments · 114 Verified Citations

## [2026.11.4] — 2026-11-17 (`gh-run-11940284`)

- **Change Type:** `new_mapping`
- **Summary:** Mapped Singapore Model AI Governance Framework for Agentic AI tool-scoping checkpoints (§3.2 & §4.1) to Autonomous Public-Service Agent runtime boundaries and human approval gates.
- **Source Reference:** IMDA Singapore / AI Verify Foundation Agentic AI Governance Release
- **Dataset Totals:** 6 Use Cases · 8 Operational Controls · 7 Global Instruments · 76 Verified Citations
