import { expect, test } from "@playwright/test";

const mockApiUrl = "http://127.0.0.1:3211";

test("macro-like instant enrollment sends empty interaction telemetry and handles delay challenge", async ({
  page,
  request,
}) => {
  await request.post(`${mockApiUrl}/__mock__/reset`);

  await page.goto("/e2e-macro");
  await page.waitForFunction(() => document.documentElement.dataset.e2eHydrated === "true");

  const enrollButton = page.getByRole("button", { name: "신청하기" });
  await expect(enrollButton).toBeEnabled();
  await enrollButton.evaluate((button) => (button as HTMLButtonElement).click());

  await expect
    .poll(async () => {
      const res = await request.get(`${mockApiUrl}/__mock__/attempts`);
      const body = (await res.json()) as { attempts: unknown[] };
      return body.attempts.length;
    })
    .toBe(2);

  const res = await request.get(`${mockApiUrl}/__mock__/attempts`);
  const body = (await res.json()) as {
    enrolled: boolean;
    attempts: Array<{
      clubId: number;
      challengeToken?: string;
      challengeType?: string;
      challengeResponse?: { waited?: boolean };
      telemetry: {
        keydownCount?: number;
        pointerMoveCount?: number;
        pasteUsed?: boolean;
        submitElapsedMs?: number;
      };
    }>;
  };

  const [firstAttempt, challengeAttempt] = body.attempts;

  expect(firstAttempt.clubId).toBe(101);
  expect(firstAttempt.challengeToken).toBeUndefined();
  expect(firstAttempt.telemetry.keydownCount).toBe(0);
  expect(firstAttempt.telemetry.pointerMoveCount).toBe(0);
  expect(firstAttempt.telemetry.pasteUsed).toBe(false);
  expect(firstAttempt.telemetry.submitElapsedMs).toBeLessThan(2_000);

  expect(challengeAttempt.challengeToken).toBe("macro-delay-token");
  expect(challengeAttempt.challengeType).toBe("delay");
  expect(challengeAttempt.challengeResponse?.waited).toBe(true);
  expect(body.enrolled).toBe(true);
  await expect(page.getByRole("button", { name: "신청완료" })).toBeVisible();
});
