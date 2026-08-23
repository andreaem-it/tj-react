import FeatureGate from "@/components/FeatureGate";

export default function CompatibilityLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate flag="compatibility">{children}</FeatureGate>;
}
