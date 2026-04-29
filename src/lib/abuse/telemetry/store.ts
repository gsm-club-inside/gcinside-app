import type { ClientTelemetry } from "../types";

const g = globalThis as unknown as {
  abuseTelemetryStore?: Map<string, { telemetry: ClientTelemetry; storedAt: number }>;
};
const store = g.abuseTelemetryStore ?? new Map();
if (!g.abuseTelemetryStore) g.abuseTelemetryStore = store;

const TTL_MS = 5 * 60_000;

export function putTelemetry(key: string, telemetry: ClientTelemetry) {
  store.set(key, { telemetry, storedAt: Date.now() });
  if (store.size > 5000) gc();
}

export function takeTelemetry(key: string): ClientTelemetry | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > TTL_MS) {
    store.delete(key);
    return undefined;
  }
  store.delete(key);
  return entry.telemetry;
}

function gc() {
  const cutoff = Date.now() - TTL_MS;
  for (const [k, v] of store.entries()) if (v.storedAt < cutoff) store.delete(k);
}
