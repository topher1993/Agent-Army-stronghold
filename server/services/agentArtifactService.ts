import type { AgentArtifact } from '../../shared/agentTypes';
import { createChangeRequest } from './approvalWorkflow';
export function artifactToChangeRequestPayload(artifact: AgentArtifact, actor:string){ return createChangeRequest({ kind:'task.create', title:`Promote Artifact ${artifact.id}`, rationale:`Artifact ${artifact.id} requires human review before applying.`, requestedBy:actor, payload:{ artifactId:artifact.id, content:artifact.content.slice(0,1000) }, reviewers:['Igris','Pulse'] }); }
