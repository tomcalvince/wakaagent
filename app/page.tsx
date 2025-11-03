import { redirect } from "next/navigation";

export default function Home() {
  // Always redirect to login - the login page will handle redirecting to dashboard if already logged in
  redirect("/login");
}
