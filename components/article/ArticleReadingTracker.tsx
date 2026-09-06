"use client";

import { useEffect } from "react";
import { reachedReadingCheckpoint, readingDepthPercent } from "@/lib/analytics/reading";

const SESSION_KEY = "tj-reading-session-v1";

function visitorKey(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID().replaceAll("-", "");
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export default function ArticleReadingTracker({ postId, targetId }: { postId: number; targetId: string }) {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const key = visitorKey();
    let maxDepth = 0;
    let lastCheckpoint = 0;
    let activeMs = 0;
    let activeSince = document.visibilityState === "visible" ? performance.now() : null;
    let frame: number | null = null;

    const activeSeconds = () => Math.round((activeMs + (activeSince == null ? 0 : performance.now() - activeSince)) / 1000);
    const payload = () => JSON.stringify({
      postId,
      visitorKey: key,
      maxDepth,
      completed: maxDepth >= 90,
      activeSeconds: activeSeconds(),
    });
    const report = (beacon = false) => {
      const body = payload();
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/article-reading", new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch("/api/analytics/article-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    };
    const measure = () => {
      frame = null;
      const rect = target.getBoundingClientRect();
      maxDepth = Math.max(maxDepth, readingDepthPercent({
        elementTop: rect.top + window.scrollY,
        elementHeight: rect.height,
        viewportBottom: window.scrollY + window.innerHeight,
      }));
      const checkpoint = reachedReadingCheckpoint(maxDepth, lastCheckpoint);
      if (checkpoint != null) {
        lastCheckpoint = checkpoint;
        report();
      }
    };
    const scheduleMeasure = () => {
      if (frame == null) frame = requestAnimationFrame(measure);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (activeSince != null) activeMs += performance.now() - activeSince;
        activeSince = null;
        report(true);
      } else if (activeSince == null) {
        activeSince = performance.now();
      }
    };
    const onPageHide = () => report(true);

    measure();
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [postId, targetId]);

  return null;
}
