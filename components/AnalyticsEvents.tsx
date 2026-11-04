"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

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
      trackEvent("content_load_error", {
        error_type: "javascript",
        error_source: event.filename ? new URL(event.filename, window.location.href).hostname : "unknown",
      });
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("error", onError);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
