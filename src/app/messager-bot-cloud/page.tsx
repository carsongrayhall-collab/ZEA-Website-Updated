import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MessagerTerminal } from "@/components/MessagerTerminal";
import { SectionTitle } from "@/components/SectionTitle";

export default function MessagerBotCloudPage() {
  return (
    <main id="top" className="min-h-screen bg-parchment">
      <div className="mx-auto max-w-shell px-4 pb-16 md:px-6">
        <Header />
        <section className="space-y-8 py-12" aria-labelledby="messager-title">
          <div className="mx-auto max-w-[46rem] space-y-5 text-center">
            <SectionTitle id="messager-title" title="Messager Bot Cloud" align="center" />
            <p className="font-body text-[1rem] leading-7 text-text">
              A protected Resend terminal for preparing, previewing, and sending ZEA outreach messages with the approved email footer.
            </p>
          </div>
          <MessagerTerminal />
        </section>
      </div>
      <Footer />
    </main>
  );
}
