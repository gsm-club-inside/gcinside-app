import type { APIRequestContext, Page } from "@playwright/test";

export const mockApiUrl = "http://127.0.0.1:3211";

/**
 * Proxy every `**\/api/**` browser request from the page to the e2e mock-api
 * server. Used by harness specs that exercise components which use bare
 * `/api/...` paths (i.e. not `apiUrl()` from `client-api.ts`).
 */
export async function proxyApiToMock(page: Page): Promise<void> {
  await page.route("**/api/**", async (route, req) => {
    const url = new URL(req.url());
    const target = `${mockApiUrl}${url.pathname}${url.search}`;
    const init: RequestInit = {
      method: req.method(),
      headers: { ...req.headers(), host: new URL(mockApiUrl).host },
    };
    const body = req.postData();
    if (body !== null && body !== undefined) init.body = body;
    const r = await fetch(target, init);
    const text = await r.text();
    await route.fulfill({
      status: r.status,
      headers: Object.fromEntries(r.headers),
      body: text,
    });
  });
}

export async function resetMock(request: APIRequestContext): Promise<void> {
  await request.post(`${mockApiUrl}/__mock__/reset`);
}

export async function configureMock(
  request: APIRequestContext,
  overrides: Record<string, unknown>
): Promise<void> {
  await request.post(`${mockApiUrl}/__mock__/configure`, { data: overrides });
}

export async function getMockState(request: APIRequestContext): Promise<{
  attempts: Array<Record<string, unknown>>;
  enrolled: boolean;
  clubRequests: Array<Record<string, unknown>>;
  adminRequestActions: Array<Record<string, unknown>>;
  cancelledEnrollmentIds: number[];
}> {
  const res = await request.get(`${mockApiUrl}/__mock__/attempts`);
  return res.json();
}
