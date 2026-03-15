import { redirect } from "next/navigation";

/** Redirect: non abbiamo una pagina Termini separata; reindirizziamo a Chi siamo. */
export default function TerminiPage() {
  redirect("/chi-siamo");
}
