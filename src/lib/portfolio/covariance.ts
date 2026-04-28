import { sampleCovariance } from "@/lib/portfolio/correlation";
import type { Matrix } from "@/lib/portfolio/types";

export function covarianceMatrix(data: number[][]): Matrix {
  return data.map((rowA) => data.map((rowB) => sampleCovariance(rowA, rowB)));
}
