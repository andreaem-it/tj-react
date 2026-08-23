import FeatureGate from "@/components/FeatureGate";

export default function TopicLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate flag="topicHubs">{children}</FeatureGate>;
}
