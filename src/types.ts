export type WrapperStatus = {
  wrapper: string;
  available: boolean;
  extensionless: boolean;
  bat: boolean;
};

export type Agent = {
  target?: string;
  name: string;
  role: string;
  wrapper: string;
  installedWrapper?: string;
  executionMode?: 'mock-label-only';
  behavior?: 'shared-mock-dispatcher';
  dispatchNote?: string;
  reportsTo: string;
  responsibilities: string[];
  wrapperStatus: WrapperStatus;
};

export type SkillSummary = {
  name: string;
  description: string;
  relativePath: string;
};

export type ProfileSummary = {
  name: string;
  pathLabel: string;
  hasSkills: boolean;
  skillCount: number;
  skills: SkillSummary[];
  hasCronDir: boolean;
};

export type CronJobSummary = {
  id: string;
  name: string;
  schedule: string;
  profile: string;
  deliver: string;
  enabled: boolean;
  noAgent: boolean;
  skills: string[];
  toolsets: string[];
  safety: string;
};

export type Mission = {
  id: string;
  title: string;
  owner: string;
  status: 'planned' | 'active' | 'blocked' | 'review' | 'complete';
  priority: 'low' | 'medium' | 'high';
  summary: string;
  specialists: string[];
};

export type WorkCardRisk = 'GREEN' | 'YELLOW' | 'RED';

export type WorkCardStatus = Mission['status'];

export type WorkCard = {
  workCardId: string;
  project: string;
  risk: WorkCardRisk;
  owner: string;
  qc: string;
  created: string;
  status: WorkCardStatus;
  schedule?: string;
  mode?: string;
  title: string;
  filePath: string;
  lastUpdated: string;
};

export type SafetyFinding = {
  id: string;
  level: 'ok' | 'warn' | 'blocker';
  title: string;
  detail: string;
};

export type HealthSection = {
  tests: {
    status: string;
    files: number;
    tests: number;
    failedTests?: number;
    durationMs: number;
    capturedAt?: string;
    note?: string;
  };
  build: {
    status: string;
    bundleKb: number;
    cssKb: number;
    modules: number;
    durationMs?: number;
    capturedAt?: string;
    note?: string;
  };
  auditEntries: number;
  cronJobs: number;
  tunnel: { publicHost: string; note: string };
};

export type QcRound = {
  file: string;
  subject: string;
  score: number;
  verdict: string;
  modifiedAt: string;
};

export type WorkItem = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  owner?: string;
  source: string;
  modifiedAt: string;
  relativePath: string;
};

export type MemoryBlock = {
  files: Array<{ path: string; name: string; sizeBytes: number; headings: string[] }>;
  skills: Array<{ profile: string; skill: string }>;
  totalSkills: number;
};

export type ActivityEntry = {
  timestamp: string;
  actor: string;
  capability: string;
  action: string;
  outcome: string;
  targetId: string;
  targetType: string;
  reason: string;
};

export type StrongholdSnapshot = {
  generatedAt: string;
  phase: string;
  readOnly: boolean;
  owner: string;
  coordinator: string;
  dataSources: Record<string, string>;
  counts: {
    agents: number;
    profiles: number;
    wrappersAvailable: number;
    skills: number;
    cronJobs: number;
    missions: number;
    blockedMissions: number;
  };
  roster: Agent[];
  profiles: ProfileSummary[];
  wrappers: WrapperStatus[];
  cronJobs: CronJobSummary[];
  missions: Mission[];
  safetyFindings: SafetyFinding[];
  health: HealthSection;
  qcHistory: QcRound[];
  workItems: WorkItem[];
  memory: MemoryBlock;
  activity: ActivityEntry[];
};
