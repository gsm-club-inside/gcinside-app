import { expect, test } from "@playwright/test";
import { configureMock, getMockState, proxyApiToMock, resetMock } from "./helpers";

test("관리자가 PENDING 신청을 승인하면 mock-api 가 APPROVED 액션을 기록한다", async ({
  page,
  request,
}) => {
  await resetMock(request);
  await configureMock(request, {
    role: "ADMIN",
    clubRequestsByAdmin: [
      {
        id: 42,
        name: "검토 대상 동아리",
        description: "관리자 e2e 테스트",
        grade1Capacity: 5,
        grade23Capacity: 5,
        isOpen: true,
        status: "PENDING",
        rejectionReason: null,
        createdAt: new Date().toISOString(),
        requester: {
          name: "신청자",
          studentNumber: 31010,
          grade: 3,
          classNum: 1,
          number: 10,
        },
        reviewer: null,
        club: null,
      },
    ],
  });
  await proxyApiToMock(page);

  await page.goto("/e2e-admin");
  await page.waitForFunction(() => document.documentElement.dataset.e2eHydrated === "true");

  await expect(page.getByText("검토 대상 동아리")).toBeVisible();

  await page.getByRole("button", { name: "승인" }).click();

  await expect
    .poll(async () => (await getMockState(request)).adminRequestActions.length, { timeout: 5_000 })
    .toBe(1);

  const [action] = (await getMockState(request)).adminRequestActions as Array<{
    id: number;
    action: "approve" | "reject";
  }>;
  expect(action.id).toBe(42);
  expect(action.action).toBe("approve");
});
