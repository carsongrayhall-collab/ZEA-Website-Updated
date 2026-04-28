import { NextResponse } from "next/server";
import { getAssetSeries } from "@/lib/market-data";
import {
  alignSeries,
  constantCorrelationCovariance,
  correlationMatrix,
  covarianceMatrix,
  gmvpWeightsLongOnly,
  gmvpWeightsUnconstrained,
  portfolioVariance,
  singleIndexCovariance,
  toMonthlyReturns
} from "@/lib/portfolio";
import { portfolioRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = portfolioRequestSchema.parse(await request.json());
    const stockSymbols = [payload.stock1, payload.stock2, payload.stock3].filter(Boolean);

    if (stockSymbols.length < 2) {
      return NextResponse.json(
        { error: "Please enter at least two stock tickers." },
        { status: 400 }
      );
    }

    const assetSeries = await Promise.all(stockSymbols.map((symbol) => getAssetSeries(symbol)));
    const benchmark = await getAssetSeries("S&P 500");

    const alignedSeries = alignSeries([...assetSeries, benchmark]);
    const alignedBenchmark = alignedSeries[alignedSeries.length - 1]!;
    const alignedAssets = alignedSeries.slice(0, -1);
    const assetReturns = toMonthlyReturns(alignedAssets);
    const benchmarkReturns = toMonthlyReturns([alignedBenchmark])[0];

    if (!benchmarkReturns || assetReturns.some((series) => series.returns.length < 12)) {
      return NextResponse.json(
        { error: "Insufficient overlapping monthly history for the requested symbols." },
        { status: 400 }
      );
    }

    const assetData = assetReturns.map((series) => series.returns);
    const benchmarkData = benchmarkReturns.returns;
    const correlations = correlationMatrix(assetData);
    const offDiagonal = correlations.flatMap((row, rowIndex) =>
      row.filter((_, colIndex) => colIndex > rowIndex)
    );
    const avgCorrelation =
      offDiagonal.length > 0
        ? offDiagonal.reduce((sum, value) => sum + value, 0) / offDiagonal.length
        : 0;

    let sigma = covarianceMatrix(assetData);
    if (payload.covarianceMethod === "constant-correlation") {
      sigma = constantCorrelationCovariance(assetData, avgCorrelation);
    }
    if (payload.covarianceMethod === "single-index") {
      sigma = singleIndexCovariance(assetData, benchmarkData);
    }

    let usedRegularization = false;
    let weights: number[];

    try {
      weights =
        payload.mode === "long-only"
          ? gmvpWeightsLongOnly(sigma)
          : gmvpWeightsUnconstrained(sigma);
    } catch {
      usedRegularization = true;
      sigma = sigma.map((row, index) =>
        row.map((value, col) => value + (index === col ? 1e-5 : 0))
      );
      weights =
        payload.mode === "long-only"
          ? gmvpWeightsLongOnly(sigma)
          : gmvpWeightsUnconstrained(sigma);
    }

    const variance = portfolioVariance(weights, sigma);
    const equalWeight = Array.from({ length: weights.length }, () => 1 / weights.length);
    const equalWeightVariance = portfolioVariance(equalWeight, sigma);
    const dates = assetReturns[0]?.dates ?? [];

    return NextResponse.json({
      symbols: alignedAssets.map((asset) => asset.symbol),
      weights,
      variance,
      volatility: Math.sqrt(Math.max(variance, 0)),
      equalWeightVolatility: Math.sqrt(Math.max(equalWeightVariance, 0)),
      covarianceMethod: payload.covarianceMethod,
      coverage: `${dates[0] ?? "n/a"} to ${dates[dates.length - 1] ?? "n/a"} (${dates.length} monthly returns)`,
      usedRegularization
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to calculate portfolio."
      },
      { status: 400 }
    );
  }
}
