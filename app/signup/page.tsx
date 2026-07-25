import { redirect } from "next/navigation";

export default function SignupShortcutPage() {
  redirect("/auth/sign-up");
}
