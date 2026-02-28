interface BannerPlaceholderProps {
  side: "left" | "right";
  /** Larghezza in px (es. 160 per skyscraper, 300 per medium rectangle) */
  width?: number;
  /** Altezza minima in px per l'area placeholder */
  minHeight?: number;
}

export default function BannerPlaceholder({
  side,
  width = 160,
  minHeight = 600,
}: BannerPlaceholderProps) {
  return (
    <aside
      className="hidden xl:flex flex-col shrink-0 justify-start pt-6 sticky top-[120px]"
      style={{ width: `${width}px`, minHeight: `${minHeight}px` }}
      aria-label={`Banner pubblicitario ${side === "left" ? "sinistro" : "destro"}`}
    >
      <div
        className="w-full rounded border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-muted text-xs"
        style={{ minHeight: `${Math.min(minHeight, 600)}px` }}
      >
        <span className="text-center px-2">
          {width}×{Math.min(minHeight, 600)}
          <br />
          Banner
        </span>
      </div>
    </aside>
  );
}
