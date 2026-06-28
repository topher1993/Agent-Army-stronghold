import type { AgentRequest, ModelVerificationStatus, RiskLevel, TuskPreflightVerdict } from '../../shared/agentTypes';

const LOCAL_MODEL_PATTERNS = [/^gemma/i, /^qwen/i, /^llama/i, /^mistral/i, /ollama/i];
const SELF_REPORT_PATTERNS = [/self[- ]?report/i, /agent said/i, /assistant said/i];

function normalized(value: unknown): string {
  return String(value ?? '').trim();
}

function isLocalModel(model: string, provider: string): boolean {
  const haystack = `${model} ${provider}`.trim();
  return LOCAL_MODEL_PATTERNS.some(pattern => pattern.test(haystack));
}

function needsTusk(request: AgentRequest): boolean {
  return request.riskLevel === 'Yellow'
    || request.riskLevel === 'Red'
    || request.kind === 'code.review'
    || request.kind === 'security.review'
    || request.fallbackUsed === true
    || request.modelVerificationStatus === 'UNVERIFIED MODEL — REVIEW REQUIRED'
    || request.modelVerificationStatus === 'INVALID — WRONG MODEL USED'
    || request.modelVerificationStatus === 'BLOCKED — REQUIRED MODEL UNAVAILABLE';
}

export function computeRequiredReviewers(request: Pick<AgentRequest, 'reviewers' | 'riskLevel' | 'kind' | 'fallbackUsed' | 'modelVerificationStatus'>): string[] {
  const reviewers = new Set(request.reviewers ?? []);
  if (needsTusk(request as AgentRequest)) reviewers.add('Tusk');
  return [...reviewers];
}

export function runTuskPreflight(request: AgentRequest): { verdict: TuskPreflightVerdict; errors: string[]; tuskRequired: boolean } {
  const errors: string[] = [];
  const risk = request.riskLevel ?? 'Green';
  const requiredModel = normalized(request.requiredModel);
  const actualModel = normalized(request.actualModel);
  const backupModel = normalized(request.backupModel);
  const provider = normalized(request.modelProvider);
  const verificationSource = normalized(request.verificationSource);
  const status = request.modelVerificationStatus;
  const fallbackAllowed = request.fallbackAllowed === true;
  const fallbackUsed = request.fallbackUsed === true;

  if ((risk === 'Yellow' || risk === 'Red') && !requiredModel) errors.push('required model is required for Yellow/Red work');
  if ((risk === 'Yellow' || risk === 'Red') && !actualModel) errors.push('actual model is required for Yellow/Red work');
  if ((risk === 'Yellow' || risk === 'Red') && !provider) errors.push('model provider is required for Yellow/Red work');
  if ((risk === 'Yellow' || risk === 'Red') && !verificationSource) errors.push('verification source is required for Yellow/Red work');
  if ((risk === 'Yellow' || risk === 'Red') && SELF_REPORT_PATTERNS.some(pattern => pattern.test(verificationSource))) {
    errors.push('verification source cannot be agent self-report for Yellow/Red work');
  }

  if (fallbackUsed && !fallbackAllowed) errors.push('fallback used but fallback is not allowed');
  if (fallbackUsed && !request.fallbackReason) errors.push('fallback reason is required when fallback is used');

  if (requiredModel && actualModel && requiredModel.toLowerCase() !== actualModel.toLowerCase()) {
    const backupMatches = backupModel && backupModel.toLowerCase() === actualModel.toLowerCase();
    if (!fallbackAllowed || !fallbackUsed || !backupMatches) {
      errors.push('wrong model used without approved matching fallback');
    }
  }

  if (risk === 'Red' && isLocalModel(actualModel, provider)) {
    errors.push('Red-risk work cannot be approved with a local model alone');
  }

  if (status === 'INVALID — WRONG MODEL USED') errors.push('model verification status is invalid: wrong model used');
  if (status === 'BLOCKED — REQUIRED MODEL UNAVAILABLE') errors.push('required model unavailable; work must pause');
  if (risk === 'Red' && status !== 'VERIFIED' && status !== 'FALLBACK APPROVED') errors.push('Red-risk work requires verified or approved fallback model status');
  if (risk === 'Yellow' && status === 'UNVERIFIED MODEL — REVIEW REQUIRED') errors.push('Yellow work with unverified model must remain draft-only until Tusk review');

  const tuskRequired = needsTusk(request);
  let verdict: TuskPreflightVerdict = 'PASS';
  if (errors.length) verdict = errors.some(error => /red|blocked|required model unavailable|wrong model|fallback/i.test(error)) ? 'BLOCK' : 'NEEDS_TUSK_REVIEW';
  return { verdict, errors, tuskRequired };
}

export function assertTuskPreflightPass(request: AgentRequest): AgentRequest {
  const result = runTuskPreflight(request);
  if (result.errors.length) throw new Error(`Tusk preflight failed: ${result.errors.join('; ')}`);
  return { ...request, preflightVerdict: result.verdict, preflightErrors: result.errors, tuskRequired: result.tuskRequired };
}
