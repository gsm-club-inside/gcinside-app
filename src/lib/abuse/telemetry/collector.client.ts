"use client";

import type { ClientTelemetry } from "../types";

interface TelemetryState {
  startedAt: number;
  keydownCount: number;
  pasteUsed: boolean;
  focusCount: number;
  blurCount: number;
  pointerMoveCount: number;
  pointerDistance: number;
  scrollCount: number;
  visibilityChangeCount: number;
  intervals: number[];
  lastKeyAt: number | null;
  lastPointer: { x: number; y: number } | null;
}

export interface TelemetryHandle {
  attach(target: HTMLElement | Document): () => void;
  snapshot(): ClientTelemetry;
  reset(): void;
}

const SENSITIVE_TYPES = new Set(["password"]);

export function createTelemetryCollector(): TelemetryHandle {
  const state: TelemetryState = {
    startedAt: Date.now(),
    keydownCount: 0,
    pasteUsed: false,
    focusCount: 0,
    blurCount: 0,
    pointerMoveCount: 0,
    pointerDistance: 0,
    scrollCount: 0,
    visibilityChangeCount: 0,
    intervals: [],
    lastKeyAt: null,
    lastPointer: null,
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
    const t = (target?.type ?? "").toLowerCase();
    if (target && "type" in target && SENSITIVE_TYPES.has(t)) return;
    state.keydownCount++;
    const now = Date.now();
    if (state.lastKeyAt !== null) state.intervals.push(Math.min(60_000, now - state.lastKeyAt));
    state.lastKeyAt = now;
  };
  const onPaste = (_e: ClipboardEvent) => {
    state.pasteUsed = true;
  };
  const onFocusIn = () => {
    state.focusCount++;
  };
  const onFocusOut = () => {
    state.blurCount++;
  };
  const onPointerMove = (e: PointerEvent) => {
    state.pointerMoveCount++;
    if (state.lastPointer) {
      const dx = e.clientX - state.lastPointer.x;
      const dy = e.clientY - state.lastPointer.y;
      state.pointerDistance += Math.sqrt(dx * dx + dy * dy);
    }
    state.lastPointer = { x: e.clientX, y: e.clientY };
  };
  const onScroll = () => {
    state.scrollCount++;
  };
  const onVisibility = () => {
    state.visibilityChangeCount++;
  };

  const attach = (target: HTMLElement | Document): (() => void) => {
    target.addEventListener("keydown", onKeyDown as EventListener, { passive: true });
    target.addEventListener("paste", onPaste as EventListener, { passive: true });
    target.addEventListener("focusin", onFocusIn as EventListener, { passive: true });
    target.addEventListener("focusout", onFocusOut as EventListener, { passive: true });
    target.addEventListener("pointermove", onPointerMove as EventListener, { passive: true });
    target.addEventListener("scroll", onScroll as EventListener, { passive: true });
    document.addEventListener("visibilitychange", onVisibility, { passive: true });
    return () => {
      target.removeEventListener("keydown", onKeyDown as EventListener);
      target.removeEventListener("paste", onPaste as EventListener);
      target.removeEventListener("focusin", onFocusIn as EventListener);
      target.removeEventListener("focusout", onFocusOut as EventListener);
      target.removeEventListener("pointermove", onPointerMove as EventListener);
      target.removeEventListener("scroll", onScroll as EventListener);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  };

  const snapshot = (): ClientTelemetry => {
    const intervals = state.intervals;
    const avg =
      intervals.length === 0 ? 0 : intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.length === 0
        ? 0
        : intervals.reduce((a, b) => a + (b - avg) ** 2, 0) / intervals.length;
    const elapsed = Date.now() - state.startedAt;
    const entropy = computeEntropy(intervals);
    return {
      typingIntervalAvg: avg,
      typingIntervalVariance: variance,
      keydownCount: state.keydownCount,
      pasteUsed: state.pasteUsed,
      focusCount: state.focusCount,
      blurCount: state.blurCount,
      pointerMoveCount: state.pointerMoveCount,
      pointerDistance: Math.round(state.pointerDistance),
      scrollCount: state.scrollCount,
      visibilityChangeCount: state.visibilityChangeCount,
      movementEntropy: entropy,
      submitElapsedMs: elapsed,
    };
  };

  const reset = () => {
    state.startedAt = Date.now();
    state.keydownCount = 0;
    state.pasteUsed = false;
    state.focusCount = 0;
    state.blurCount = 0;
    state.pointerMoveCount = 0;
    state.pointerDistance = 0;
    state.scrollCount = 0;
    state.visibilityChangeCount = 0;
    state.intervals = [];
    state.lastKeyAt = null;
    state.lastPointer = null;
  };

  return { attach, snapshot, reset };
}

function computeEntropy(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  const buckets = new Array<number>(10).fill(0);
  for (const v of intervals) {
    const idx = Math.min(9, Math.floor(Math.log10(Math.max(1, v))));
    buckets[idx]++;
  }
  const total = intervals.length;
  let h = 0;
  for (const b of buckets) {
    if (b === 0) continue;
    const p = b / total;
    h -= p * Math.log2(p);
  }
  return h;
}
