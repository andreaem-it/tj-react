import { redirect } from "next/navigation";

/** Redirect: Privacy e Cookie policy sono ora sulla stessa pagina /privacy. */
export default function CookiePolicyPage() {
  redirect("/privacy");
}
