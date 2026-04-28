import type { AssetSeries, ReturnSeries } from "@/lib/portfolio/types";

export function alignSeries(series: AssetSeries[]): AssetSeries[] {
  if (series.length === 0) return [];

  const sharedDates = series.reduce<Set<string>>((acc, current, index) => {
    const dates = new Set(current.prices.map((point) => point.date));
    if (index === 0) return dates;
    return new Set([...acc].filter((date) => dates.has(date)));
  }, new Set<string>());

  return series.map((asset) => ({
    ...asset,
    prices: asset.prices
      .filter((point) => sharedDates.has(point.date))
      .sort((a, b) => a.date.localeCompare(b.date))
  }));
}

export function toMonthlyReturns(series: AssetSeries[]): ReturnSeries[] {
  return alignSeries(series).map((asset) => {
    const returns: number[] = [];
    const dates: string[] = [];

    for (let index = 1; index < asset.prices.length; index += 1) {
      const previous = asset.prices[index - 1]?.value;
      const current = asset.prices[index]?.value;

      if (!previous || !current) continue;

      returns.push(current / previous - 1);
      dates.push(asset.prices[index]!.date);
    }

    return {
      symbol: asset.symbol,
      returns,
      dates
    };
  });
}
