# Open Atlas of AI Governance Interoperability — Dataset Changelog

All verified autonomous and editorial updates to `src/data/atlas.json` are recorded in this log.
Automated runs via `scripts/curate-atlas.mjs` enforce HTTP `200–399` source reachability, non-empty statutory/standard clause citations, and strict foreign-key integrity against `src/types/atlas.ts`.

---

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
