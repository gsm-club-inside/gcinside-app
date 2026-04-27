# Anti-Abuse Domain (gcinside-app)

이 디렉토리는 Next.js 메인 앱(`gcinside-app`)에 내장된 abuse 방지 도메인입니다. FE/BE는 분리하지 않으며, 이 모듈도 `gcinside-app`에서 함께 빌드/배포됩니다.

## 구성

- `types.ts` — `AbuseAction`, `RiskDecision`, `RiskLevel`, `RiskSignal`, `RiskContext`, `RiskReason`, `ChallengeType`
- `config.ts` — env 기반 config + `decisionForScore`
- `hash.ts` — IP/device/세션 해싱 유틸
- `context.ts` — Next request → `RiskContext` 빌더
- `rules/` — extensible rule interface + 9개 builtin rule
- `scoring/` — 6요소 점수 결합(`rule | behavior | velocity | reputation | contentSimilarity | ml`)
- `rate-limit/` — `RateLimiter` interface + in-memory 구현 (Redis 교체 지점)
- `reputation/` — `ReputationStore` interface + in-memory 구현
- `challenge/` — 5종 challenge provider (`delay | re_auth | email_verification | captcha | admin_review`)
- `ai-client/` — `gcinside-ai-inference` HTTP client (timeout + retry + fail-open)
- `audit/` — `AuditSink` interface (콘솔 fallback) → 추후 DB / queue sink 연결
- `repo/` — `RiskDecision` 저장 interface (in-memory 기본)
- `admin/queries.ts` — 어드민 콘솔용 read/write 쿼리
- `telemetry/` — 입력 텔레메트리 sanitizer + 서버 측 임시 store + client collector
- `orchestrator.ts` — `checkAbuseRisk(ctx, opts, deps)` 진입점

## 사용

```ts
import { buildRiskContext, checkAbuseRisk, abuseConfig } from "@/lib/abuse";

const riskCtx = buildRiskContext({
  action: "vote",
  request: req,
  userId: session.userId,
  sessionId: session.email,
});
const risk = await checkAbuseRisk(riskCtx);
if (risk.enforced) return new Response("rate limited", { status: 429 });
```

## 운영 정책

- 기본은 monitor / rate-limit / challenge. `ABUSE_ENABLE_HARD_BLOCK=true` 가 들어와야 hard block.
- AI inference 실패 시 rule 기반으로 fallback (mlScore=null) — `aiFailureReason` 이 audit 에 기록됨.
- IP / device / session id 는 항상 hash 로 저장. 원문은 메모리 안에서만 짧게 사용.
- password 입력은 telemetry 수집 대상에서 제외.
- shadow mode (`ABUSE_SHADOW_MODE=true`) 에서는 결정 계산만 하고 enforce 하지 않음.

## 교체 지점 (interface)

| 부품 | 기본 | 교체 대상 |
|---|---|---|
| `RateLimiter` | InMemoryRateLimiter | Redis 구현 (`gcinside-infra`) |
| `ReputationStore` | InMemoryReputationStore | PG / Redis 구현 |
| `DecisionRepo` | InMemoryDecisionRepo | Prisma + RiskDecisionRecord |
| `AuditSink` | ConsoleAuditSink | DB sink + queue producer (`gcinside-abuse-worker`) |
| `AiInferenceClient` | HTTP fetch | gRPC / batch / 다른 transport |
