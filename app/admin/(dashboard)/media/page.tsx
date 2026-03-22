import type { Metadata } from "next";
import MediaGallery from "./MediaGallery";

export const metadata: Metadata = {
  title: "Libreria media",
  description: "Galleria media – TechJournal Admin",
};

export default function AdminMediaPage() {
  return <MediaGallery />;
}
