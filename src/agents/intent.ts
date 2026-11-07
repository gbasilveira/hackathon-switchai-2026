/**
 * SwitchCortex — deterministic intent gate (fail-closed).
 *
 * Nothing reaches the BPMN/DMN execution path unless the message is an explicit
 * operational request: imperative action verb + concrete target + explicit environment.
 * Questions, greetings and ambiguous text never start a workflow. The LLM cannot
 * widen this gate; it only extracts facts after the gate has passed.
 */

export type Intent = 'ops_request' | 'conversation' | 'needs_clarification';

export interface IntentVerdict {
  readonly intent: Intent;
  readonly reason: string;
  readonly action?: string;
  readonly env?: 'dev' | 'staging' | 'prod';
  readonly costStated: boolean;
  /** Message to post in the room when no workflow is started. */
  readonly reply?: string;
}

const ACTION_VERBS = [
  'deploy', 'redeploy', 'scale', 'rollback', 'roll back', 'restart', 'provision', 'migrate',
  'delete', 'destroy', 'expose', 'publish', 'release', 'ship', 'patch', 'hotfix', 'upgrade',
  'implementa', 'implantar', 'escala', 'escalar', 'reinicia', 'reiniciar', 'migra', 'migrar',
  'apaga', 'apagar', 'elimina', 'eliminar', 'expõe', 'expor', 'publica', 'publicar', 'atualiza', 'atualizar',
];

const QUESTION_STARTERS =
  /^(who|what|why|how|when|where|which|can|could|would|should|do|does|is|are|quem|o que|que |porque|porquê|como|quando|onde|qual|quais|podes|pode|consegues|será)\b/i;

const ENV_PATTERNS: [RegExp, 'dev' | 'staging' | 'prod'][] = [
  [/\b(prod|production|produção|producao)\b/i, 'prod'],
  [/\b(staging|stg|pré-?produção|pre-?prod)\b/i, 'staging'],
  [/\b(dev|development|desenvolvimento)\b/i, 'dev'],
];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function classifyIntent(rawPrompt: string): IntentVerdict {
  const prompt = rawPrompt.trim();
  const lower = stripAccents(prompt.toLowerCase());
  const costStated = /\$\s*[0-9]|€\s*[0-9]|[0-9]\s*(usd|eur|€|\$)/i.test(prompt);

  if (prompt.length < 8) {
    return { intent: 'conversation', reason: 'too short', costStated, reply: conversationReply() };
  }

  const verb = ACTION_VERBS.find((v) => new RegExp(`\\b${stripAccents(v)}\\b`, 'i').test(lower));
  const isQuestion = prompt.endsWith('?') || QUESTION_STARTERS.test(lower);

  // Questions and "can you…?" are never executable, even if they mention a verb.
  if (isQuestion || !verb) {
    return {
      intent: 'conversation',
      reason: !verb ? 'no explicit action verb' : 'phrased as a question',
      costStated,
      reply: conversationReply(),
    };
  }

  const envHit = ENV_PATTERNS.find(([re]) => re.test(prompt));
  // A concrete target: an identifier-like token (kebab/snake/digits/version) after the verb.
  const afterVerb = lower.slice(lower.indexOf(stripAccents(verb)) + verb.length);
  const hasTarget = /[a-z0-9]+[-_.][a-z0-9]+|\bv?\d+(\.\d+)+\b|\b(pods?|cluster|bucket|service|servico|database|queue|indexer|gateway|checkout)\b/.test(afterVerb);

  if (!hasTarget || !envHit) {
    const missing = [!hasTarget ? 'target (service/resource)' : null, !envHit ? 'environment (dev/staging/prod)' : null]
      .filter(Boolean)
      .join(' and ');
    return {
      intent: 'needs_clarification',
      reason: `missing ${missing}`,
      action: verb,
      costStated,
      reply: `🛡️ **SwitchCortex**: I understood you want to *${verb}*, but no workflow was started — please state the ${missing}. Nothing is executed without an explicit target and environment.`,
    };
  }

  return { intent: 'ops_request', reason: 'explicit action + target + environment', action: verb, env: envHit[1], costStated };
}

function conversationReply(): string {
  return '💬 **SwitchCortex**: No operational action requested, so no workflow was started. I only execute explicit requests (e.g. "scale staging-search-indexer from 2 to 4 pods in staging"), and anything beyond the Green Lane still needs department and human approval.';
}
