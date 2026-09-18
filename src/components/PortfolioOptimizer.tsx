"use client";

import { FormEvent, useState } from "react";
import { SectionTitle } from "@/components/SectionTitle";

type Result = {
  allocations: Array<{ symbol: string; weight: number; dollars: number; shares: number }>;
  expectedReturn: number;
  volatility: number;
  observations: number;
  asOf: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export function PortfolioOptimizer() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const optimize = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setResult(null);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/portfolio-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries()))
      });
      const data = (await response.json()) as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to optimize this portfolio.");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to optimize this portfolio.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section id="portfolio-optimizer" aria-labelledby="portfolio-optimizer-title" className="space-y-6 py-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1.15fr] md:items-end">
        <SectionTitle id="portfolio-optimizer-title" title="Portfolio Optimizer" />
        <p className="font-body text-sm leading-6 text-mutedTone md:text-right">
          Turn a shortlist of investments into a risk-aware allocation using one year of live Alpaca market data.
        </p>
      </div>

      <div className="section-card grid overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={optimize} className="space-y-5 border-b border-[rgba(110,31,27,0.18)] p-5 md:p-7 lg:border-b-0 lg:border-r">
          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium">Stock symbols</span>
            <input name="symbols" className="field-base" defaultValue="SPY, QQQ, IWM" placeholder="SPY, QQQ, IWM" required />
            <span className="mt-1.5 block text-xs leading-5 text-mutedTone">Enter 2–8 US-listed symbols, separated by commas.</span>
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium">Investment amount</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mutedTone">$</span>
              <input name="investment" type="number" min="100" max="10000000" step="100" className="field-base pl-7" defaultValue="10000" required />
            </div>
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium">Risk profile</span>
            <select name="riskProfile" className="field-base" defaultValue="balanced">
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="growth">Growth</option>
            </select>
          </label>
          <button type="submit" disabled={pending} className="w-full border border-burgundy bg-burgundy px-5 py-3 font-serif text-lg text-white transition hover:bg-[#7f0e12] disabled:cursor-wait disabled:opacity-60">
            {pending ? "Optimizing…" : "Build My Allocation"}
          </button>
          <p className="text-[0.7rem] leading-5 text-mutedTone">Educational estimate only. Past performance does not guarantee future results.</p>
        </form>

        <div className="flex min-h-[28rem] flex-col justify-center p-5 md:p-7" aria-live="polite">
          {error ? (
            <div className="border-l-2 border-burgundy bg-[rgba(155,17,22,0.05)] p-4 text-sm leading-6 text-burgundy">{error}</div>
          ) : result ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-6 border-b border-[rgba(110,31,27,0.18)] pb-5">
                <div><p className="text-xs uppercase tracking-[0.12em] text-mutedTone">Expected return</p><p className="font-serif text-3xl text-burgundy">{(result.expectedReturn * 100).toFixed(1)}%</p></div>
                <div><p className="text-xs uppercase tracking-[0.12em] text-mutedTone">Est. volatility</p><p className="font-serif text-3xl text-text">{(result.volatility * 100).toFixed(1)}%</p></div>
              </div>
              <div className="space-y-4">
                {result.allocations.map((allocation) => (
                  <div key={allocation.symbol}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <strong className="font-serif text-lg text-text">{allocation.symbol}</strong>
                      <span>{(allocation.weight * 100).toFixed(1)}% · {currency.format(allocation.dollars)} · {allocation.shares.toFixed(3)} shares</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[rgba(110,31,27,0.1)]"><div className="h-full rounded-full bg-burgundy" style={{ width: `${Math.max(allocation.weight * 100, 0.5)}%` }} /></div>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-5 text-mutedTone">Based on {result.observations} shared trading days through {new Date(result.asOf).toLocaleDateString()}.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-sm text-center">
              <p className="font-serif text-3xl text-burgundy">A clearer starting point.</p>
              <p className="mt-3 font-body text-sm leading-6 text-mutedTone">Choose the securities you are considering, set your budget and risk posture, and receive an allocation sized in dollars and fractional shares.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
