import type { RiskContext, RiskSignal } from "../types";
import type { AbuseRule } from "./types";
import { builtinRules } from "./builtins";

export class RuleEngine {
  constructor(private rules: AbuseRule[] = builtinRules) {}

  list(): AbuseRule[] {
    return this.rules.filter((r) => r.enabled);
  }

  async evaluate(ctx: RiskContext): Promise<RiskSignal[]> {
    const out: RiskSignal[] = [];
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      try {
        const sigs = await rule.evaluate(ctx);
        for (const s of sigs) {
          out.push({ ...s, reason: { ...s.reason, weight: s.reason.weight * rule.weight } });
        }
      } catch {
        // never let one rule break the engine
      }
    }
    return out;
  }
}

export const defaultRuleEngine = new RuleEngine();
