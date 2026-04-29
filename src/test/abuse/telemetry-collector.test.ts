import { describe, expect, it } from "vitest";
import { createTelemetryCollector } from "@/lib/abuse/telemetry/collector.client";

function fire(target: Element | Document, type: string, init: Record<string, unknown> = {}) {
  // jsdom does not support PointerEvent.constructor across all node versions;
  // synthesise a generic Event and decorate it with the right fields.
  const ev = new Event(type, { bubbles: true });
  Object.assign(ev, init);
  target.dispatchEvent(ev);
}

describe("telemetry collector (browser)", () => {
  it("counts keydowns, ignores password inputs, and tracks paste", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const input = document.createElement("input");
    input.type = "text";
    const password = document.createElement("input");
    password.type = "password";
    root.append(input, password);

    const c = createTelemetryCollector();
    const detach = c.attach(root);

    fire(input, "keydown");
    fire(input, "keydown");
    fire(password, "keydown"); // ignored — sensitive
    fire(input, "paste");
    fire(input, "focusin");
    fire(input, "focusout");
    fire(input, "pointermove", { clientX: 0, clientY: 0 });
    fire(input, "pointermove", { clientX: 3, clientY: 4 }); // distance += 5
    fire(input, "scroll");
    fire(document, "visibilitychange");

    const snap = c.snapshot();
    expect(snap.keydownCount).toBe(2);
    expect(snap.pasteUsed).toBe(true);
    expect(snap.focusCount).toBe(1);
    expect(snap.blurCount).toBe(1);
    expect(snap.pointerMoveCount).toBe(2);
    expect(snap.pointerDistance).toBe(5);
    expect(snap.scrollCount).toBe(1);
    expect(snap.visibilityChangeCount).toBe(1);
    expect(snap.submitElapsedMs).toBeGreaterThanOrEqual(0);

    detach();
    fire(input, "keydown"); // after detach: ignored
    expect(c.snapshot().keydownCount).toBe(2);

    c.reset();
    expect(c.snapshot().keydownCount).toBe(0);
    expect(c.snapshot().pasteUsed).toBe(false);

    document.body.removeChild(root);
  });

  it("computes typing intervals when keys come in over time", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const c = createTelemetryCollector();
    c.attach(root);

    fire(root, "keydown");
    await new Promise((r) => setTimeout(r, 10));
    fire(root, "keydown");
    await new Promise((r) => setTimeout(r, 10));
    fire(root, "keydown");

    const snap = c.snapshot();
    expect(snap.typingIntervalAvg).toBeGreaterThanOrEqual(0);
    expect(snap.typingIntervalVariance).toBeGreaterThanOrEqual(0);
    document.body.removeChild(root);
  });
});
