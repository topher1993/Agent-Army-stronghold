export type WrapperStatus = {
  wrapper: string;
  available: boolean;
  extensionless: boolean;
  bat: boolean;
};

export type Agent = {
  name: string;
  role: string;
  wrapper: string;
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

export type SafetyFinding = {
  id: string;
  level: 'ok' | 'warn' | 'blocker';
  title: string;
  detail: string;
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
};
