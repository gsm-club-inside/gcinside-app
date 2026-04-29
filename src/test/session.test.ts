import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("iron-session", () => ({
  getIronSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSession, getSessionFromRequest } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

const ironMock = getIronSession as unknown as ReturnType<typeof vi.fn>;
const cookiesMock = cookies as unknown as ReturnType<typeof vi.fn>;

const ENV_SAVED: Record<string, string | undefined> = {};

beforeEach(() => {
  ENV_SAVED.SESSION_SECRET = process.env.SESSION_SECRET;
  ENV_SAVED.SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE;
  process.env.SESSION_SECRET = "x".repeat(32);
  ironMock.mockReset();
  cookiesMock.mockReset();
});

afterEach(() => {
  for (const k of Object.keys(ENV_SAVED)) {
    if (ENV_SAVED[k] === undefined) delete process.env[k];
    else process.env[k] = ENV_SAVED[k];
  }
});

describe("session", () => {
  it("getSession passes the cookie store and config to iron-session", async () => {
    const cookieStore = { fake: true };
    cookiesMock.mockResolvedValue(cookieStore);
    ironMock.mockResolvedValue({ userId: 7 });

    const s = await getSession();
    expect(s).toEqual({ userId: 7 });
    expect(cookiesMock).toHaveBeenCalledTimes(1);
    const [storeArg, opts] = ironMock.mock.calls[0]!;
    expect(storeArg).toBe(cookieStore);
    expect(opts.cookieName).toBe("club_session");
    expect(opts.cookieOptions.httpOnly).toBe(true);
    expect(opts.cookieOptions.sameSite).toBe("lax");
  });

  it("getSessionFromRequest forwards request and response", async () => {
    ironMock.mockResolvedValue({ userId: 8 });
    const req = new NextRequest("http://localhost/foo");
    const res = NextResponse.next();
    const s = await getSessionFromRequest(req, res);
    expect(s).toEqual({ userId: 8 });
    const [reqArg, resArg] = ironMock.mock.calls[0]!;
    expect(reqArg).toBe(req);
    expect(resArg).toBe(res);
  });
});
