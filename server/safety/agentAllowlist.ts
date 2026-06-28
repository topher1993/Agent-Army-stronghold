import { ENGINEERING_DIVISION_TARGETS } from '../../shared/divisions';

export const ALLOWED_AGENT_TARGETS = ['belion','iron','tusk','kaisel','greed','beru',...ENGINEERING_DIVISION_TARGETS,'cipher','cipher-agent','nova','titan'] as const;
export const ALLOWED_AGENT_ACTIONS = ['agent:plan','agent:review','agent:summarize','agent:validate','agent:test-readonly'] as const;
export function assertAllowedAgentTarget(target:string){ if(!ALLOWED_AGENT_TARGETS.includes(target.toLowerCase() as never)) throw new Error(`Agent target not allowlisted: ${target}`); }
export function assertAllowedAgentAction(action:string){ if(!ALLOWED_AGENT_ACTIONS.includes(action as never)) throw new Error(`Agent action not allowlisted: ${action}`); }
