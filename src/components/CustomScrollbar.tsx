"use client";

import { useEffect, useRef, useState } from "react";

const MIN_THUMB_HEIGHT = 44;
const TRACK_PADDING = 6;

export default function CustomScrollbar() {
  const [metrics, setMetrics] = useState({ visible: false, height: 0, top: 0 });
  const dragStartY = useRef<number | null>(null);
  const dragStartScrollY = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = Math.max(scrollHeight - viewportHeight, 0);

        if (maxScroll <= 1) {
          setMetrics({ visible: false, height: 0, top: 0 });
          return;
        }

        const trackHeight = Math.max(viewportHeight - TRACK_PADDING * 2, 0);
        const thumbHeight = Math.max(
          MIN_THUMB_HEIGHT,
          Math.round((viewportHeight / scrollHeight) * trackHeight)
        );
        const maxThumbTop = Math.max(trackHeight - thumbHeight, 0);
        const thumbTop = Math.round((window.scrollY / maxScroll) * maxThumbTop);

        setMetrics({ visible: true, height: thumbHeight, top: thumbTop });
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(document.body);

    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartY.current = event.clientY;
    dragStartScrollY.current = window.scrollY;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const maxScroll = Math.max(scrollHeight - viewportHeight, 0);
    const trackHeight = Math.max(viewportHeight - TRACK_PADDING * 2, 0);
    const maxThumbTop = Math.max(trackHeight - metrics.height, 1);
    const delta = event.clientY - dragStartY.current;
    const nextScrollY = dragStartScrollY.current + (delta / maxThumbTop) * maxScroll;

    window.scrollTo({ top: nextScrollY, behavior: "auto" });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStartY.current = null;
  };

  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 right-0 bottom-0 z-50 hidden w-3 transition-opacity duration-150 sm:block ${
        metrics.visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className="bg-muted-foreground/35 hover:bg-muted-foreground/55 absolute right-1.5 w-1.5 cursor-grab rounded-full active:cursor-grabbing"
        style={{
          height: metrics.height,
          transform: `translateY(${TRACK_PADDING + metrics.top}px)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
