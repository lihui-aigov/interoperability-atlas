import type { SandboxMappingResult } from '../types/atlas';

export interface SandboxPresetEntry {
  id: string;
  label: string;
  scenario: string;
  sector: string;
  result: SandboxMappingResult;
}

export const SANDBOX_PRESETS: SandboxPresetEntry[] = [
  {
    id: 'preset-customs-triage',
    label: 'Customs Cargo & Tariff Risk AI',
    scenario:
      'Automated port customs tariff classification and x-ray cargo risk scoring system flagging shipping containers for physical border inspection.',
    sector: 'Trade, Customs & Border Administration',
    result: {
      useCase: {
        id: 'uc-sandbox-customs-triage',
        title: 'Customs Tariff Classification & Border Cargo Inspection Triage AI',
        sector: 'Trade, Customs & Border Administration',
        summary:
          'Scores incoming maritime and air freight manifests alongside dual-energy x-ray scans to route containers toward physical customs inspection or automated clearance.',
        deploymentContext:
          'Operated by national revenue and border authorities balancing trade facilitation against illicit-goods detection and non-discriminatory trader treatment.',
        riskProfile: 'High-Risk Border & Revenue Administration',
        primaryActors: [
          'National Customs Authority',
          'Port Logistics Operators',
          'Cross-Border Importers',
          'Administrative Appeals Tribunals',
        ],
        isCustomSandbox: true,
      },
      executiveSynthesis:
        'ISO/IEC 42001, NIST AI RMF, and ASEAN guidelines align closely on customs model provenance and human inspection overrides, whereas EU AI Act Annex III(7) and Council of Europe CETS 225 impose strict fundamental-rights pre-assessments and procedural contestability duties for border authorities.',
      groundingSources: [
        {
          title: 'Regulation (EU) 2024/1689 — Annex III(7) Border Control & Art. 27 FRIA',
          uri: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
        },
        {
          title: 'Council of Europe Framework Convention on AI (CETS No. 225)',
          uri: 'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence',
        },
        {
          title: 'UNESCO Recommendation on the Ethics of AI (2021)',
          uri: 'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
        },
      ],
      mappings: [
        {
          id: 'map-sb-cust-override-eu',
          useCaseId: 'uc-sandbox-customs-triage',
          controlId: 'ctrl-human-override',
          instrumentId: 'inst-eu-ai-act',
          alignmentType: 'equivalent',
          clauseCitation: 'EU AI Act Art. 14 & Annex III(7)',
          sectionAnchor: 'Article 14',
          clauseExcerpt:
            'High-risk border and customs risk-assessment systems must enable natural persons overseeing deployment to interpret anomaly scores and independently override physical inspection flags without automation bias.',
          verificationSteps: [
            'Verify customs officer UI displays feature-level manifest triggers alongside model confidence intervals.',
            'Log all manual officer overrides with justification codes for quarterly automation-bias audits.',
          ],
          rationale:
            'Mandates active customs officer authority to override automated container holds and suppress unverified anomaly flags.',
          sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-cust-aibom-iso',
          useCaseId: 'uc-sandbox-customs-triage',
          controlId: 'ctrl-data-aibom',
          instrumentId: 'inst-iso-42001',
          alignmentType: 'equivalent',
          clauseCitation: 'ISO/IEC 42001 Control A.7.2 & A.7.4',
          sectionAnchor: 'Control A.7.2',
          clauseExcerpt:
            'Organizations managing AI systems must document training-dataset provenance, scanner-vendor dependencies, and data quality tolerances across model updates.',
          verificationSteps: [
            'Maintain a signed AIBOM linking x-ray imaging hardware firmware versions to anomaly detector weights.',
            'Record harmonized tariff schedule dataset snapshots prior to each production release.',
          ],
          rationale:
            'Provides auditable supply-chain lineage across customs imagery hardware vendors and tariff classifier weights.',
          sourceUrl: 'https://www.iso.org/standard/81230.html',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-cust-bias-nist',
          useCaseId: 'uc-sandbox-customs-triage',
          controlId: 'ctrl-bias-audit',
          instrumentId: 'inst-nist-ai-rmf',
          alignmentType: 'equivalent',
          clauseCitation: 'NIST AI RMF MEASURE 2.11 & MAP 2.3',
          sectionAnchor: 'MEASURE 2.11',
          clauseExcerpt:
            'System owners should evaluate disparate false-positive inspection burdens across country-of-origin corridors, SME shippers, and regional port hubs before and during operation.',
          verificationSteps: [
            'Compute false-flag inspection rates segmented by importer size and trade corridor.',
            'Retrain or recalibrate threshold scores when SME false-positive disparity exceeds operational tolerance.',
          ],
          rationale:
            'Directs empirical disparity testing so automated risk rules do not disproportionately stall small exporters or specific trade corridors.',
          sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-cust-fria-coe',
          useCaseId: 'uc-sandbox-customs-triage',
          controlId: 'ctrl-ex-ante-fria',
          instrumentId: 'inst-coe-treaty',
          alignmentType: 'delta',
          clauseCitation: 'CoE AI Convention (CETS 225) Art. 16(1)-(3)',
          sectionAnchor: 'Article 16',
          clauseExcerpt:
            'Public authorities deploying AI in administrative and border procedures must conduct ex-ante assessments of human-rights, equality, and due-process risks and publish non-confidential summaries.',
          verificationSteps: [
            'Publish a redacted impact assessment summary covering non-discrimination and procedural fairness.',
            'Establish periodic reassessment triggers whenever inspection rules incorporate new biometric or third-party feeds.',
          ],
          rationale:
            'Adds binding treaty-level pre-deployment human-rights assessment and public documentation duties for public customs agencies.',
          sourceUrl:
            'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-cust-contest-unesco',
          useCaseId: 'uc-sandbox-customs-triage',
          controlId: 'ctrl-contestability',
          instrumentId: 'inst-unesco-rec',
          alignmentType: 'equivalent',
          clauseCitation: 'UNESCO Recommendation §37–39 & §42',
          sectionAnchor: '37.',
          clauseExcerpt:
            'Affected natural and legal persons must receive intelligible notice when automated scoring contributes to an adverse administrative hold, alongside accessible human appeal channels.',
          verificationSteps: [
            'Include plain-language notice and appeal portal links on electronic container hold notifications.',
            'Track median turnaround time for human review of contested tariff reclassifications.',
          ],
          rationale:
            'Operationalizes administrative transparency and accessible human redress when cargo delays or tariff penalties stem from algorithmic scoring.',
          sourceUrl: 'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-cust-post-asean',
          useCaseId: 'uc-sandbox-customs-triage',
          controlId: 'ctrl-post-market',
          instrumentId: 'inst-asean-guide',
          alignmentType: 'equivalent',
          clauseCitation: 'ASEAN AI Guide Part C §4 (Risk Monitoring)',
          sectionAnchor: 'Section 4',
          clauseExcerpt:
            'Deployers in cross-border supply chains should maintain continuous model drift telemetry and incident escalation paths compatible with regional single-window customs portals.',
          verificationSteps: [
            'Monitor weekly drift in tariff classification confidence across seasonal trade surges.',
            'Document incident-response contacts across regional customs coordination desks.',
          ],
          rationale:
            'Supports interoperable post-deployment drift monitoring across interconnected ASEAN trade corridors.',
          sourceUrl: 'https://asean.org/',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-cust-fr-br-eu',
          useCaseId: 'uc-sandbox-customs-triage',
          controlId: 'ctrl-contestability',
          instrumentId: 'inst-br-kr-laws',
          alignmentType: 'friction',
          clauseCitation: 'EU AI Act Art. 86 vs. Customs Law Enforcement Secrecy Carve-Outs',
          sectionAnchor: 'Article 86',
          clauseExcerpt:
            'Statutes guaranteeing affected individuals a right to explanation for high-risk automated decisions conflict with customs anti-smuggling statutes restricting disclosure of risk-indicator weights.',
          verificationSteps: [
            'Prepare bifurcated explanation templates disclosing procedural tariff grounds without exposing anti-contraband indicator weights.',
            'Validate legal secrecy boundaries with customs counsel prior to opening automated explanation endpoints.',
          ],
          rationale:
            'Creates statutory tension between individual right-to-explanation mandates and customs intelligence confidentiality rules.',
          sourceUrl: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/157233',
          lastVerified: '2026-11-18',
        },
      ],
    },
  },
  {
    id: 'preset-west-africa-edu',
    label: 'West Africa Multilingual EdTech Tutor',
    scenario:
      'Public secondary-school adaptive STEM tutor delivering offline-first and SMS/WhatsApp exercises in French, Wolof, and Bambara for rural classrooms.',
    sector: 'Education, Linguistic Inclusion & Public DPI',
    result: {
      useCase: {
        id: 'uc-sandbox-west-africa-edu',
        title: 'Multilingual Public-School STEM & Literacy Tutor (French / Wolof / Bambara)',
        sector: 'Education, Linguistic Inclusion & Public DPI',
        summary:
          'Provides curriculum-aligned adaptive tutoring and formative feedback across low-bandwidth rural secondary classrooms in multiple national languages.',
        deploymentContext:
          'Procured by education ministries as open digital public infrastructure serving adolescent learners with varied connectivity and teacher supervision.',
        riskProfile: 'High-Impact Child & Cultural Rights Domain',
        primaryActors: [
          'Ministry of National Education',
          'Classroom Teachers',
          'Secondary Students & Guardians',
          'Local Language Curriculum Institutes',
        ],
        isCustomSandbox: true,
      },
      executiveSynthesis:
        'UNESCO Recommendation §62–66 and the AU Continental AI Strategy converge on linguistic diversity, low-bandwidth access, and local data sovereignty, whereas EU AI Act Annex III(3) triggers full high-risk assessment duties whenever formative exercises feed into grade promotion or national exam tracking.',
      groundingSources: [
        {
          title: 'UNESCO Recommendation on the Ethics of AI — Education & Culture (§62–66, §94–97)',
          uri: 'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
        },
        {
          title: 'African Union Continental AI Strategy (2024)',
          uri: 'https://au.int/en/documents/20240809/continental-artificial-intelligence-strategy',
        },
        {
          title: 'Regulation (EU) 2024/1689 — Annex III(3) Education & Vocational Training',
          uri: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
        },
      ],
      mappings: [
        {
          id: 'map-sb-edu-bias-unesco',
          useCaseId: 'uc-sandbox-west-africa-edu',
          controlId: 'ctrl-bias-audit',
          instrumentId: 'inst-unesco-rec',
          alignmentType: 'equivalent',
          clauseCitation: 'UNESCO Recommendation §62–65 & §94–96',
          sectionAnchor: '62.',
          clauseExcerpt:
            'Educational AI tools should prevent widening inequalities across rural regions, dialects, and gender, and actively preserve linguistic and cultural diversity in local curricula.',
          verificationSteps: [
            'Benchmark comprehension accuracy across French, Wolof, and Bambara test sets prior to school rollout.',
            'Verify gender-balanced and culturally relevant pedagogical examples with local curriculum reviewers.',
          ],
          rationale:
            'Requires explicit accuracy parity across national languages and rural cohorts so non-French primary speakers are not penalized.',
          sourceUrl: 'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-edu-data-au',
          useCaseId: 'uc-sandbox-west-africa-edu',
          controlId: 'ctrl-data-aibom',
          instrumentId: 'inst-au-strategy',
          alignmentType: 'delta',
          clauseCitation: 'AU Continental AI Strategy Focus Area 2 & 3 (Local Data Sovereignty)',
          sectionAnchor: 'Focus Area 2',
          clauseExcerpt:
            'Public-interest deployments should prioritize local linguistic corpora governance, regional hosting sovereignty, and capacity transfer to domestic educators and researchers.',
          verificationSteps: [
            'Document ownership and community consent terms for Wolof and Bambara pedagogical corpora in the AIBOM.',
            'Ensure student interaction logs remain hosted within national or regional cloud boundaries.',
          ],
          rationale:
            'Adds explicit sovereignty and local-corpus governance obligations beyond generic technical AIBOM checklists.',
          sourceUrl:
            'https://au.int/en/documents/20240809/continental-artificial-intelligence-strategy',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-edu-fria-eu',
          useCaseId: 'uc-sandbox-west-africa-edu',
          controlId: 'ctrl-ex-ante-fria',
          instrumentId: 'inst-eu-ai-act',
          alignmentType: 'delta',
          clauseCitation: 'EU AI Act Art. 27 & Annex III(3)(b)',
          sectionAnchor: 'Annex III',
          clauseExcerpt:
            'Systems evaluating learning outcomes or steering educational access are classified as high-risk, requiring public-body deployers to complete a Fundamental Rights Impact Assessment.',
          verificationSteps: [
            'Restrict tutor outputs strictly to formative practice if avoiding high-risk grading classification.',
            'Complete a Fundamental Rights Impact Assessment covering child privacy and pedagogical autonomy before summative use.',
          ],
          rationale:
            'Triggers mandatory high-risk and fundamental-rights impact filing whenever tutor telemetry informs formal student grading or tracking.',
          sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-edu-override-nist',
          useCaseId: 'uc-sandbox-west-africa-edu',
          controlId: 'ctrl-human-override',
          instrumentId: 'inst-nist-ai-rmf',
          alignmentType: 'equivalent',
          clauseCitation: 'NIST AI RMF GOVERN 3.2 & MEASURE 2.8',
          sectionAnchor: 'GOVERN 3.2',
          clauseExcerpt:
            'Classroom teachers must retain direct oversight to disable adaptive pacing recommendations, inspect misconception diagnostics, and substitute national curriculum exercises.',
          verificationSteps: [
            'Provide teachers with a single-click classroom dashboard to lock lesson topics or bypass AI hints.',
            'Test teacher override workflows under offline-first intermittent synchronization conditions.',
          ],
          rationale:
            'Aligns classroom human-in-the-loop authority across ministry procurement and technical risk management frameworks.',
          sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-edu-env-iso',
          useCaseId: 'uc-sandbox-west-africa-edu',
          controlId: 'ctrl-env-footprint',
          instrumentId: 'inst-iso-42001',
          alignmentType: 'equivalent',
          clauseCitation: 'ISO/IEC 42001 Control A.6.2.4 & UNESCO §84',
          sectionAnchor: 'Control A.6.2.4',
          clauseExcerpt:
            'System architects should evaluate edge-quantized inference efficiency and energy consumption when designing deployments for resource-constrained public infrastructure.',
          verificationSteps: [
            'Measure inference Wh per student session using quantized small-footprint models suitable for edge gateways.',
            'Report annual compute and bandwidth cost efficiency alongside learning outcomes.',
          ],
          rationale:
            'Links environmental compute stewardship directly to sustainable rural school connectivity and battery budgets.',
          sourceUrl: 'https://www.iso.org/standard/81230.html',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-edu-friction-br-eu',
          useCaseId: 'uc-sandbox-west-africa-edu',
          controlId: 'ctrl-post-market',
          instrumentId: 'inst-br-kr-laws',
          alignmentType: 'friction',
          clauseCitation: 'Child Telemetry Audit Retention vs. Strict Minors Data Minimization',
          sectionAnchor: 'Article 10',
          clauseExcerpt:
            'Statutory continuous post-market accuracy auditing demands longitudinal student interaction logs, conflicting with strict child-protection data minimization mandates requiring rapid session purging.',
          verificationSteps: [
            'Strip direct student identifiers at the school gateway before aggregating anonymized error telemetry.',
            'Obtain ministerial data-protection officer sign-off on retention windows for anonymized linguistic error logs.',
          ],
          rationale:
            'Produces concrete architectural friction between longitudinal fairness monitoring and child privacy minimization.',
          sourceUrl: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/157233',
          lastVerified: '2026-11-18',
        },
      ],
    },
  },
  {
    id: 'preset-sovereign-tax-agent',
    label: 'Municipal Tax & Procurement Audit Agent',
    scenario:
      'Autonomous municipal audit agent cross-checking corporate tax filings, beneficial ownership registries, and public procurement invoices to flag fraud.',
    sector: 'Public Finance, Tax Integrity & Anti-Corruption',
    result: {
      useCase: {
        id: 'uc-sandbox-tax-audit-agent',
        title: 'Autonomous Municipal Tax & Public-Procurement Anomaly Audit Agent',
        sector: 'Public Finance, Tax Integrity & Anti-Corruption',
        summary:
          'Tool-using agent executing read-only queries across tax filings, corporate beneficial ownership registries, and invoice ledgers to prioritize audit dossiers.',
        deploymentContext:
          'Deployed by municipal comptrollers and tax inspectorates where false fraud flags can trigger account freezes or vendor debarment.',
        riskProfile: 'High-Impact Administrative Enforcement Agent',
        primaryActors: [
          'Municipal Comptroller Office',
          'Tax & Audit Inspectors',
          'Registered Public Vendors',
          'Independent Audit Board',
        ],
        isCustomSandbox: true,
      },
      executiveSynthesis:
        'Singapore IMDA Agentic AI and ISO/IEC 42001 converge cleanly on deterministic tool-scoping and immutable query logs, while Brazil PL 2338, CoE CETS 225, and EU AI Act Art. 22/Annex III require strict prohibitions against autonomous penalty execution without reasoned human sign-off.',
      groundingSources: [
        {
          title: 'Singapore IMDA Model AI Governance Framework for Agentic AI (2026)',
          uri: 'https://aiverifyfoundation.sg/',
        },
        {
          title: 'Council of Europe Framework Convention on AI (CETS No. 225)',
          uri: 'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence',
        },
        {
          title: 'EU AI Act (Reg. 2024/1689) Art. 14 & Art. 12 Record-Keeping',
          uri: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
        },
      ],
      mappings: [
        {
          id: 'map-sb-tax-agent-sg',
          useCaseId: 'uc-sandbox-tax-audit-agent',
          controlId: 'ctrl-agent-boundaries',
          instrumentId: 'inst-sg-agentic',
          alignmentType: 'equivalent',
          clauseCitation: 'Singapore Agentic AI Framework §2.1 & §3.2',
          sectionAnchor: 'Section 3.2',
          clauseExcerpt:
            'Autonomous financial and administrative agents must enforce least-privilege tool scoping, strictly separating read-only registry lookup permissions from payment-freeze or enforcement write actions.',
          verificationSteps: [
            'Enforce database-level read-only credentials for the agent across tax and procurement tables.',
            'Require signed human-inspector session approval before generating formal audit notice letters.',
          ],
          rationale:
            'Establishes hard tool-permission sandboxes preventing an audit agent from unilaterally suspending vendor payments or issuing tax liens.',
          sourceUrl: 'https://aiverifyfoundation.sg/',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-tax-log-iso',
          useCaseId: 'uc-sandbox-tax-audit-agent',
          controlId: 'ctrl-agent-boundaries',
          instrumentId: 'inst-iso-42001',
          alignmentType: 'equivalent',
          clauseCitation: 'ISO/IEC 42001 Control A.6.2.8 & EU AI Act Art. 12',
          sectionAnchor: 'Control A.6.2.8',
          clauseExcerpt:
            'Audit systems must automatically capture immutable trace logs of every tool invocation, SQL query parameter, and intermediate reasoning chain leading to an anomaly flag.',
          verificationSteps: [
            'Archive tamper-evident tool-call transcripts tied to each flagged vendor dossier ID.',
            'Verify trace retention matches statutory tax-appeal limitation periods.',
          ],
          rationale:
            'Ensures comptroller investigators and administrative courts can reconstruct exact evidence chains behind every audit referral.',
          sourceUrl: 'https://www.iso.org/standard/81230.html',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-tax-override-coe',
          useCaseId: 'uc-sandbox-tax-audit-agent',
          controlId: 'ctrl-human-override',
          instrumentId: 'inst-coe-treaty',
          alignmentType: 'delta',
          clauseCitation: 'CoE AI Convention (CETS 225) Art. 14 & Art. 15',
          sectionAnchor: 'Article 14',
          clauseExcerpt:
            'Parties must ensure effective procedural safeguards so individuals and legal entities subject to public-authority AI assessments receive notice and meaningful human review before enforcement.',
          verificationSteps: [
            'Configure workflow so agentic risk scores remain advisory until independently corroborated by a certified auditor.',
            'Document human-inspector sign-off timestamps on all audit referrals.',
          ],
          rationale:
            'Reinforces treaty-level procedural due-process barriers against rubber-stamping automated fiscal enforcement.',
          sourceUrl:
            'https://www.coe.int/en/web/artificial-intelligence/the-framework-convention-on-artificial-intelligence',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-tax-bias-unesco',
          useCaseId: 'uc-sandbox-tax-audit-agent',
          controlId: 'ctrl-bias-audit',
          instrumentId: 'inst-unesco-rec',
          alignmentType: 'equivalent',
          clauseCitation: 'UNESCO Recommendation §28–30 & §71',
          sectionAnchor: '28.',
          clauseExcerpt:
            'Public-finance risk scoring must be audited for disproportionate targeting of micro-enterprises, informal vendors, or specific geographic neighborhoods lacking formal accounting software.',
          verificationSteps: [
            'Audit referral rates across firm revenue tiers to detect false-positive penalties on informal or micro-vendors.',
            'Adjust missing-document risk weights where rural vendors rely on paper invoices.',
          ],
          rationale:
            'Prevents automated tax audits from disproportionately burdening small local suppliers over complex corporate networks.',
          sourceUrl: 'https://www.unesco.org/en/artificial-intelligence/recommendation-ethics',
          lastVerified: '2026-11-18',
        },
        {
          id: 'map-sb-tax-friction-kr-eu',
          useCaseId: 'uc-sandbox-tax-audit-agent',
          controlId: 'ctrl-contestability',
          instrumentId: 'inst-br-kr-laws',
          alignmentType: 'friction',
          clauseCitation: 'Brazil PL 2338 Art. 18 Contestability vs. Fiscal Fraud Tipping-Off Rules',
          sectionAnchor: 'Artigo 18',
          clauseExcerpt:
            'Immediate notification and explanation duties upon algorithmic profiling collide with anti-money-laundering and tax-evasion statutes prohibiting premature suspect notification during covert investigations.',
          verificationSteps: [
            'Implement delayed-disclosure queues legally certified for active anti-fraud investigations.',
            'Separate routine invoice-formatting checks (immediate notice) from covert collusion probes (judicial warrant gate).',
          ],
          rationale:
            'Creates an irreconcilable timing clash between immediate citizen transparency duties and covert anti-corruption investigative secrecy.',
          sourceUrl: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/157233',
          lastVerified: '2026-11-18',
        },
      ],
    },
  },
];
