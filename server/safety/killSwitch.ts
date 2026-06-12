import fs from 'node:fs';
import path from 'node:path';
export function isOrchestrationDisabled(flagPath:string){ return process.env.STRONGHOLD_AGENT_EXECUTION === 'disabled' || fs.existsSync(flagPath); }
export function disableOrchestration(flagPath:string, reason='disabled'){ fs.mkdirSync(path.dirname(flagPath), {recursive:true}); fs.writeFileSync(flagPath, reason, 'utf8'); }
export function enableOrchestration(flagPath:string){ if(fs.existsSync(flagPath)) fs.unlinkSync(flagPath); }
export function assertDispatchEnabled(flagPath:string){ if(isOrchestrationDisabled(flagPath)) throw new Error('Agent orchestration disabled by kill switch'); }
