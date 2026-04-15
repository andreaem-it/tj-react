"use client";

import dynamic from "next/dynamic";

const ScrollToTop = dynamic(() => import("@/components/ScrollToTop"), { ssr: false });
const NewsletterModal = dynamic(() => import("@/components/NewsletterModal"), { ssr: false });

export default function NonCriticalWidgets() {
  return (
    <>
      <NewsletterModal />
      <ScrollToTop />
    </>
  );
}
