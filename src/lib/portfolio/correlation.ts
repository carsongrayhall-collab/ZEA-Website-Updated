import type { Matrix } from "@/lib/portfolio/types";

export function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sampleVariance(values: number[]) {
  if (values.length < 2) throw new Error("At least two observations are required.");
  const avg = mean(values);
  const squared = values.reduce((sum, value) => sum + (value - avg) ** 2, 0);
  return squared / (values.length - 1);
}

export function standardDeviation(values: number[]) {
  return Math.sqrt(sampleVariance(values));
}

export function sampleCovariance(a: number[], b: number[]) {
  if (a.length !== b.length) throw new Error("Series length mismatch.");
  if (a.length < 2) throw new Error("At least two observations are required.");

  const meanA = mean(a);
  const meanB = mean(b);
  let sum = 0;

  for (let index = 0; index < a.length; index += 1) {
    sum += (a[index]! - meanA) * (b[index]! - meanB);
  }

  return sum / (a.length - 1);
}

export function pearsonCorrelation(a: number[], b: number[]) {
  const denominator = standardDeviation(a) * standardDeviation(b);
  if (denominator === 0) return 0;
  return sampleCovariance(a, b) / denominator;
}

export function correlationMatrix(data: number[][]): Matrix {
  return data.map((rowA) => data.map((rowB) => pearsonCorrelation(rowA, rowB)));
}
