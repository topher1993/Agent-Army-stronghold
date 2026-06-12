export const CAPABILITIES = ['mission:create', 'mission:update', 'task:create', 'task:update', 'approval:review', 'audit:read'] as const;
export type Capability = typeof CAPABILITIES[number];
export function assertCapability(value: string): asserts value is Capability {
  if (!CAPABILITIES.includes(value as Capability)) throw new Error(`Unknown or denied capability: ${value}`);
}
