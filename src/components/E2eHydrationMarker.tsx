"use client";

import { useEffect } from "react";

/**
 * Sets `document.documentElement.dataset.e2eHydrated = "true"` once mounted, so
 * Playwright specs can wait for the harness page to actually hydrate before
 * driving it. Only used in /e2e-* harness routes (gated by E2E_HARNESS=1).
 */
export default function E2eHydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.e2eHydrated = "true";
    return () => {
      delete document.documentElement.dataset.e2eHydrated;
    };
  }, []);
  return null;
}
