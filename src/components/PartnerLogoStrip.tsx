import Image from "next/image";

export interface PartnerLogo {
  src: string;
  alt: string;
}

export function PartnerLogoStrip({ logos }: { logos: PartnerLogo[] }) {
  return (
    <section aria-labelledby="partners-title" className="space-y-8">
      <h2 id="partners-title" className="font-serif text-[2rem] text-burgundy">
        Carrier Access
      </h2>
      <div className="grid grid-cols-2 items-center gap-x-10 gap-y-12 sm:grid-cols-4">
        {logos.map((logo) => (
          <div key={logo.alt} className="flex h-28 items-center justify-center p-2">
            <div className="relative h-24 w-full max-w-[11rem]">
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                sizes="(max-width: 640px) 42vw, (max-width: 1024px) 26vw, 220px"
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
