export const PHASE3_DIVISION_EXECUTION_MODE = 'mock-label-only' as const;
export const PHASE3_DIVISION_WRAPPER = 'mock' as const;

export type DivisionExecutionMode = typeof PHASE3_DIVISION_EXECUTION_MODE;

export type DivisionRosterEntry = {
  readonly target: string;
  readonly name: string;
  readonly role: string;
  readonly owner: string;
  readonly reportsTo: string;
  readonly responsibilities: readonly string[];
  readonly executionMode: DivisionExecutionMode;
  readonly wrapper: typeof PHASE3_DIVISION_WRAPPER;
};

export const ENGINEERING_DIVISION_ROSTER = [
  { target: 'igris', name: 'Igris', role: 'Engineering Director', owner: 'Igris', reportsTo: 'Belion', responsibilities: ['Own engineering delivery', 'Assign specialists', 'Final technical review'], executionMode: PHASE3_DIVISION_EXECUTION_MODE, wrapper: PHASE3_DIVISION_WRAPPER },
  { target: 'atlas', name: 'Atlas', role: 'Architecture label', owner: 'Igris', reportsTo: 'Igris', responsibilities: ['Architecture planning label', 'Data contract review label', 'System design review label'], executionMode: PHASE3_DIVISION_EXECUTION_MODE, wrapper: PHASE3_DIVISION_WRAPPER },
  { target: 'clix', name: 'Clix', role: 'Frontend label', owner: 'Igris', reportsTo: 'Igris', responsibilities: ['UI implementation label', 'Responsive layout label', 'Accessibility review label'], executionMode: PHASE3_DIVISION_EXECUTION_MODE, wrapper: PHASE3_DIVISION_WRAPPER },
  { target: 'forge', name: 'Forge', role: 'Backend/snapshot label', owner: 'Igris', reportsTo: 'Igris', responsibilities: ['Read-only collector label', 'Data normalization label', 'Local API/snapshot label'], executionMode: PHASE3_DIVISION_EXECUTION_MODE, wrapper: PHASE3_DIVISION_WRAPPER },
  { target: 'pulse', name: 'Pulse', role: 'QA label', owner: 'Igris', reportsTo: 'Igris', responsibilities: ['Test plan label', 'Validation label', 'Quality report label'], executionMode: PHASE3_DIVISION_EXECUTION_MODE, wrapper: PHASE3_DIVISION_WRAPPER },
  { target: 'sentinel', name: 'Sentinel', role: 'Security label', owner: 'Igris', reportsTo: 'Igris', responsibilities: ['Secret safety label', 'Read-only review label', 'OWASP checks label'], executionMode: PHASE3_DIVISION_EXECUTION_MODE, wrapper: PHASE3_DIVISION_WRAPPER },
  { target: 'vector', name: 'Vector', role: 'Ops label', owner: 'Igris', reportsTo: 'Igris', responsibilities: ['Local deployment label', 'Ops guide label', 'Runtime checks label'], executionMode: PHASE3_DIVISION_EXECUTION_MODE, wrapper: PHASE3_DIVISION_WRAPPER },
  { target: 'nexus', name: 'Nexus', role: 'Documentation label', owner: 'Igris', reportsTo: 'Igris', responsibilities: ['AI documentation label', 'Knowledge structure label', 'Backlog documentation label'], executionMode: PHASE3_DIVISION_EXECUTION_MODE, wrapper: PHASE3_DIVISION_WRAPPER },
] as const satisfies readonly DivisionRosterEntry[];

export const ENGINEERING_DIVISION_TARGETS = ENGINEERING_DIVISION_ROSTER.map(entry => entry.target);

export function findEngineeringDivision(target: string) {
  return ENGINEERING_DIVISION_ROSTER.find(entry => entry.target === target.toLowerCase());
}
