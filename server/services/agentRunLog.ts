import fs from 'node:fs';
import path from 'node:path';
import type { AgentRun } from '../../shared/agentTypes';
export function appendAgentRunLog(file:string, run:AgentRun){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.appendFileSync(file, JSON.stringify(run)+'\n', 'utf8'); }
