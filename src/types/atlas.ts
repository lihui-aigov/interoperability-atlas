/**
 * Strict domain schema for the Open Atlas of AI Governance Interoperability.
 * Designed so external scheduled GitHub Actions can validate and append verified
 * use cases, controls, instruments, and clause citations in `src/data/atlas.json`
 * without modifying React UI components.
 */

export type AlignmentType = 'equivalent' | 'delta' | 'friction';

export type InstrumentLegalNature =
  | 'Binding Regulation'
  | 'Certifiable Standard'
  | 'Multilateral Norm'
  | 'Voluntary Risk Framework'
  | 'Continental Strategy';

export interface UseCase {
  id: string;
  title: string;
  sector: string;
  summary: string;
  deploymentContext: string;
  riskProfile: string;
  primaryActors: string[];
  isCustomSandbox?: boolean;
}

export interface OperationalControl {
  id: string;
  title: string;
  category: string;
  artifactName: string;
  description: string;
  verificationMethod: string;
}

export interface GovernanceInstrument {
  id: string;
  shortName: string;
  title: string;
  issuingBody: string;
  jurisdictionOrScope: string;
  legalNature: InstrumentLegalNature;
  adoptionYear: number;
  officialUrl: string;
  summary: string;
}

export interface InteropMapping {
  id: string;
  useCaseId: string;
  controlId: string;
  instrumentId: string;
  alignmentType: AlignmentType;
  clauseCitation: string;
  rationale: string;
  sourceUrl: string;
  lastVerified: string;
}

export type UpdateChangeType =
  | 'instrument_update'
  | 'new_mapping'
  | 'citation_verified'
  | 'friction_alert';

export interface AtlasUpdateEntry {
  id: string;
  timestamp: string;
  runId: string;
  changeType: UpdateChangeType;
  summary: string;
  affectedIds: string[];
  sourceReference: string;
}

export interface AtlasTotalCounts {
  useCases: number;
  controls: number;
  instruments: number;
  mappings: number;
}

export interface AtlasMetadata {
  atlasName: string;
  datasetVersion: string;
  schemaVersion: string;
  lastUpdated: string;
  maintainer: string;
  repositoryWorkflow: string;
  totalCounts?: AtlasTotalCounts;
  recentUpdates: AtlasUpdateEntry[];
}

export interface AtlasDataset {
  metadata: AtlasMetadata;
  useCases: UseCase[];
  controls: OperationalControl[];
  instruments: GovernanceInstrument[];
  mappings: InteropMapping[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SandboxMappingResult {
  useCase: UseCase;
  mappings: InteropMapping[];
  executiveSynthesis: string;
  groundingSources: GroundingSource[];
}
