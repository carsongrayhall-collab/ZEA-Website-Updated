import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  symbols: z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
      [...new Set(value.toUpperCase().split(/[\s,]+/).filter(Boolean))]
    )
    .refine((symbols) => symbols.length >= 2 && symbols.length <= 8, {
      message: "Enter between 2 and 8 symbols."
    })
    .refine((symbols) => symbols.every((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)), {
      message: "Use valid ticker symbols separated by commas."
    }),
  investment: z.coerce.number().min(100).max(10_000_000),
  riskProfile: z.enum(["conservative", "balanced", "growth"])
});

type Bar = { c: number; t: string };

const riskAversion = {
  conservative: 12,
  balanced: 5,
  growth: 1.8
} as const;

function projectToSimplex(values: number[]) {
  const sorted = [...values].sort((a, b) => b - a);
  let sum = 0;
  let threshold = 0;

  for (let i = 0; i < sorted.length; i += 1) {
    sum += sorted[i];
    const candidate = (sum - 1) / (i + 1);
    if (i === sorted.length - 1 || sorted[i + 1] <= candidate) {
      threshold = candidate;
      break;
    }
  }

  return values.map((value) => Math.max(value - threshold, 0));
}

function optimizeWeights(means: number[], covariance: number[][], aversion: number) {
  let weights = means.map(() => 1 / means.length);

  for (let iteration = 0; iteration < 600; iteration += 1) {
    const gradient = means.map((mean, i) => {
      const riskContribution = covariance[i].reduce(
        (total, value, j) => total + value * weights[j],
        0
      );
      return mean - 2 * aversion * riskContribution;
    });
    const step = 0.08 / Math.sqrt(iteration + 1);
    weights = projectToSimplex(weights.map((weight, i) => weight + step * gradient[i]));
  }

  return weights;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Check your inputs and try again." },
      { status: 400 }
    );
  }

  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;
  if (!apiKey || !apiSecret) {
    return Response.json(
      { error: "Live market data is not configured yet. Add the Alpaca API keys in Vercel to activate calculations." },
      { status: 503 }
    );
  }

  const { symbols, investment, riskProfile } = parsed.data;
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const params = new URLSearchParams({
    symbols: symbols.join(","),
    timeframe: "1Day",
    start: start.toISOString(),
    adjustment: "all",
    feed: process.env.ALPACA_DATA_FEED || "iex",
    limit: "10000"
  });

  try {
    const response = await fetch(`https://data.alpaca.markets/v2/stocks/bars?${params}`, {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": apiSecret
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return Response.json(
        { error: response.status === 401 ? "The Alpaca credentials were rejected." : "Alpaca market data is temporarily unavailable." },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as { bars?: Record<string, Bar[]> };
    const bars = payload.bars ?? {};
    const missing = symbols.filter((symbol) => !bars[symbol] || bars[symbol].length < 30);
    if (missing.length) {
      return Response.json(
        { error: `Not enough market history for: ${missing.join(", ")}. Try other symbols.` },
        { status: 422 }
      );
    }

    const returnMaps = symbols.map((symbol) => {
      const series = bars[symbol];
      return new Map(
        series.slice(1).map((bar, index) => [
          bar.t.slice(0, 10),
          Math.log(bar.c / series[index].c)
        ])
      );
    });
    const commonDates = [...returnMaps[0].keys()].filter((date) =>
      returnMaps.every((returns) => returns.has(date))
    );

    if (commonDates.length < 30) {
      return Response.json({ error: "The selected symbols do not share enough trading history." }, { status: 422 });
    }

    const matrix = commonDates.map((date) => returnMaps.map((returns) => returns.get(date) ?? 0));
    const dailyMeans = symbols.map((_, column) =>
      matrix.reduce((total, row) => total + row[column], 0) / matrix.length
    );
    const annualMeans = dailyMeans.map((mean) => mean * 252);
    const annualCovariance = symbols.map((_, i) =>
      symbols.map((__, j) => {
        const covariance = matrix.reduce(
          (total, row) => total + (row[i] - dailyMeans[i]) * (row[j] - dailyMeans[j]),
          0
        ) / (matrix.length - 1);
        return covariance * 252;
      })
    );
    const weights = optimizeWeights(annualMeans, annualCovariance, riskAversion[riskProfile]);
    const expectedReturn = weights.reduce((total, weight, i) => total + weight * annualMeans[i], 0);
    const variance = weights.reduce(
      (total, weight, i) =>
        total + weight * weights.reduce((rowTotal, otherWeight, j) => rowTotal + otherWeight * annualCovariance[i][j], 0),
      0
    );

    const allocations = symbols.map((symbol, index) => {
      const latestPrice = bars[symbol].at(-1)?.c ?? 0;
      const dollars = weights[index] * investment;
      return {
        symbol,
        weight: weights[index],
        dollars,
        shares: latestPrice ? dollars / latestPrice : 0
      };
    });

    return Response.json({
      allocations,
      expectedReturn,
      volatility: Math.sqrt(Math.max(variance, 0)),
      observations: commonDates.length,
      asOf: new Date().toISOString()
    });
  } catch {
    return Response.json({ error: "The optimizer could not reach live market data. Please try again." }, { status: 502 });
  }
}
