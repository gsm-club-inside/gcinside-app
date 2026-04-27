-- AbuseEvent
CREATE TABLE "AbuseEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" INTEGER,
  "sessionId" TEXT,
  "ipHash" TEXT,
  "deviceHash" TEXT,
  "action" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AbuseEvent_action_createdAt_idx" ON "AbuseEvent"("action","createdAt");
CREATE INDEX "AbuseEvent_userId_createdAt_idx" ON "AbuseEvent"("userId","createdAt");
CREATE INDEX "AbuseEvent_ipHash_createdAt_idx" ON "AbuseEvent"("ipHash","createdAt");

-- RiskDecisionRecord
CREATE TABLE "RiskDecisionRecord" (
  "id" BIGSERIAL PRIMARY KEY,
  "requestId" TEXT NOT NULL UNIQUE,
  "userId" INTEGER,
  "sessionId" TEXT,
  "ipHash" TEXT,
  "deviceHash" TEXT,
  "action" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "decision" TEXT NOT NULL,
  "reasons" JSONB NOT NULL,
  "signals" JSONB NOT NULL,
  "ruleVersion" TEXT NOT NULL,
  "modelVersion" TEXT,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3)
);
CREATE INDEX "RiskDecisionRecord_userId_createdAt_idx" ON "RiskDecisionRecord"("userId","createdAt");
CREATE INDEX "RiskDecisionRecord_decision_createdAt_idx" ON "RiskDecisionRecord"("decision","createdAt");
CREATE INDEX "RiskDecisionRecord_action_createdAt_idx" ON "RiskDecisionRecord"("action","createdAt");

-- SessionFingerprint
CREATE TABLE "SessionFingerprint" (
  "id" BIGSERIAL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "ipHash" TEXT,
  "deviceHash" TEXT,
  "userId" INTEGER,
  "uaHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SessionFingerprint_sessionId_idx" ON "SessionFingerprint"("sessionId");
CREATE INDEX "SessionFingerprint_ipHash_idx" ON "SessionFingerprint"("ipHash");
CREATE INDEX "SessionFingerprint_deviceHash_idx" ON "SessionFingerprint"("deviceHash");

-- RateLimitBucket
CREATE TABLE "RateLimitBucket" (
  "id" BIGSERIAL PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "identity" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "windowSec" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "blocked" BOOLEAN NOT NULL DEFAULT false,
  "blockedUntil" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "RateLimitBucket_scope_action_identity_key" ON "RateLimitBucket"("scope","action","identity");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- ChallengeAttempt
CREATE TABLE "ChallengeAttempt" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" INTEGER,
  "sessionId" TEXT,
  "ipHash" TEXT,
  "challengeType" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "outcome" TEXT
);
CREATE INDEX "ChallengeAttempt_userId_idx" ON "ChallengeAttempt"("userId");
CREATE INDEX "ChallengeAttempt_challengeType_issuedAt_idx" ON "ChallengeAttempt"("challengeType","issuedAt");

-- UserReputation
CREATE TABLE "UserReputation" (
  "userId" INTEGER PRIMARY KEY,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "allowlisted" BOOLEAN NOT NULL DEFAULT false,
  "blocklisted" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- IpReputation
CREATE TABLE "IpReputation" (
  "ipHash" TEXT PRIMARY KEY,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "allowlisted" BOOLEAN NOT NULL DEFAULT false,
  "blocklisted" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- DeviceReputation
CREATE TABLE "DeviceReputation" (
  "deviceHash" TEXT PRIMARY KEY,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "allowlisted" BOOLEAN NOT NULL DEFAULT false,
  "blocklisted" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ContentSimilarityHash
CREATE TABLE "ContentSimilarityHash" (
  "hash" TEXT PRIMARY KEY,
  "userId" INTEGER,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ContentSimilarityHash_userId_idx" ON "ContentSimilarityHash"("userId");
CREATE INDEX "ContentSimilarityHash_lastSeen_idx" ON "ContentSimilarityHash"("lastSeen");
