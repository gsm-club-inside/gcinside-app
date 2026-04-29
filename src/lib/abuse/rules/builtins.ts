import type { AbuseRule } from "./types";
import { signal } from "./types";

export const repeatedRequestRule: AbuseRule = {
  id: "repeated_requests_1m",
  name: "High request rate in last minute",
  enabled: true,
  weight: 0.25,
  evaluate(ctx) {
    const c = ctx.recentRequestCount1m ?? 0;
    if (c >= 60) return [signal(this.id, "burst_requests_60", 1.0, `${c}/min`)];
    if (c >= 30) return [signal(this.id, "burst_requests_30", 0.7, `${c}/min`)];
    if (c >= 15) return [signal(this.id, "burst_requests_15", 0.4, `${c}/min`)];
    return [];
  },
};

export const newAccountVolumeRule: AbuseRule = {
  id: "new_account_volume",
  name: "New account producing volume",
  enabled: true,
  weight: 0.2,
  evaluate(ctx) {
    const age = ctx.accountAgeMinutes ?? Number.POSITIVE_INFINITY;
    const c = ctx.recentRequestCount10m ?? 0;
    if (age < 60 && c >= 20)
      return [signal(this.id, "new_account_burst", 1.0, `age=${age}m, req=${c}`)];
    if (age < 1440 && c >= 50)
      return [signal(this.id, "young_account_volume", 0.6, `age=${age}m, req=${c}`)];
    return [];
  },
};

export const sameSubjectRepetitionRule: AbuseRule = {
  id: "same_subject_repetition",
  name: "Same IP/session/device repeated action",
  enabled: true,
  weight: 0.15,
  evaluate(ctx) {
    const out = [];
    if ((ctx.recentRequestCount1m ?? 0) >= 20) {
      out.push(signal(this.id, "subject_repeat_1m", 0.8, `${ctx.recentRequestCount1m}`));
    }
    return out;
  },
};

export const tooFastSubmitRule: AbuseRule = {
  id: "too_fast_submit",
  name: "Form submitted too fast",
  enabled: true,
  weight: 0.2,
  evaluate(ctx) {
    const t = ctx.telemetry?.submitElapsedMs;
    if (t === undefined) return [];
    if (t < 300) return [signal(this.id, "submit_under_300ms", 1.0, `${t}ms`)];
    if (t < 800) return [signal(this.id, "submit_under_800ms", 0.5, `${t}ms`)];
    return [];
  },
};

export const pasteOnlyRule: AbuseRule = {
  id: "paste_only_input",
  name: "Paste-dominant input pattern",
  enabled: true,
  weight: 0.15,
  evaluate(ctx) {
    const t = ctx.telemetry;
    if (!t) return [];
    if (t.pasteUsed && (t.keydownCount ?? 0) < 3) {
      return [signal(this.id, "paste_no_typing", 0.9, `keys=${t.keydownCount ?? 0}`)];
    }
    return [];
  },
};

export const noTelemetrySubmitRule: AbuseRule = {
  id: "no_telemetry_submit",
  name: "Submit without any client telemetry",
  enabled: true,
  weight: 0.1,
  evaluate(ctx) {
    const t = ctx.telemetry;
    if (!t) return [signal(this.id, "telemetry_absent", 0.5)];
    const keys = t.keydownCount ?? 0;
    const moves = t.pointerMoveCount ?? 0;
    if (keys === 0 && moves === 0) return [signal(this.id, "telemetry_empty", 0.7)];
    return [];
  },
};

export const duplicateContentRule: AbuseRule = {
  id: "duplicate_content",
  name: "Duplicate or near-duplicate content",
  enabled: true,
  weight: 0.2,
  evaluate(ctx) {
    const c = ctx.contentSimilarityCount ?? 0;
    if (c >= 5) return [signal(this.id, "content_dup_5", 1.0, `${c}`)];
    if (c >= 2) return [signal(this.id, "content_dup_2", 0.6, `${c}`)];
    return [];
  },
};

export const automationUaRule: AbuseRule = {
  id: "automation_user_agent",
  name: "User-agent or automation hint",
  enabled: true,
  weight: 0.2,
  evaluate(ctx) {
    const ua = (ctx.userAgent ?? "").toLowerCase();
    if (!ua) return [signal(this.id, "ua_missing", 0.5)];
    const bad = [
      "headless",
      "phantom",
      "selenium",
      "puppeteer",
      "playwright",
      "curl",
      "wget",
      "python-requests",
      "httpclient",
      "bot",
    ];
    for (const k of bad)
      if (ua.includes(k)) return [signal(this.id, `ua_match_${k}`, 1.0, ua.slice(0, 64))];
    return [];
  },
};

export const voteRepetitionRule: AbuseRule = {
  id: "vote_repetition",
  name: "Vote repetition",
  enabled: true,
  weight: 0.15,
  evaluate(ctx) {
    if (ctx.action !== "vote") return [];
    const c = ctx.recentRequestCount1m ?? 0;
    if (c >= 30) return [signal(this.id, "vote_burst", 1.0, `${c}/min`)];
    return [];
  },
};

export const builtinRules: AbuseRule[] = [
  repeatedRequestRule,
  newAccountVolumeRule,
  sameSubjectRepetitionRule,
  tooFastSubmitRule,
  pasteOnlyRule,
  noTelemetrySubmitRule,
  duplicateContentRule,
  automationUaRule,
  voteRepetitionRule,
];
