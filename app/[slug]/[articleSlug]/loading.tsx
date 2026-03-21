import { Skeleton } from "@/components/Skeleton";

export default function ArticleLoading() {
  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 py-8 w-full">
      <div className="flex flex-col lg:flex-row gap-8">
        <article className="flex-1 min-w-0 bg-content-bg rounded-lg overflow-hidden">
          <Skeleton className="w-full h-[340px] md:h-[400px] rounded-t-lg" />
          <div className="p-6 md:p-8 pt-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-full max-w-2xl mb-2" />
            <Skeleton className="h-8 w-full max-w-[90%] mb-4" />
            <Skeleton className="h-4 w-full mb-6" />
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div>
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </article>
        <aside className="w-full lg:w-[280px] shrink-0">
          <div className="bg-sidebar-bg rounded-lg p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <ul className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <li key={i} className="py-2">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-full" />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
