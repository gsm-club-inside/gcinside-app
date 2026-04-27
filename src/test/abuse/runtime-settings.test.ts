import { describe, expect, it } from "vitest";
import {
  chooseModelForRequest,
  normalizeCanaryRatio,
  parseAiMode,
  settingsToAbuseRuntimeSettings,
} from "@/lib/abuse/runtime-settings";

describe("abuse runtime settings", () => {
  it("normalizes AI mode and canary ratio", () => {
    expect(parseAiMode("OFF")).toBe("OFF");
    expect(parseAiMode("ENFORCE")).toBe("ENFORCE");
    expect(normalizeCanaryRatio(-1)).toBe(0);
    expect(normalizeCanaryRatio(2)).toBe(1);
  });

  it("maps db settings into runtime settings", () => {
    const settings = settingsToAbuseRuntimeSettings({
      abuseLearningEnabled: false,
      abuseAiMode: "ENFORCE",
      abuseActiveModel: "active-v1",
      abuseCandidateModel: "candidate-v2",
      abuseCanaryRatio: 0.25,
    });

    expect(settings.learningEnabled).toBe(false);
    expect(settings.aiMode).toBe("ENFORCE");
    expect(settings.activeModel).toBe("active-v1");
    expect(settings.candidateModel).toBe("candidate-v2");
    expect(settings.canaryRatio).toBe(0.25);
  });

  it("chooses candidate model only inside canary", () => {
    const settings = settingsToAbuseRuntimeSettings({
      abuseActiveModel: "active-v1",
      abuseCandidateModel: "candidate-v2",
      abuseCanaryRatio: 0.5,
    });

    expect(chooseModelForRequest(settings, () => 0.49)).toBe("candidate-v2");
    expect(chooseModelForRequest(settings, () => 0.5)).toBe("active-v1");
  });
});
