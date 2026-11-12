"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { errorDetails, reportClientDiagnostic } from "@/lib/diagnostics/client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * GA4 uses enhanced measurement for page views, including App Router history
 * changes. This component only records business interactions that GA4 cannot
 * infer reliably: Price Radar interactions and outbound affiliate clicks.
 */
export default function AnalyticsEvents() {
  useEffect(() => {
    const sourceHost = (source: string | null | undefined) => {
      if (!source) return "unknown";
      try {
        return new URL(source, window.location.href).hostname || "inline";
      } catch {
        return "unknown";
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || !window.gtag) return;
      const path = new URL(link.href, window.location.href).pathname;

      const article = link.closest<HTMLElement>("[data-article-id]");
      const common = article
        ? {
            article_id: article.dataset.articleId,
            article_category: article.dataset.articleCategory,
            article_author: article.dataset.articleAuthor,
            content_type: article.dataset.contentType,
          }
        : {};
      const contentSource = link.closest<HTMLElement>("[data-content-source]")?.dataset.contentSource;

      if (contentSource && link.origin === window.location.origin) {
        trackEvent("select_content", {
          content_type: "article",
          content_id: path,
          content_source: contentSource,
          ...common,
        });
      }

      if (/^\/price-radar\/[A-Z0-9]{10}$/i.test(path)) {
        window.gtag("event", "price_radar_view_item", {
          item_id: path.split("/").pop(),
        });
      }

      let url: URL;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (!/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) return;

      trackEvent("price_radar_affiliate_click", {
        merchant: "amazon",
        item_id: url.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1],
        link_position: contentSource ?? (article ? "article_body" : "site"),
        destination_domain: url.hostname,
        link_type: link.querySelector("button") ? "button" : "link",
        ...common,
      });
    };

    const onError = (event: ErrorEvent) => {
      const details = errorDetails(event.error ?? event.message);
      trackEvent("javascript_error", {
        error_type: details.errorType,
        error_source: sourceHost(event.filename),
      });
      reportClientDiagnostic({
        eventName: "javascript_error",
        errorType: details.errorType,
        message: details.message,
        stack: details.stack,
        source: event.filename,
        context: event.lineno ? `line:${event.lineno}:${event.colno}` : "window_error",
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const details = errorDetails(event.reason);
      trackEvent("javascript_error", { error_type: "unhandled_rejection", error_source: "promise" });
      reportClientDiagnostic({
        eventName: "unhandled_rejection",
        errorType: details.errorType,
        message: details.message,
        stack: details.stack,
        context: "window_unhandledrejection",
      });
    };

    const onResourceError = (event: Event) => {
      const element = event.target;
      if (!(element instanceof HTMLElement)) return;
      const tag = element.tagName.toLowerCase();
      const source =
        element instanceof HTMLImageElement
          ? element.currentSrc || element.src
          : element instanceof HTMLScriptElement
            ? element.src
            : element instanceof HTMLLinkElement
              ? element.href
              : element instanceof HTMLMediaElement
                ? element.currentSrc || element.src
                : null;
      if (!source) return;
      const isContent = tag === "img" || tag === "audio" || tag === "video";
      const eventName = isContent ? "content_load_error" : "resource_load_error";
      trackEvent(eventName, { error_type: tag, error_source: sourceHost(source) });
      reportClientDiagnostic({
        eventName,
        errorType: tag,
        message: `Impossibile caricare la risorsa ${tag}`,
        source,
        context: isContent ? "content_asset" : "page_resource",
      });
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("error", onResourceError, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("error", onResourceError, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
