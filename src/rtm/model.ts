// RTM data model. rtm/rtm.json is the single source of truth for traceability.
// Bob (the AI) writes narrative documents; this file is what gets validated.

export type ReqStatus = 'draft' | 'approved' | 'implemented' | 'verified' | 'deferred';
export type Priority = 'must' | 'should' | 'could';

export interface Requirement {
  id: string;                 // FR-001
  title: string;
  description: string;
  source?: string;            // e.g. "product-spec.md §3.2"
  priority?: Priority;
  acceptanceCriteria: string[];
  status: ReqStatus;
}

export type ArtifactType =
  | 'RPGLE' | 'SQLRPGLE' | 'CLLE' | 'CMD' | 'SRVPGM' | 'BNDDIR' | 'MODULE'
  | 'DSPF' | 'PRTF' | 'PF' | 'LF'
  | 'SQL_TABLE' | 'SQL_VIEW' | 'SQL_INDEX' | 'SQL_PROCEDURE' | 'SQL_TRIGGER'
  | 'MSGF' | 'DTAARA' | 'JOBD' | 'OTHER';

export type ChangeAction = 'new' | 'modify' | 'delete';
export type Risk = 'low' | 'medium' | 'high';

/** Brownfield impact analysis entry: something that exists today and is affected. */
export interface ImpactItem {
  id: string;                 // IMP-001
  object: string;             // CUSTMAINT
  type: ArtifactType;
  library?: string;
  path?: string;              // source location (IFS path or LIB/FILE(MBR))
  change: string;             // what must change and why
  risk: Risk;
  reqIds: string[];
  callers?: string[];         // objects that call/use this one (from DSPPGMREF / DSPDBR)
  levelCheck?: boolean;       // file format change forces recompiles
}

export type ArtifactStatus = 'planned' | 'generated' | 'built' | 'failed';

/** A unit of work the build step will execute. */
export interface Artifact {
  id: string;                 // ART-001
  type: ArtifactType;
  name: string;               // object name, max 10 chars
  library?: string;
  path: string;               // source path relative to workspace
  action: ChangeAction;
  reqIds: string[];
  impactIds?: string[];       // required for action=modify in brownfield projects
  dependsOn?: string[];       // artifact ids that must build first
  specRef?: string;           // anchor in technical-specification.md
  status: ArtifactStatus;
}

export type TestKind = 'unit' | 'qa-manual' | 'qa-headless';
export type TestStatus = 'pass' | 'fail' | 'blocked' | 'not-run';

export interface TestCase {
  id: string;                 // UT-001 / QA-001 / HQ-001
  kind: TestKind;
  title: string;
  reqIds: string[];
  artifactIds: string[];
  path?: string;              // test source / script path
  lastResult?: { status: TestStatus; at: string; detail?: string };
}

export interface RtmDocument {
  version: 1;
  project: {
    name: string;
    library: string;          // dev/build target library
    sourceLibrary?: string;   // when source lives in QSYS source PFs
    ifsRoot?: string;         // when source lives in the IFS / git
  };
  mode: 'greenfield' | 'brownfield';
  inputs: { productSpec?: string; techSpec?: string; requirementsDoc?: string; impactDoc?: string };
  requirements: Requirement[];
  impact: ImpactItem[];
  artifacts: Artifact[];
  tests: TestCase[];
}

export const ID_PATTERNS: Record<string, RegExp> = {
  requirement: /^FR-\d{3,}$/,
  impact: /^IMP-\d{3,}$/,
  artifact: /^ART-\d{3,}$/,
  unit: /^UT-\d{3,}$/,
  'qa-manual': /^QA-\d{3,}$/,
  'qa-headless': /^HQ-\d{3,}$/,
};

export function emptyRtm(name: string, library: string, mode: RtmDocument['mode']): RtmDocument {
  return {
    version: 1,
    project: { name, library },
    mode,
    inputs: {},
    requirements: [],
    impact: [],
    artifacts: [],
    tests: [],
  };
}
