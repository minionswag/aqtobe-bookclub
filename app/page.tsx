import { googleSignInConfigured } from "@/auth";
import HomeClient from "@/app/home-client";

export default function HomePage() {
  return <HomeClient googleConfigured={googleSignInConfigured} />;
}
