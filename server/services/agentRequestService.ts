import crypto from 'node:crypto';
import type { AgentRequest } from '../../shared/agentTypes';
import { validateAgentRequestInput } from '../schemas/agentRequest';
import { readJsonArray, atomicWriteJson } from './storage';
import { DEFAULT_SANDBOX_POLICY } from '../safety/executionPolicy';
function now(){return new Date().toISOString();}
export function createAgentRequest(file:string, input:Record<string,unknown>):AgentRequest{ const valid=validateAgentRequestInput(input); if(!valid.ok) throw new Error(valid.errors.join('; ')); const requests=readJsonArray<AgentRequest>(file); const t=now(); const request:AgentRequest={ id:crypto.randomUUID(), kind:input.kind as AgentRequest['kind'], status:'pending_review', title:String(input.title), prompt:String(input.prompt), requestedBy:String(input.requestedBy), targetAgent:String(input.targetAgent).toLowerCase(), reviewers:['Igris','Sentinel'], sandboxPolicyId:DEFAULT_SANDBOX_POLICY.id, allowedInputs:[], expectedOutputSchema:'artifact-v1', createdAt:t, updatedAt:t }; atomicWriteJson(file,[...requests,request]); return request; }
function update(file:string,id:string,fn:(r:AgentRequest)=>AgentRequest){ const requests=readJsonArray<AgentRequest>(file); const idx=requests.findIndex(r=>r.id===id); if(idx<0) throw new Error('agent request not found'); requests[idx]=fn(requests[idx]); atomicWriteJson(file,requests); return requests[idx]; }
export function approveAgentRequest(file:string,id:string,actor:string){ return update(file,id,r=>{ if(r.status!=='pending_review') throw new Error('request must be pending_review'); return {...r,status:'approved',approvedBy:actor,approvedAt:now(),updatedAt:now()}; }); }
export function rejectAgentRequest(file:string,id:string,actor:string,reason='rejected'){ return update(file,id,r=>{ if(r.status!=='pending_review') throw new Error('request must be pending_review'); return {...r,status:'rejected',failureReason:reason,updatedAt:now()}; }); }
export function enqueueAgentRequest(file:string,id:string){ return update(file,id,r=>{ if(r.status!=='approved') throw new Error('request must be approved before queue'); return {...r,status:'queued',updatedAt:now()}; }); }
export function markAgentRequestStatus(file:string,id:string,status:AgentRequest['status'],failureReason?:string){ return update(file,id,r=>({...r,status,updatedAt:now(),failureReason})); }
export function listAgentRequests(file:string){ return readJsonArray<AgentRequest>(file); }
