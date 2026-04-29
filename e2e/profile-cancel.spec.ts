import { expect, test } from "@playwright/test";
import { getMockState, proxyApiToMock, resetMock } from "./helpers";

test("프로필에서 신청 취소를 누르면 DELETE /api/enrollments/{id} 가 호출된다", async ({
  page,
  request,
}) => {
  await resetMock(request);
  await proxyApiToMock(page);

  await page.goto("/e2e-profile");
  await page.waitForFunction(() => document.documentElement.dataset.e2eHydrated === "true");

  // both rows render
  await expect(page.getByText("밴드부")).toBeVisible();
  await expect(page.getByText("코딩부")).toBeVisible();

  // open confirm dialog for the first row, then confirm cancel
  const cancelButtons = page.getByRole("button", { name: "취소" });
  await cancelButtons.first().click();
  await page.getByRole("button", { name: "취소하기" }).click();

  await expect
    .poll(async () => (await getMockState(request)).cancelledEnrollmentIds.length, {
      timeout: 5_000,
    })
    .toBe(1);

  const state = await getMockState(request);
  expect(state.cancelledEnrollmentIds).toContain(11);

  // optimistic UI removes the row
  await expect(page.getByText("밴드부")).toHaveCount(0);
  await expect(page.getByText("코딩부")).toBeVisible();
});
