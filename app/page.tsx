import { redirect } from "next/navigation";

// Redirige vers la page de login — logique d'auth dans F-003
export default function RootPage() {
  redirect("/login");
}
