import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-6 w-full">
      {/* Hero area: 1 grande + 3 colonne */}
      <div className="w-full mb-6 md:mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-2 gap-2 md:gap-3">
          <div className="lg:col-span-6 lg:row-span-2 min-h-[220px] sm:min-h-[280px] lg:min-h-[320px] rounded-lg overflow-hidden">
            <Skeleton className="w-full h-full" />
          </div>
          <div className="lg:col-span-3 lg:row-span-2 min-h-[200px] sm:min-h-[240px] lg:min-h-[320px] rounded-lg overflow-hidden hidden lg:block">
            <Skeleton className="w-full h-full" />
          </div>
          <div className="lg:col-span-3 lg:row-span-2 min-h-[200px] sm:min-h-[240px] lg:min-h-[320px] rounded-lg overflow-hidden hidden lg:block">
            <Skeleton className="w-full h-full" />
          </div>
        </div>
      </div>
      {/* Griglia articoli */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col">
            <Skeleton className="w-full aspect-video rounded-lg mb-3" />
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-full mb-1" />
            <Skeleton className="h-5 w-full max-w-[90%] mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
