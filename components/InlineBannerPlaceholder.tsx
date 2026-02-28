interface InlineBannerPlaceholderProps {
  /** Larghezza (px o "100%" per full width) */
  width?: number | "100%";
  /** Altezza in px */
  height?: number;
  className?: string;
}

export default function InlineBannerPlaceholder({
  width = "100%",
  height = 90,
  className = "",
}: InlineBannerPlaceholderProps) {
  const widthStyle = width === "100%" ? "100%" : `${width}px`;

  return (
    <div
      className={`rounded border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-muted text-xs shrink-0 ${className}`}
      style={{ width: widthStyle, height: `${height}px` }}
      aria-label="Banner pubblicitario"
    >
      <span className="text-center px-2">
        {width === "100%" ? `${height}px · Banner` : `${width}×${height}`}
      </span>
    </div>
  );
}
