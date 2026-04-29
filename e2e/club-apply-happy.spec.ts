import { expect, test } from "@playwright/test";
import { configureMock, getMockState, mockApiUrl, resetMock } from "./helpers";

test("happy-path enrollment with human-like telemetry passes without a challenge", async ({
  page,
  request,
}) => {
  await resetMock(request);
  await configureMock(request, { requireChallenge: false });

  await page.goto("/e2e-macro");
  await page.waitForFunction(() => document.documentElement.dataset.e2eHydrated === "true");

  // Human-style interaction: focus, light typing, mouse movement, slight delay.
  await page.locator("body").click({ position: { x: 50, y: 50 } });
  await page.keyboard.type("hello world", { delay: 25 });
  await page.mouse.move(100, 200, { steps: 5 });
  await page.waitForTimeout(900);

  const enrollButton = page.getByRole("button", { name: "신청하기" });
  await expect(enrollButton).toBeEnabled();
  await enrollButton.click();

  await expect
    .poll(async () => (await getMockState(request)).attempts.length, { timeout: 5_000 })
    .toBe(1);

  const state = await getMockState(request);
  const [attempt] = state.attempts as Array<{
    challengeToken?: string;
    telemetry: {
      keydownCount?: number;
      pointerMoveCount?: number;
      submitElapsedMs?: number;
    };
  }>;

  expect(attempt.challengeToken).toBeUndefined();
  expect(attempt.telemetry.keydownCount).toBeGreaterThan(0);
  expect(attempt.telemetry.pointerMoveCount).toBeGreaterThan(0);
  expect(attempt.telemetry.submitElapsedMs).toBeGreaterThan(500);
  expect(state.enrolled).toBe(true);

  await expect(page.getByRole("button", { name: "신청완료" })).toBeVisible();
  // sanity: the spec did not accidentally hit the mock from outside the browser
  expect(mockApiUrl).toContain("3211");
});
