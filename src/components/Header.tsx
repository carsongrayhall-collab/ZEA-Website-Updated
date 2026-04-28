import Image from "next/image";

export function Header() {
  return (
    <header className="flex items-center justify-between gap-6 border-b border-[rgba(110,31,27,0.18)] py-5 md:py-6">
      <a href="/" className="relative block h-16 w-40 shrink-0 md:h-20 md:w-48">
        <Image
          src="/images/rt1-logo-cropped.png"
          alt="ZEA Brokers"
          fill
          sizes="(max-width: 768px) 160px, 192px"
          className="object-contain object-left"
          priority
        />
      </a>
      <nav aria-label="Primary" className="flex items-center gap-5 font-serif text-sm tracking-editorial text-burgundy md:gap-7">
        <a href="/solutions" className="transition-opacity hover:opacity-70 focus-visible:underline">
          Solutions
        </a>
        <a href="/#contact" className="transition-opacity hover:opacity-70 focus-visible:underline">
          Contact
        </a>
      </nav>
    </header>
  );
}
