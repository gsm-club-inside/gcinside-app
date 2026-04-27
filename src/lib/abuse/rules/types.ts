import type { RiskContext, RiskSignal } from "../types";

export interface AbuseRule {
  id: string;
  name: string;
  enabled: boolean;
  weight: number;
  evaluate(ctx: RiskContext): RiskSignal[] | Promise<RiskSignal[]>;
}

export function signal(ruleId: string, code: string, weight: number, detail?: string): RiskSignal {
  return { ruleId, reason: { code, weight, detail } };
}
