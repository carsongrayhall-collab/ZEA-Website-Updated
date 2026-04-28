import Image from "next/image";
import { Header } from "@/components/Header";
import { SectionTitle } from "@/components/SectionTitle";
import { ContentSlider } from "@/components/ContentSlider";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";
import {
  whatIDoSlides,
  whoIAmCopy,
  whySlides
} from "@/lib/content";

export default function HomePage() {
  const coverageHighlights = [
    "Annuity",
    "Employee Benefit",
    "Life",
    "Business",
    "Medical",
    "Umbrella"
  ];

  return (
    <main id="top" className="min-h-screen bg-parchment">
      <div className="mx-auto max-w-shell px-4 pb-16 md:px-6">
        <Header />

        <section className="grid gap-10 pb-12 pt-8 lg:grid-cols-[1.02fr_1fr]" id="solutions">
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="section-card relative aspect-square overflow-hidden">
                <Image
                  src="/images/headshot-new.png"
                  alt="Portrait of a ZEA Brokers advisor"
                  fill
                  sizes="(max-width: 1024px) 100vw, 420px"
                  quality={100}
                  priority
                  className="object-cover object-center"
                />
              </div>
              <p className="text-[0.7rem] tracking-[0.06em] text-mutedTone">
                ZEA Brokers, transparent insurance guidance for protection, benefits, and insurer growth.
              </p>
            </div>

            <ContentSlider slides={whySlides} minHeight={400} />

            <div className="relative aspect-[1.8] overflow-hidden md:-mx-12 md:scale-[1.28]">
              <Image
                src="/images/wave.svg"
                alt="Decorative wave graphic"
                fill
                sizes="(max-width: 1024px) 100vw, 620px"
                className="object-contain"
              />
            </div>
          </div>

          <div className="space-y-10 lg:pt-20">
            <section className="space-y-5 pt-2 lg:pt-10">
              <SectionTitle id="who-i-am-title" title="ZEA Brokers" align="center" />
              <p className="mx-auto max-w-[34ch] text-center font-body text-[0.95rem] leading-7 text-text">
                {whoIAmCopy}
              </p>
            </section>

            <div className="relative aspect-[1.82] overflow-hidden md:-mx-20 md:scale-[1.56] lg:-mx-24 lg:scale-[1.66]">
              <Image
                src="/images/globe.svg"
                alt="Decorative coverage network globe"
                fill
                sizes="(max-width: 1024px) 100vw, 860px"
                className="object-contain"
              />
            </div>

            <section className="space-y-5 lg:pt-[100px]">
              <ContentSlider slides={whatIDoSlides} minHeight={300} titleAlign="right" />
            </section>
          </div>
        </section>

        <div className="space-y-12 pb-8">
          <section aria-labelledby="coverage-title" className="space-y-6">
            <h2 id="coverage-title" className="font-serif text-[2rem] text-burgundy">
              Transparent Coverage Areas
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {coverageHighlights.map((item) => (
                <div
                  key={item}
                  className="section-card flex min-h-20 items-center justify-center px-3 text-center font-serif text-[1.15rem] text-burgundy"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
          <ContactForm />
        </div>
      </div>
      <Footer />
    </main>
  );
}
