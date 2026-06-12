export type MissionStatus = 'planned' | 'active' | 'blocked' | 'review' | 'complete' | 'cancelled';
export type MissionPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'active' | 'blocked' | 'review' | 'done' | 'cancelled';
export type ChangeRequestStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'cancelled' | 'applied';
export type ChangeRequestKind = 'mission.create' | 'mission.update' | 'task.create' | 'task.update' | 'assignment.update';
export type AuditOutcome = 'requested' | 'validated' | 'approved' | 'rejected' | 'applied' | 'denied' | 'failed';

export type ValidationResult = { ok: true; errors: [] } | { ok: false; errors: string[] };

export type Mission = {
  id: string;
  title: string;
  owner: string;
  status: MissionStatus;
  priority: MissionPriority;
  summary: string;
  specialists: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags?: string[];
};

export type Task = {
  id: string;
  missionId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  owner?: string;
  specialists: string[];
  priority: MissionPriority;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  dueAt?: string;
  blockedReason?: string;
};

export type ChangeRequest = {
  id: string;
  kind: ChangeRequestKind;
  status: ChangeRequestStatus;
  title: string;
  rationale: string;
  requestedBy: string;
  reviewers: string[];
  payload: unknown;
  validationSummary: ValidationResult;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionReason?: string;
  appliedAt?: string;
  appliedBy?: string;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  capability: string;
  action: string;
  targetType: 'mission' | 'task' | 'changeRequest' | 'system';
  targetId?: string;
  targetPath?: string;
  outcome: AuditOutcome;
  reason?: string;
  requestId?: string;
  policyVersion: string;
  beforeHash?: string;
  afterHash?: string;
  redactionApplied: boolean;
  metadata?: Record<string, unknown>;
};
