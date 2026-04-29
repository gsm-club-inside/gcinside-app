import { NextRequest } from "next/server";

export function publicUrl(path: string, req: NextRequest): URL {
  return new URL(path, process.env.APP_BASE_URL ?? req.url);
}
