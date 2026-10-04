import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import { getOptionalUser } from "@/lib/session";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Developers } from "@/components/marketing/developers";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME}: AI recipes by conversation` },
  description:
    "Generate recipes by chatting, refine them in plain language, identify dishes from a photo, and save your favorites. Also available as an API.",
};

export default async function LandingPage() {
  const signedIn = (await getOptionalUser()) !== null;

  return (
    <>
      <Hero signedIn={signedIn} />
      <Features />
      <HowItWorks />
      <Developers signedIn={signedIn} />
      <FinalCta signedIn={signedIn} />
    </>
  );
}