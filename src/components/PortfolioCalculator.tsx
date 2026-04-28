"use client";

import { useState, useTransition } from "react";
import { PortfolioDonut } from "@/components/PortfolioDonut";
import { SectionTitle } from "@/components/SectionTitle";

interface PortfolioResponse {
  symbols: string[];
  weights: number[];
  variance: number;
  volatility: number;
  equalWeightVolatility: number;
  covarianceMethod: string;
  coverage: string;
  usedRegularization: boolean;
}

const defaultResult: PortfolioResponse = {
  symbols: ["AAPL", "TSLA", "MSFT"],
  weights: [0.42, 0.34, 0.24],
  variance: 0.0019,
  volatility: 0.0436,
  equalWeightVolatility: 0.0518,
  covarianceMethod: "sample",
  coverage: "Demo data, trailing 36 monthly observations",
  usedRegularization: false
};

export function PortfolioCalculator() {
  const [result, setResult] = useState<PortfolioResponse>(defaultResult);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"long-only" | "allow-short">("long-only");
  const [method, setMethod] = useState<"sample" | "constant-correlation" | "single-index">("sample");

  const onSubmit = async (formData: FormData) => {
    setError(null);

    startTransition(async () => {
      const payload = {
        stock1: String(formData.get("stock1") ?? ""),
        stock2: String(formData.get("stock2") ?? ""),
        stock3: String(formData.get("stock3") ?? ""),
        mode,
        covarianceMethod: method
      };

      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as PortfolioResponse & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to calculate portfolio.");
        return;
      }

      setResult(data);
    });
  };

  return (
    <section className="space-y-6" aria-labelledby="portfolio-title">
      <SectionTitle id="portfolio-title" title="Minimized Risk Portfolio Calculator" />
      <div className="grid items-stretch gap-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="section-card flex min-h-[38rem] flex-col justify-between p-6 md:min-h-[44rem]">
          <PortfolioDonut labels={result.symbols} weights={result.weights} />
          <div className="space-y-5 border-t border-[rgba(110,31,27,0.12)] pt-5 text-[0.95rem] leading-8 text-text">
            <div>
              <p>Volatility in an equally weighted portfolio</p>
              <p className="font-serif text-[1.1rem] text-burgundy">
                {(result.equalWeightVolatility * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p>Volatility after risk adjustment</p>
              <p className="font-serif text-[1.1rem] text-burgundy">
                {(result.volatility * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <form
          action={onSubmit}
          className="space-y-5"
        >
          <input
            name="stock1"
            defaultValue="AAPL"
            className="field-base min-h-[6rem] text-[1.05rem] md:text-[1.15rem]"
            placeholder="Stock 1 ticker"
            aria-label="Stock 1 ticker"
          />
          <input
            name="stock2"
            defaultValue="TSLA"
            className="field-base min-h-[6rem] text-[1.05rem] md:text-[1.15rem]"
            placeholder="Stock 2 ticker"
            aria-label="Stock 2 ticker"
          />
          <input
            name="stock3"
            defaultValue="MSFT"
            className="field-base min-h-[6rem] text-[1.05rem] md:text-[1.15rem]"
            placeholder="Optional third stock"
            aria-label="Optional third stock ticker"
          />
          <p className="text-sm text-mutedTone">Benchmark fixed to S&amp;P 500.</p>

          <div className="grid gap-3 pt-1 text-sm text-text">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="portfolioMode"
                checked={mode === "long-only"}
                onChange={() => setMode("long-only")}
              />
              Long only portfolio
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="portfolioMode"
                checked={mode === "allow-short"}
                onChange={() => setMode("allow-short")}
              />
              Allow short selling
            </label>
          </div>

          <label className="block text-sm text-text">
            Covariance method
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as typeof method)}
              className="field-base mt-2"
            >
              <option value="sample">Sample covariance</option>
              <option value="constant-correlation">Constant correlation covariance</option>
              <option value="single-index">Single index covariance</option>
            </select>
          </label>

          <p className="text-xs italic text-mutedTone">*Enter Two or Three Stocks</p>

          <button
            type="submit"
            disabled={isPending}
            className="border border-burgundy px-5 py-2 font-serif text-burgundy transition hover:bg-[rgba(110,31,27,0.06)] disabled:opacity-60"
          >
            {isPending ? "Calculating..." : "Calculate"}
          </button>

          <div className="space-y-2 text-sm text-text">
            <p>Variance: {result.variance.toFixed(6)}</p>
            <p>Method: {result.covarianceMethod}</p>
            <p>Coverage: {result.coverage}</p>
            <p>Benchmark: S&amp;P 500</p>
            {result.usedRegularization ? <p>Regularization applied to stabilize Sigma.</p> : null}
          </div>

          {error ? <p className="text-sm text-burgundy">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}
