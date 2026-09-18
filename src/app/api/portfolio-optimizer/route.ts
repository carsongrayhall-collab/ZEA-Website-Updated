import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  symbols: z
    .string()
    .trim()
    .min(1)
    .transform((value) => [...new Set(value.toUpperCase().split(/[\s,]+/).filter(Boolean))])
    .refine((symbols) => symbols.length >= 2 && symbols.length <= 8, {
      message: "Enter between 2 and 8 symbols."
    })
    .refine((symbols) => symbols.every((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)), {
      message: "Use valid ticker symbols separated by commas."
    }),
  investment: z.coerce.number().min(100).max(10_000_000),
  method: z.enum(["long_only", "long_short"])
});

type Bar = { c: number; t: string };
type MonthEnd = { date: string; prices: number[]; spy: number };

const PALETTE = ["#8f201e", "#b24b43", "#cf766a", "#7a4b47", "#d7a195", "#622a28", "#b98a80", "#4f3432"];

function covarianceMatrix(returns: number[][]) {
  const columns = returns[0].length;
  const means = Array.from({ length: columns }, (_, column) =>
    returns.reduce((total, row) => total + row[column], 0) / returns.length
  );
  return Array.from({ length: columns }, (_, i) =>
    Array.from({ length: columns }, (__, j) =>
      returns.reduce(
        (total, row) => total + (row[i] - means[i]) * (row[j] - means[j]),
        0
      ) / (returns.length - 1)
    )
  );
}

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

function longOnlyMinimumVariance(covariance: number[][]) {
  let weights = covariance.map(() => 1 / covariance.length);
  const lipschitzBound = 2 * Math.max(
    ...covariance.map((row) => row.reduce((total, value) => total + Math.abs(value), 0))
  );
  const step = lipschitzBound > 0 ? 1 / lipschitzBound : 1;

  for (let iteration = 0; iteration < 5_000; iteration += 1) {
    const gradient = covariance.map((row) =>
      2 * row.reduce((total, value, j) => total + value * weights[j], 0)
    );
    const next = projectToSimplex(weights.map((weight, i) => weight - step * gradient[i]));
    const change = Math.max(...next.map((weight, i) => Math.abs(weight - weights[i])));
    weights = next;
    if (change < 1e-12) break;
  }
  return weights;
}

function solveLinearSystem(matrix: number[][], target: number[]) {
  const augmented = matrix.map((row, i) => [...row, target[i]]);

  for (let column = 0; column < matrix.length; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < matrix.length; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-14) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const divisor = augmented[column][column];
    for (let j = column; j <= matrix.length; j += 1) augmented[column][j] /= divisor;
    for (let row = 0; row < matrix.length; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let j = column; j <= matrix.length; j += 1) {
        augmented[row][j] -= factor * augmented[column][j];
      }
    }
  }

  return augmented.map((row) => row[matrix.length]);
}

function globalMinimumVarianceWeights(covariance: number[][], allowShort: boolean) {
  const averageVariance = covariance.reduce((total, row, i) => total + row[i], 0) / covariance.length;
  const ridge = Math.max(averageVariance * 1e-10, 1e-14);
  const regularized = covariance.map((row, i) => row.map((value, j) => value + (i === j ? ridge : 0)));
  const inverseTimesOne = solveLinearSystem(regularized, covariance.map(() => 1));
  const denominator = inverseTimesOne?.reduce((total, value) => total + value, 0) ?? 0;
  const unconstrained = inverseTimesOne?.map((value) => value / denominator);

  // The unconstrained GMVP has the closed form Σ⁻¹1/(1′Σ⁻¹1).
  if (
    unconstrained &&
    Number.isFinite(denominator) &&
    Math.abs(denominator) > 1e-12 &&
    unconstrained.every((weight) => Number.isFinite(weight))
  ) {
    if (allowShort) return unconstrained;
    if (unconstrained.every((weight) => weight >= -1e-10)) {
      const clipped = unconstrained.map((weight) => Math.max(weight, 0));
      const total = clipped.reduce((sum, weight) => sum + weight, 0);
      return clipped.map((weight) => weight / total);
    }
  }
  if (allowShort) throw new Error("OPTIMIZATION");
  return longOnlyMinimumVariance(covariance);
}

function portfolioVariance(weights: number[], covariance: number[][]) {
  return weights.reduce(
    (total, weight, i) =>
      total + weight * weights.reduce((rowTotal, otherWeight, j) => rowTotal + otherWeight * covariance[i][j], 0),
    0
  );
}

function validateMinimumVariance(weights: number[], covariance: number[][], allowShort: boolean) {
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const equalWeights = weights.map(() => 1 / weights.length);
  const optimizedVariance = portfolioVariance(weights, covariance);
  const equalVariance = portfolioVariance(equalWeights, covariance);
  const tolerance = Math.max(1e-12, Math.abs(equalVariance) * 1e-7);
  const valid =
    weights.every((weight) => Number.isFinite(weight) && (allowShort || weight >= -1e-10)) &&
    Math.abs(sum - 1) < 1e-8 &&
    optimizedVariance <= equalVariance + tolerance;
  if (!valid) throw new Error("OPTIMIZATION");
  return { sum, optimizedVariance, equalVariance };
}

function logReturns(points: MonthEnd[]) {
  return points.slice(1).map((point, index) =>
    point.prices.map((price, column) => Math.log(price / points[index].prices[column]))
  );
}

function annualizedRisk(returns: number[]) {
  const mean = returns.reduce((total, value) => total + value, 0) / returns.length;
  const monthlyVariance = returns.reduce((total, value) => total + (value - mean) ** 2, 0) / (returns.length - 1);
  const variance = monthlyVariance * 12;
  return { sigma: Math.sqrt(Math.max(variance, 0)), variance };
}

async function fetchBars(symbols: string[], start: string, apiKey: string, apiSecret: string) {
  const collected = Object.fromEntries(symbols.map((symbol) => [symbol, [] as Bar[]]));
  let pageToken = "";

  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams({
      symbols: symbols.join(","),
      timeframe: "1Day",
      start,
      adjustment: "all",
      feed: process.env.ALPACA_DATA_FEED || "iex",
      sort: "asc",
      limit: "10000"
    });
    if (pageToken) params.set("page_token", pageToken);

    const response = await fetch(`https://data.alpaca.markets/v2/stocks/bars?${params}`, {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": apiSecret
      },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(response.status === 401 ? "AUTH" : "DATA");

    const payload = (await response.json()) as {
      bars?: Record<string, Bar[]>;
      next_page_token?: string | null;
    };
    for (const symbol of symbols) collected[symbol].push(...(payload.bars?.[symbol] ?? []));
    if (!payload.next_page_token) break;
    pageToken = payload.next_page_token;
  }

  return collected;
}

function toMonthEnds(symbols: string[], bars: Record<string, Bar[]>) {
  const priceMaps = symbols.map(
    (symbol) => new Map(bars[symbol].map((bar) => [bar.t.slice(0, 10), bar.c]))
  );
  const commonDates = [...priceMaps[0].keys()]
    .filter((date) => priceMaps.every((prices) => prices.has(date)))
    .sort();
  const points: MonthEnd[] = [];

  for (const date of commonDates) {
    const prices = priceMaps.map((map) => map.get(date) ?? 0);
    const point = { date, prices: prices.slice(0, -1), spy: prices.at(-1) ?? 0 };
    const month = date.slice(0, 7);
    if (points.at(-1)?.date.slice(0, 7) === month) points[points.length - 1] = point;
    else points.push(point);
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  if (points.at(-1)?.date.slice(0, 7) === currentMonth) points.pop();
  return points;
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

  const { symbols, investment, method } = parsed.data;
  const allowShort = method === "long_short";
  const requestedSymbols = [...new Set([...symbols, "SPY"])];
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 9);

  try {
    const bars = await fetchBars(requestedSymbols, start.toISOString(), apiKey, apiSecret);
    const missing = requestedSymbols.filter((symbol) => (bars[symbol]?.length ?? 0) < 1_000);
    if (missing.length) {
      return Response.json(
        { error: `A five-year backtest needs more history for: ${missing.join(", ")}. Try established symbols.` },
        { status: 422 }
      );
    }

    // Keep one SPY series at the end for the benchmark while preserving the user's asset order.
    const alignedSymbols = [...symbols, "SPY"];
    const alignedBars = Object.fromEntries(alignedSymbols.map((symbol) => [symbol, bars[symbol]]));
    const monthEnds = toMonthEnds(alignedSymbols, alignedBars);
    const backtestStart = new Date();
    backtestStart.setUTCFullYear(backtestStart.getUTCFullYear() - 5);
    const startIndex = monthEnds.findIndex((point) => point.date >= backtestStart.toISOString().slice(0, 10));

    if (startIndex < 3 || monthEnds.length - startIndex < 48) {
      return Response.json({ error: "The selected symbols do not share enough monthly history for this backtest." }, { status: 422 });
    }

    const latestWindow = monthEnds.slice(-37);
    const latestCovariance = covarianceMatrix(logReturns(latestWindow));
    const latestWeights = globalMinimumVarianceWeights(latestCovariance, allowShort);
    const latestSanity = validateMinimumVariance(latestWeights, latestCovariance, allowShort);
    const latestPrices = monthEnds.at(-1)?.prices ?? [];
    const latestVariance = portfolioVariance(latestWeights, latestCovariance) * 12;

    const allocations = symbols.map((symbol, index) => {
      const dollars = latestWeights[index] * investment;
      return {
        symbol,
        weight: latestWeights[index],
        dollars,
        shares: latestPrices[index] ? dollars / latestPrices[index] : 0,
        color: PALETTE[index % PALETTE.length]
      };
    });

    const series = [{ date: monthEnds[startIndex - 1].date, gmvp: investment, spy: investment, equal: investment }];
    const realized = { gmvp: [] as number[], spy: [] as number[], equal: [] as number[] };
    let gmvpValue = investment;
    let spyValue = investment;
    let equalValue = investment;

    for (let i = startIndex; i < monthEnds.length; i += 1) {
      const assetReturns = monthEnds[i].prices.map((price, column) => price / monthEnds[i - 1].prices[column] - 1);
      // Estimate from information available before this month, then rebalance.
      // 37 month-end prices produce at most 36 trailing monthly returns.
      const trainingPoints = monthEnds.slice(Math.max(0, i - 37), i);
      const rollingCovariance = covarianceMatrix(logReturns(trainingPoints));
      const rollingWeights = globalMinimumVarianceWeights(rollingCovariance, allowShort);
      validateMinimumVariance(rollingWeights, rollingCovariance, allowShort);
      const gmvpReturn = rollingWeights.reduce((total, weight, column) => total + weight * assetReturns[column], 0);
      const equalReturn = assetReturns.reduce((total, value) => total + value, 0) / assetReturns.length;
      const spyReturn = monthEnds[i].spy / monthEnds[i - 1].spy - 1;

      gmvpValue *= 1 + gmvpReturn;
      equalValue *= 1 + equalReturn;
      spyValue *= 1 + spyReturn;
      realized.gmvp.push(gmvpReturn);
      realized.equal.push(equalReturn);
      realized.spy.push(spyReturn);
      series.push({ date: monthEnds[i].date, gmvp: gmvpValue, spy: spyValue, equal: equalValue });
    }

    return Response.json({
      allocations,
      method,
      grossExposure: latestWeights.reduce((total, weight) => total + Math.abs(weight), 0),
      portfolioRisk: { sigma: Math.sqrt(Math.max(latestVariance, 0)), variance: latestVariance },
      series,
      riskComparison: {
        gmvp: annualizedRisk(realized.gmvp),
        spy: annualizedRisk(realized.spy),
        equal: annualizedRisk(realized.equal)
      },
      sanityChecks: {
        weightsSum: latestSanity.sum,
        nonNegativeWeights: latestWeights.every((weight) => weight >= 0),
        estimatedAnnualVariance: latestSanity.optimizedVariance * 12,
        equalWeightEstimatedAnnualVariance: latestSanity.equalVariance * 12,
        minimizesAgainstEqualWeight: latestSanity.optimizedVariance <= latestSanity.equalVariance + 1e-12,
        sigmaSquaredIdentity: Math.abs(latestVariance - Math.sqrt(Math.max(latestVariance, 0)) ** 2) < 1e-12,
        rebalanceFrequency: "monthly"
      },
      observations: series.length - 1,
      backtestStart: series[0].date,
      backtestEnd: series.at(-1)?.date,
      asOf: monthEnds.at(-1)?.date
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "AUTH"
      ? "The Alpaca credentials were rejected."
      : error instanceof Error && error.message === "OPTIMIZATION"
        ? "The optimizer failed a variance sanity check. Please try a different symbol set."
        : "Alpaca market data is temporarily unavailable.";
    return Response.json({ error: message }, { status: error instanceof Error && error.message === "OPTIMIZATION" ? 500 : 502 });
  }
}
