import { Suspense } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import HeaderSkeleton from "@/components/HeaderSkeleton";
import Footer from "@/components/Footer";
import BannerPlaceholder from "@/components/BannerPlaceholder";

const ScrollToTop = dynamic(() => import("@/components/ScrollToTop"), { ssr: false });
const NewsletterModal = dynamic(() => import("@/components/NewsletterModal"), { ssr: false });

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="flex-1 flex w-full justify-center min-w-0 min-h-0 px-[10px] sm:px-4 xl:px-12 gap-6 xl:gap-10">
        <BannerPlaceholder
          side="left"
          width={160}
          minHeight={600}
          adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_LEFT}
        />
        <div className="flex-1 min-w-0 flex justify-center">
          {children}
        </div>
        <BannerPlaceholder
          side="right"
          width={160}
          minHeight={600}
          adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_RIGHT}
        />
      </main>
      <Footer />
      <NewsletterModal />
      <ScrollToTop />
    </>
  );
}
