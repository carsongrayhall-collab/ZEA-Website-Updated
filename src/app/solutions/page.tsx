import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SectionTitle } from "@/components/SectionTitle";

const protectionItems = [
  "Retirement planning and annuity strategies",
  "Term life, whole life, and IUL solutions",
  "Medical and employee medical coverage",
  "COBRA policy guidance",
  "Transparent plan comparisons from start to finish"
];

const insurerItems = [
  "Appointment setting with qualified prospects",
  "Lead generation for insurers and agency partners",
  "Clear campaign reporting and performance feedback",
  "Transparent handoff from outreach to carrier or agency follow-up"
];

export default function SolutionsPage() {
  return (
    <main id="top" className="min-h-screen bg-parchment">
      <div className="mx-auto max-w-shell px-4 pb-16 md:px-6">
        <Header />

        <section className="space-y-8 py-12" aria-labelledby="solutions-title">
          <div className="mx-auto max-w-[46rem] space-y-5 text-center">
            <SectionTitle id="solutions-title" title="Solutions" align="center" />
            <p className="font-body text-[1rem] leading-7 text-text">
              ZEA Brokers builds every relationship around transparency. Whether we are helping a
              client protect a family or helping an insurer reach the right conversations, we make
              the process clear, documented, and easy to understand.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="section-card space-y-5 p-6" aria-labelledby="protection-title">
              <h2 id="protection-title" className="font-serif text-[2rem] text-burgundy">
                For Protection
              </h2>
              <p className="font-body text-[0.96rem] leading-7 text-text">
                ZEA provides best-in-market protection solutions for retirement planning, life
                insurance, whole life, term life, IULs, medical coverage, employee medical plans,
                and COBRA policies. We walk each client through the protection process with complete
                transparency, explaining why each option may fit, what it costs, where it is limited,
                and how it supports the client&apos;s long-term goals.
              </p>
              <ul className="space-y-3 font-body text-[0.95rem] leading-7 text-text">
                {protectionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="section-card space-y-5 p-6" aria-labelledby="insurers-title">
              <h2 id="insurers-title" className="font-serif text-[2rem] text-burgundy">
                For Insurers
              </h2>
              <p className="font-body text-[0.96rem] leading-7 text-text">
                ZEA supports insurers with appointment setting and lead generation designed to
                create better conversations, not noisy volume. We focus on transparent outreach,
                clear expectations, and qualified opportunities so insurers can spend more time
                serving the right prospects and less time sorting through unclear demand.
              </p>
              <ul className="space-y-3 font-body text-[0.95rem] leading-7 text-text">
                {insurerItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
