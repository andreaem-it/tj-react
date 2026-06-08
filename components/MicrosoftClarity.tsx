"use client";

import { useEffect, useState } from "react";

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
const GA_NEED_EVENT = "techjournal:ga-needed";
const hasIubendaConfig =
  Boolean(process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim());

/**
 * Microsoft Clarity (heatmap / session replay) via @microsoft/clarity.
 * Imposta NEXT_PUBLIC_CLARITY_PROJECT_ID in .env.local (dashboard Clarity → Settings → Setup).
 * Con Iubenda inizializza solo dopo consenso "measurement" (stesso evento di GA).
 */
export default function MicrosoftClarity() {
  const [shouldInit, setShouldInit] = useState(false);
  const enabled = Boolean(projectId);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let cancelled = false;

    const enable = () => {
      if (cancelled) return;
      setShouldInit(true);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
      window.removeEventListener(GA_NEED_EVENT, onMeasurementAllowed);
    };

    const onFirstInteraction = () => enable();
    const onMeasurementAllowed = () => enable();

    if (!hasIubendaConfig) {
      window.addEventListener("pointerdown", onFirstInteraction, { once: true, passive: true });
      window.addEventListener("keydown", onFirstInteraction, { once: true });
      window.addEventListener("scroll", onFirstInteraction, { once: true, passive: true });
    }
    window.addEventListener(GA_NEED_EVENT, onMeasurementAllowed, { once: true });

    return () => {
      cancelled = true;
      if (!hasIubendaConfig) {
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
        window.removeEventListener("scroll", onFirstInteraction);
      }
      window.removeEventListener(GA_NEED_EVENT, onMeasurementAllowed);
    };
  }, [enabled]);

  useEffect(() => {
    if (!shouldInit || !projectId || typeof window === "undefined") return;

    let cancelled = false;

    const initClarity = async () => {
      if (cancelled) return;
      const { default: Clarity } = await import("@microsoft/clarity");
      if (cancelled) return;
      Clarity.init(projectId);
      Clarity.consentV2({ ad_Storage: "granted", analytics_Storage: "granted" });
    };

    const runWhenIdle = () => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        const idleId = window.requestIdleCallback(() => void initClarity(), { timeout: 2000 });
        return () => window.cancelIdleCallback(idleId);
      }
      const timer = setTimeout(() => void initClarity(), 1);
      return () => clearTimeout(timer);
    };

    let cancelIdle: (() => void) | undefined;

    const onLoad = () => {
      cancelIdle = runWhenIdle();
    };

    if (document.readyState === "complete") {
      cancelIdle = runWhenIdle();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      cancelIdle?.();
    };
  }, [shouldInit, projectId]);

  return null;
}
