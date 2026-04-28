import { sampleCovariance, sampleVariance } from "@/lib/portfolio/correlation";
import type { Matrix } from "@/lib/portfolio/types";

export function singleIndexCovariance(assetReturns: number[][], marketReturns: number[]): Matrix {
  const marketVariance = sampleVariance(marketReturns);

  return assetReturns.map((assetA, rowIndex) =>
    assetReturns.map((assetB, colIndex) => {
      if (rowIndex === colIndex) return sampleVariance(assetA);

      const betaA = sampleCovariance(assetA, marketReturns) / marketVariance;
      const betaB = sampleCovariance(assetB, marketReturns) / marketVariance;
      return betaA * betaB * marketVariance;
    })
  );
}
