import { standardDeviation } from "@/lib/portfolio/correlation";
import { covarianceMatrix } from "@/lib/portfolio/covariance";
import type { Matrix } from "@/lib/portfolio/types";

export function constantCorrelationCovariance(data: number[][], corr: number): Matrix {
  if (Math.abs(corr) >= 1) {
    return covarianceMatrix(data);
  }

  const deviations = data.map((series) => standardDeviation(series));

  return data.map((_, rowIndex) =>
    data.map((__, colIndex) => {
      if (rowIndex === colIndex) return deviations[rowIndex]! ** 2;
      return corr * deviations[rowIndex]! * deviations[colIndex]!;
    })
  );
}
