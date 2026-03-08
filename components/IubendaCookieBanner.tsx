"use client";

import Script from "next/script";

const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim();
const cookiePolicyId = process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim();
const hasGa = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim());

const IUBENDA_BTN_SELECTOR =
  '.iubenda-tp-btn[data-tp-float="bottom-right"], .iubenda-tp-btn[data-tp-float=bottom-right], .iubenda-uspr-btn[data-tp-float="bottom-right"], .iubenda-uspr-btn[data-tp-float=bottom-right]';

/** Stessa soglia di ScrollToTop: sotto questa scroll il "torna su" è nascosto. */
const SCROLL_THRESHOLD = 400;
const BOTTOM_ALONE = "24px"; /* stesso posto del torna su quando è nascosto */
const BOTTOM_ABOVE = "88px"; /* sopra il torna su quando è visibile */
const POSITION_TRANSITION = "bottom 0.35s ease-out";

function getThemeColors(): {
  sidebarBg: string;
  contentBg: string;
  foreground: string;
  border: string;
  accent: string;
} {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const fallbackDark = {
    sidebarBg: "#252525",
    contentBg: "#2c2f3a",
    foreground: "#ffffff",
    border: "rgba(255,255,255,0.1)",
    accent: "#f5a623",
  };
  const fallbackLight = {
    sidebarBg: "#f3f4f6",
    contentBg: "#ffffff",
    foreground: "#111827",
    border: "rgba(0,0,0,0.12)",
    accent: "#f5a623",
  };
  const fallback = isDark ? fallbackDark : fallbackLight;
  return {
    sidebarBg: getComputedStyle(root).getPropertyValue("--sidebar-bg").trim() || fallback.sidebarBg,
    contentBg: getComputedStyle(root).getPropertyValue("--content-bg").trim() || fallback.contentBg,
    foreground: getComputedStyle(root).getPropertyValue("--foreground").trim() || fallback.foreground,
    border: getComputedStyle(root).getPropertyValue("--border").trim() || fallback.border,
    accent: getComputedStyle(root).getPropertyValue("--accent").trim() || fallback.accent,
  };
}

/** Aggiorna solo la posizione verticale del pulsante iubenda in base allo scroll (stessa soglia del "torna su"). */
function updateIubendaPosition() {
  if (typeof window === "undefined") return;
  const bottom = window.scrollY > SCROLL_THRESHOLD ? BOTTOM_ABOVE : BOTTOM_ALONE;
  const buttons = document.querySelectorAll<HTMLElement>(IUBENDA_BTN_SELECTOR);
  buttons.forEach((el) => {
    const parent = el.parentElement;
    const parentFixed = parent && getComputedStyle(parent).position === "fixed";
    if (parentFixed && parent) {
      parent.style.setProperty("bottom", bottom, "important");
    } else {
      el.style.setProperty("bottom", bottom, "important");
    }
  });
}

function applyIubendaButtonStyles() {
  if (typeof document === "undefined") return;
  const { sidebarBg, contentBg, foreground, border, accent } = getThemeColors();

  const rightPx = "24px";
  const sizePx = "48px";

  const buttons = document.querySelectorAll<HTMLElement>(IUBENDA_BTN_SELECTOR);
  buttons.forEach((el) => {
    const parent = el.parentElement;
    const parentFixed = parent && getComputedStyle(parent).position === "fixed";

    if (parentFixed && parent) {
      parent.style.setProperty("right", rightPx, "important");
      parent.style.setProperty("left", "auto", "important");
      parent.style.setProperty("margin", "0", "important");
      parent.style.setProperty("padding", "0", "important");
      parent.style.setProperty("transform", "none", "important");
      parent.style.setProperty("transition", POSITION_TRANSITION, "important");
      parent.style.setProperty("background-color", sidebarBg, "important");
      parent.style.setProperty("border", `1px solid ${border}`, "important");
      parent.style.setProperty("border-radius", "0.5rem", "important");
      parent.style.setProperty("box-shadow", "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", "important");
      parent.style.setProperty("width", sizePx, "important");
      parent.style.setProperty("height", sizePx, "important");
    }

    el.style.setProperty("position", "absolute", "important");
    el.style.setProperty("bottom", "0", "important");
    el.style.setProperty("right", "0", "important");
    el.style.setProperty("left", "0", "important");
    el.style.setProperty("top", "0", "important");
    el.style.setProperty("margin", "0", "important");
    el.style.setProperty("width", sizePx, "important");
    el.style.setProperty("height", sizePx, "important");
    el.style.setProperty("min-width", "3rem", "important");
    el.style.setProperty("min-height", "3rem", "important");
    el.style.setProperty("background-color", sidebarBg, "important");
    el.style.setProperty("background-repeat", "no-repeat", "important");
    el.style.setProperty("background-position", "center", "important");
    el.style.setProperty("background-size", "22px 22px", "important");
    el.style.setProperty("color", foreground, "important");
    el.style.setProperty("border", `1px solid ${border}`, "important");
    el.style.setProperty("border-radius", "0.5rem", "important");
    el.style.setProperty("box-shadow", "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", "important");
    el.style.setProperty("transition", "background-color 0.2s, color 0.2s, border-color 0.2s", "important");
    el.style.setProperty("transform", "none", "important");

    if (parentFixed) {
      parent.style.setProperty("position", "fixed", "important");
    } else {
      el.style.setProperty("position", "fixed", "important");
      el.style.setProperty("right", rightPx, "important");
      el.style.setProperty("left", "auto", "important");
      el.style.setProperty("top", "auto", "important");
      el.style.setProperty("transition", `background-color 0.2s, color 0.2s, border-color 0.2s, ${POSITION_TRANSITION}`, "important");
      el.style.setProperty("transform", "none", "important");
    }

    if (el.getAttribute("data-iubenda-styled") !== "1") {
      el.setAttribute("data-iubenda-styled", "1");
      el.addEventListener("mouseenter", function onEnter() {
        this.style.setProperty("background-color", contentBg, "important");
        this.style.setProperty("color", accent, "important");
        const p = this.parentElement;
        if (p && getComputedStyle(p).position === "fixed") p.style.setProperty("background-color", contentBg, "important");
      });
      el.addEventListener("mouseleave", function onLeave() {
        this.style.setProperty("background-color", sidebarBg, "important");
        this.style.setProperty("color", foreground, "important");
        const p = this.parentElement;
        if (p && getComputedStyle(p).position === "fixed") p.style.setProperty("background-color", sidebarBg, "important");
      });
    }
  });

  updateIubendaPosition();
}

function scheduleApplyStyles() {
  applyIubendaButtonStyles();
  const t1 = setTimeout(applyIubendaButtonStyles, 300);
  const t2 = setTimeout(applyIubendaButtonStyles, 1000);
  const t3 = setTimeout(applyIubendaButtonStyles, 2000);
  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
  };
}

/**
 * Banner cookie consent iubenda (Privacy Controls and Cookie Solution).
 * Imposta NEXT_PUBLIC_IUBENDA_SITE_ID e NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID in .env.local.
 * Gli ID si trovano in iubenda Dashboard → Privacy Controls and Cookie Solution → Embed.
 */
export default function IubendaCookieBanner() {
  if (!siteId || !cookiePolicyId) return null;

  const csConfiguration: Record<string, unknown> = {
    lang: process.env.NEXT_PUBLIC_IUBENDA_LANG ?? "it",
    siteId: Number(siteId),
    cookiePolicyId: Number(cookiePolicyId),
    enableGdpr: true,
    gdprAppliesGlobally: true,
    perPurposeConsent: true,
    floatingPreferencesButtonDisplay: "bottom-right" as const,
    banner: {
      position: "bottom" as const,
      acceptButtonDisplay: true,
      customizeButtonDisplay: true,
      rejectButtonDisplay: true,
      listPurposes: true,
      showPurposesToggles: true,
    },
  };
  if (hasGa) {
    csConfiguration.callback = {
      onConsentGiven: "__iubendaGaConsentUpdate",
    };
  }

  const configScript = `var _iub = _iub || []; _iub.csConfiguration = ${JSON.stringify(csConfiguration)};`;

  return (
    <>
      <Script id="iubenda-cs-config" strategy="afterInteractive">
        {configScript}
      </Script>
      <Script
        id="iubenda-cs-script"
        src="https://cdn.iubenda.com/cs/iubenda_cs.js"
        strategy="afterInteractive"
        charSet="UTF-8"
        onLoad={() => {
          scheduleApplyStyles();
          /* Aggiorna posizione iubenda allo scroll: stesso posto del "torna su" finché non appare, poi sale con animazione */
          let rafId: number | null = null;
          const onScroll = () => {
            if (rafId != null) return;
            rafId = requestAnimationFrame(() => {
              updateIubendaPosition();
              rafId = null;
            });
          };
          window.addEventListener("scroll", onScroll, { passive: true });
          let observerRafId: number | null = null;
          const observer = new MutationObserver(() => {
            if (observerRafId != null) return;
            observerRafId = requestAnimationFrame(() => {
              applyIubendaButtonStyles();
              observerRafId = null;
            });
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }}
      />
    </>
  );
}
