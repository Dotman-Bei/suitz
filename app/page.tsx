import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhyItMatters } from "@/components/sections/WhyItMatters";
import { DecryptExplainer } from "@/components/sections/DecryptExplainer";
import { AddPair } from "@/components/sections/AddPair";
import { Faq } from "@/components/sections/Faq";
import { CtaBand } from "@/components/sections/CtaBand";

export default function Page() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhyItMatters />
      <DecryptExplainer />
      <AddPair />
      <Faq />
      <CtaBand />
    </>
  );
}
