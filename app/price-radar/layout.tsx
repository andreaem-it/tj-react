import FeatureGate from "@/components/FeatureGate";

export default function PriceRadarLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate flag="priceRadar">{children}</FeatureGate>;
}
