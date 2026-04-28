import type { AssetSeries, TimeSeriesPoint } from "@/lib/portfolio";

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function compressToMonthly(points: TimeSeriesPoint[]) {
  const monthly = new Map<string, TimeSeriesPoint>();

  for (const point of points) {
    const date = new Date(point.date);
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const monthEnd = formatDate(endOfMonth(date));
    monthly.set(monthKey, { date: monthEnd, value: point.value });
  }

  return [...monthly.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildDemoSeries(symbol: string, lookback = 37): AssetSeries {
  const base = symbol.charCodeAt(0) + symbol.length * 7;
  const points: TimeSeriesPoint[] = [];

  for (let index = lookback - 1; index >= 0; index -= 1) {
    const date = endOfMonth(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - index, 1)));
    const drift = 100 + (lookback - index) * (base % 9) * 0.4;
    const wobble = Math.sin(index + base) * 4 + Math.cos(index * 0.7 + base) * 2;
    points.push({
      date: formatDate(date),
      value: Number((drift + wobble).toFixed(4))
    });
  }

  return { symbol, prices: points };
}

async function fetchAlphaVantage(symbol: string): Promise<AssetSeries | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_MONTHLY_ADJUSTED");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    next: { revalidate: 43_200 }
  });

  if (!response.ok) throw new Error(`Failed to fetch market data for ${symbol}.`);
  const payload = (await response.json()) as {
    ["Monthly Adjusted Time Series"]?: Record<string, { ["5. adjusted close"]: string }>;
  };

  const series = payload["Monthly Adjusted Time Series"];
  if (!series) return null;

  const prices = Object.entries(series)
    .map(([date, values]) => ({
      date,
      value: Number(values["5. adjusted close"])
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { symbol, prices };
}

async function fetchTwelveData(symbol: string): Promise<AssetSeries | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1month");
  url.searchParams.set("outputsize", "60");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    next: { revalidate: 43_200 }
  });

  if (!response.ok) throw new Error(`Failed to fetch market data for ${symbol}.`);
  const payload = (await response.json()) as {
    values?: Array<{ datetime: string; close: string }>;
  };

  if (!payload.values?.length) return null;

  return {
    symbol,
    prices: payload.values
      .map((entry) => ({
        date: entry.datetime.slice(0, 10),
        value: Number(entry.close)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  };
}

export async function getAssetSeries(symbol: string, lookback = 37): Promise<AssetSeries> {
  const normalized = symbol.trim().toUpperCase();
  const resolved =
    normalized === "US TREASURY 10Y" || normalized === "US TREASURY 10YR"
      ? "IEF"
      : normalized === "S&P 500" || normalized === "^GSPC"
        ? "SPY"
        : normalized;
  const fetched = (await fetchAlphaVantage(resolved)) ?? (await fetchTwelveData(resolved));
  const series = fetched ?? buildDemoSeries(resolved, lookback);

  return {
    symbol: normalized,
    prices: compressToMonthly(series.prices).slice(-lookback)
  };
}
