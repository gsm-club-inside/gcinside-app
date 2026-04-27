export type AbuseAction =
  | "sign_up"
  | "sign_in"
  | "create_post"
  | "create_comment"
  | "vote"
  | "search"
  | "upload"
  | "report";

export type RiskLevel = "ALLOW" | "MONITOR" | "CHALLENGE" | "RATE_LIMIT" | "TEMP_BLOCK" | "HARD_BLOCK" | "MANUAL_REVIEW";

export type ChallengeType =
  | "delay"
  | "re_auth"
  | "email_verification"
  | "captcha"
  | "admin_review";

export interface RiskSubject {
  userId?: number | null;
  sessionId?: string | null;
  ipHash?: string | null;
  deviceHash?: string | null;
}

export interface ClientTelemetry {
  typingIntervalAvg?: number;
  typingIntervalVariance?: number;
  keydownCount?: number;
  pasteUsed?: boolean;
  focusCount?: number;
  blurCount?: number;
  pointerMoveCount?: number;
  pointerDistance?: number;
  scrollCount?: number;
  visibilityChangeCount?: number;
  movementEntropy?: number;
  submitElapsedMs?: number;
}

export interface RiskContext {
  action: AbuseAction;
  subject: RiskSubject;
  userAgent?: string | null;
  accountAgeMinutes?: number | null;
  recentRequestCount1m?: number;
  recentRequestCount10m?: number;
  reputationScore?: number;
  contentHash?: string | null;
  contentSimilarityCount?: number;
  telemetry?: ClientTelemetry;
  metadata?: Record<string, unknown>;
}

export interface RiskReason {
  code: string;
  weight: number;
  detail?: string;
}

export interface RiskSignal {
  ruleId: string;
  reason: RiskReason;
}

export interface RiskScoreBreakdown {
  ruleScore: number;
  behaviorScore: number;
  velocityScore: number;
  reputationScore: number;
  contentSimilarityScore: number;
  mlScore: number | null;
}

export interface RiskDecision {
  action: AbuseAction;
  subject: RiskSubject;
  score: number;
  level: RiskLevel;
  decision: RiskLevel;
  reasons: RiskReason[];
  signals: RiskSignal[];
  breakdown: RiskScoreBreakdown;
  ruleVersion: string;
  modelVersion: string | null;
  challenge: ChallengeType | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}
