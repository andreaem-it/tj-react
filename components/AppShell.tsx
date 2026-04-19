import { Suspense } from "react";
import Header from "@/components/Header";
import HeaderSkeleton from "@/components/HeaderSkeleton";
import Footer from "@/components/Footer";
import BannerPlaceholder from "@/components/BannerPlaceholder";
import NonCriticalWidgets from "@/components/NonCriticalWidgets";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const leftSkyscraperSlot =
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_LEFT ??
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_RIGHT;
  const rightSkyscraperSlot =
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_RIGHT ??
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_LEFT;

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
          adSlot={leftSkyscraperSlot}
        />
        <div className="flex-1 min-w-0 flex justify-center">
          {children}
        </div>
        <BannerPlaceholder
          side="right"
          width={160}
          minHeight={600}
          adSlot={rightSkyscraperSlot}
        />
      </main>
      <Footer />
      <NonCriticalWidgets />
    </>
  );
}
