"use client";

import { FormEvent, useState } from "react";
import { SectionTitle } from "@/components/SectionTitle";

type Risk = { sigma: number; variance: number };
type Result = {
  allocations: Array<{ symbol: string; weight: number; dollars: number; shares: number; color: string }>;
  portfolioRisk: Risk;
  series: Array<{ date: string; gmvp: number; spy: number; equal: number }>;
  riskComparison: { gmvp: Risk; spy: Risk; equal: Risk };
  observations: number;
  backtestStart: string;
  backtestEnd: string;
  asOf: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function Arrow({ direction }: { direction: "left" | "right" }) {
  return <span aria-hidden="true">{direction === "left" ? "←" : "→"}</span>;
}

function AllocationChart({ result }: { result: Result }) {
  let total = 0;
  const stops = result.allocations.flatMap((allocation) => {
    const start = total;
    total += allocation.weight * 100;
    return [`${allocation.color} ${start}%`, `${allocation.color} ${total}%`];
  });

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(180px,0.8fr)_1.2fr] md:items-center">
      <div
        className="mx-auto aspect-square w-full max-w-[230px] rounded-full border border-[rgba(110,31,27,0.16)] shadow-card"
        style={{ background: `conic-gradient(${stops.join(",")})` }}
        role="img"
        aria-label={result.allocations.map((item) => `${item.symbol} ${(item.weight * 100).toFixed(1)} percent`).join(", ")}
      />
      <div className="space-y-3">
        {result.allocations.map((allocation) => (
          <div key={allocation.symbol} className="flex items-start justify-between gap-3 border-b border-[rgba(110,31,27,0.12)] pb-2 text-sm">
            <span className="flex items-center gap-2 font-serif text-lg text-text">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: allocation.color }} />
              {allocation.symbol}
            </span>
            <span className="text-right leading-5">
              {(allocation.weight * 100).toFixed(1)}% · {currency.format(allocation.dollars)}
              <span className="block text-xs text-mutedTone">{allocation.shares.toFixed(3)} shares</span>
            </span>
          </div>
        ))}
        <div className="pt-1 text-xs leading-5 text-mutedTone">
          <span className="mr-4">σ {(result.portfolioRisk.sigma * 100).toFixed(1)}%</span>
          <span>σ² {result.portfolioRisk.variance.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}

function LineChart({ result }: { result: Result }) {
  const width = 620;
  const height = 300;
  const plot = { left: 58, right: 14, top: 18, bottom: 42 };
  const values = result.series.flatMap((point) => [point.gmvp, point.spy, point.equal]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max((high - low) * 0.12, high * 0.04);
  const min = Math.max(0, low - padding);
  const max = high + padding;
  const x = (index: number) => plot.left + index * (width - plot.left - plot.right) / Math.max(result.series.length - 1, 1);
  const y = (value: number) => plot.top + (max - value) * (height - plot.top - plot.bottom) / Math.max(max - min, 1);
  const path = (key: "gmvp" | "spy" | "equal") =>
    result.series.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: 4 }, (_, index) => min + (max - min) * index / 3);
  const dateIndexes = [0, Math.floor((result.series.length - 1) / 2), result.series.length - 1];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_150px]">
      <div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Five-year portfolio backtest">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={plot.left} x2={width - plot.right} y1={y(tick)} y2={y(tick)} stroke="rgba(110,31,27,0.12)" />
              <text x={plot.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#68716d">{currency.format(tick)}</text>
            </g>
          ))}
          <path d={path("gmvp")} fill="none" stroke="#8f201e" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          <path d={path("spy")} fill="none" stroke="#405f75" strokeWidth="2" strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />
          <path d={path("equal")} fill="none" stroke="#9a776f" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {dateIndexes.map((index) => (
            <text key={index} x={x(index)} y={height - 14} textAnchor={index === 0 ? "start" : index === result.series.length - 1 ? "end" : "middle"} fontSize="11" fill="#68716d">
              {new Date(`${result.series[index].date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })}
            </text>
          ))}
        </svg>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-mutedTone">
          <span className="flex items-center gap-2"><span className="h-0.5 w-7 bg-[#8f201e]" />GMVP</span>
          <span className="flex items-center gap-2"><span className="w-7 border-t-2 border-dashed border-[#405f75]" />SPY</span>
          <span className="flex items-center gap-2"><span className="w-7 border-t-2 border-dotted border-[#9a776f]" />Equal weight</span>
        </div>
      </div>
      <div className="space-y-4 border-t border-[rgba(110,31,27,0.16)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        {([
          ["GMVP", result.riskComparison.gmvp],
          ["SPY", result.riskComparison.spy],
          ["1/N", result.riskComparison.equal]
        ] as Array<[string, Risk]>).map(([label, risk]) => (
          <div key={label}>
            <p className="font-serif text-lg text-text">{label}</p>
            <p className="text-xs leading-5 text-mutedTone">σ {(risk.sigma * 100).toFixed(1)}%</p>
            <p className="text-xs leading-5 text-mutedTone">σ² {risk.variance.toFixed(4)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortfolioOptimizer() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [panel, setPanel] = useState<0 | 1>(0);

  const optimize = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setResult(null);
    setPanel(0);

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

  const changePanel = () => setPanel((current) => current === 0 ? 1 : 0);

  return (
    <section id="portfolio-optimizer" aria-labelledby="portfolio-optimizer-title" className="space-y-6 py-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1.15fr] md:items-end">
        <SectionTitle id="portfolio-optimizer-title" title="Portfolio Optimizer" />
        <p className="font-body text-sm leading-6 text-mutedTone md:text-right">
          Build a Global Minimum Variance Portfolio and compare its five-year history with SPY and monthly equal weighting.
        </p>
      </div>

      <div className="section-card grid overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={optimize} className="space-y-5 border-b border-[rgba(110,31,27,0.18)] p-5 md:p-7 lg:border-b-0 lg:border-r">
          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium">Stock symbols</span>
            <input name="symbols" className="field-base" defaultValue="SPY, QQQ, IWM" placeholder="SPY, QQQ, IWM" required />
            <span className="mt-1.5 block text-xs leading-5 text-mutedTone">Enter 2–8 established US-listed symbols, separated by commas.</span>
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium">Investment amount</span>
            <div className="flex">
              <span className="flex w-12 shrink-0 items-center justify-center border border-r-0 border-[rgba(110,31,27,0.5)] bg-[rgba(255,255,255,0.45)] text-mutedTone">$</span>
              <input name="investment" type="number" min="100" max="10000000" step="100" className="field-base min-w-0 flex-1 pl-4" defaultValue="10000" required />
            </div>
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium">Portfolio method</span>
            <select name="method" className="field-base" defaultValue="gmvp">
              <option value="gmvp">Global Minimum Variance Portfolio</option>
            </select>
          </label>
          <button type="submit" disabled={pending} className="w-full border border-burgundy bg-burgundy px-5 py-3 font-serif text-lg text-white transition hover:bg-[#7f0e12] disabled:cursor-wait disabled:opacity-60">
            {pending ? "Running five-year backtest…" : "Build My Allocation"}
          </button>
          <p className="text-[0.7rem] leading-5 text-mutedTone">Educational estimate only. Past performance does not guarantee future results.</p>
        </form>

        <div className="flex min-h-[31rem] flex-col p-5 md:p-7" aria-live="polite">
          {result ? (
            <div className="mb-5 flex items-center justify-between border-b border-[rgba(110,31,27,0.18)] pb-3">
              <button type="button" onClick={changePanel} className="px-2 py-1 text-2xl text-burgundy" aria-label="Previous chart"><Arrow direction="left" /></button>
              <div className="text-center">
                <p className="font-serif text-xl text-burgundy">{panel === 0 ? "Minimum-Variance Allocation" : "Five-Year Backtest"}</p>
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-mutedTone">{panel + 1} of 2</p>
              </div>
              <button type="button" onClick={changePanel} className="px-2 py-1 text-2xl text-burgundy" aria-label="Next chart"><Arrow direction="right" /></button>
            </div>
          ) : null}

          <div className="flex flex-1 flex-col justify-center">
            {error ? (
              <div className="border-l-2 border-burgundy bg-[rgba(155,17,22,0.05)] p-4 text-sm leading-6 text-burgundy">{error}</div>
            ) : result ? (
              panel === 0 ? <AllocationChart result={result} /> : <LineChart result={result} />
            ) : (
              <div className="mx-auto max-w-sm text-center">
                <p className="font-serif text-3xl text-burgundy">Two views, one portfolio.</p>
                <p className="mt-3 font-body text-sm leading-6 text-mutedTone">Run the optimizer to reveal its allocation pie chart, then use the arrows to compare the five-year backtest.</p>
              </div>
            )}
          </div>

          {result ? (
            <p className="mt-5 text-center text-xs leading-5 text-mutedTone">
              {panel === 0
                ? `36 monthly observations through ${new Date(`${result.asOf}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC" })}.`
                : `${result.observations} monthly returns using current GMVP weights; 1/N is rebalanced monthly.`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
