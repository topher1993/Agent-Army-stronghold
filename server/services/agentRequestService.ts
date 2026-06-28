import crypto from 'node:crypto';
import type { AgentRequest, ModelVerificationStatus, RiskLevel } from '../../shared/agentTypes';
import { validateAgentRequestInput } from '../schemas/agentRequest';
import { readJsonArray, atomicWriteJson } from './storage';
import { DEFAULT_SANDBOX_POLICY } from '../safety/executionPolicy';
import { computeRequiredReviewers, runTuskPreflight } from '../safety/tuskPreflight';
function now(){return new Date().toISOString();}
function asRiskLevel(value: unknown): RiskLevel { return value === 'Yellow' || value === 'Red' ? value : 'Green'; }
function asModelVerificationStatus(value: unknown): ModelVerificationStatus | undefined {
  const allowed: ModelVerificationStatus[] = ['VERIFIED','FALLBACK APPROVED','UNVERIFIED MODEL — REVIEW REQUIRED','INVALID — WRONG MODEL USED','BLOCKED — REQUIRED MODEL UNAVAILABLE'];
  return allowed.includes(value as ModelVerificationStatus) ? value as ModelVerificationStatus : undefined;
}
function asBool(value: unknown, fallback = false): boolean { return typeof value === 'boolean' ? value : fallback; }
export function createAgentRequest(file:string, input:Record<string,unknown>):AgentRequest{ const valid=validateAgentRequestInput(input); if(!valid.ok) throw new Error(valid.errors.join('; ')); const requests=readJsonArray<AgentRequest>(file); const t=now(); const draft:AgentRequest={ id:crypto.randomUUID(), kind:input.kind as AgentRequest['kind'], status:'pending_review', title:String(input.title), prompt:String(input.prompt), requestedBy:String(input.requestedBy), targetAgent:String(input.targetAgent).toLowerCase(), reviewers:['Igris','Sentinel'], sandboxPolicyId:DEFAULT_SANDBOX_POLICY.id, allowedInputs:[], expectedOutputSchema:'artifact-v1', createdAt:t, updatedAt:t, riskLevel:asRiskLevel(input.riskLevel), requiredModel:input.requiredModel ? String(input.requiredModel) : undefined, backupModel:input.backupModel ? String(input.backupModel) : undefined, actualModel:input.actualModel ? String(input.actualModel) : undefined, modelProvider:input.modelProvider ? String(input.modelProvider) : undefined, verificationSource:input.verificationSource ? String(input.verificationSource) : undefined, modelVerificationStatus:asModelVerificationStatus(input.modelVerificationStatus), fallbackAllowed:asBool(input.fallbackAllowed), fallbackUsed:asBool(input.fallbackUsed), fallbackReason:input.fallbackReason ? String(input.fallbackReason) : undefined, tuskRequired:false };
 const preflight=runTuskPreflight(draft); const request:AgentRequest={...draft, reviewers:computeRequiredReviewers(draft), tuskRequired:preflight.tuskRequired, preflightVerdict:preflight.verdict, preflightErrors:preflight.errors}; atomicWriteJson(file,[...requests,request]); return request; }
function update(file:string,id:string,fn:(r:AgentRequest)=>AgentRequest){ const requests=readJsonArray<AgentRequest>(file); const idx=requests.findIndex(r=>r.id===id); if(idx<0) throw new Error('agent request not found'); requests[idx]=fn(requests[idx]); atomicWriteJson(file,requests); return requests[idx]; }
export function approveAgentRequest(file:string,id:string,actor:string){ return update(file,id,r=>{ if(r.status!=='pending_review') throw new Error('request must be pending_review'); return {...r,status:'approved',approvedBy:actor,approvedAt:now(),updatedAt:now()}; }); }
export function rejectAgentRequest(file:string,id:string,actor:string,reason='rejected'){ return update(file,id,r=>{ if(r.status!=='pending_review') throw new Error('request must be pending_review'); return {...r,status:'rejected',failureReason:reason,updatedAt:now()}; }); }
export function enqueueAgentRequest(file:string,id:string){ return update(file,id,r=>{ if(r.status!=='approved') throw new Error('request must be approved before queue'); const preflight=runTuskPreflight(r); if(preflight.errors.length) throw new Error(`Tusk preflight failed: ${preflight.errors.join('; ')}`); return {...r,status:'queued',updatedAt:now(),reviewers:computeRequiredReviewers(r),tuskRequired:preflight.tuskRequired,preflightVerdict:preflight.verdict,preflightErrors:preflight.errors}; }); }
export function markAgentRequestStatus(file:string,id:string,status:AgentRequest['status'],failureReason?:string){ return update(file,id,r=>({...r,status,updatedAt:now(),failureReason})); }

/**
 * Cancel an agent request. Only valid from pending_review or approved; an
 * already-cancelled, queued, dispatched, etc. request throws so the route
 * can return 409 without writing. Mirrors the approve/reject guards in
 * shape (throws on illegal transition, returns the updated record on
 * success). P1 fix (Sentinel): the cancel route used to be a stub
 * returning {ok:true} with no write and no audit.
 */
export function cancelAgentRequest(file:string,id:string,actor:string,reason='cancelled by operator'){ return update(file,id,r=>{ if(r.status!=='pending_review'&&r.status!=='approved') throw new Error(`cannot cancel request in status ${r.status}`); return {...r,status:'cancelled',cancelledBy:actor,cancelledAt:now(),failureReason:reason,updatedAt:now()}; }); }
export function listAgentRequests(file:string){ return readJsonArray<AgentRequest>(file); }
