import { expect, test } from "@playwright/test";
import { getMockState, proxyApiToMock, resetMock } from "./helpers";

test("학생이 동아리 생성 신청 → mock-api 가 PENDING 으로 보관한다", async ({ page, request }) => {
  await resetMock(request);
  await proxyApiToMock(page);

  await page.goto("/e2e-club-request");
  await page.waitForFunction(() => document.documentElement.dataset.e2eHydrated === "true");

  await page.getByRole("button", { name: "자율동아리 생성" }).click();

  // form fields are inside the dialog
  await page.getByLabel("동아리명").fill("새 댄스부");
  await page.getByLabel("설명").fill("매주 화요일 모이는 댄스 동아리");
  await page.getByLabel("1학년 정원").fill("3");
  await page.getByLabel("2·3학년 정원").fill("4");

  await page.getByRole("button", { name: "요청하기" }).click();

  await expect
    .poll(async () => (await getMockState(request)).clubRequests.length, { timeout: 5_000 })
    .toBe(1);

  const state = await getMockState(request);
  const created = state.clubRequests[0] as {
    name: string;
    description: string;
    grade1Capacity: number;
    grade23Capacity: number;
    status: string;
  };
  expect(created.name).toBe("새 댄스부");
  expect(created.grade1Capacity).toBe(3);
  expect(created.grade23Capacity).toBe(4);
  expect(created.status).toBe("PENDING");

  // success closes the dialog — re-open and confirm the new request renders
  await page.getByRole("button", { name: "자율동아리 생성" }).click();
  await expect(page.getByText("새 댄스부")).toBeVisible();
  await expect(page.getByText("검토중")).toBeVisible();
});
