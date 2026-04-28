import type { Matrix } from "@/lib/portfolio/types";

function identity(size: number): Matrix {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (row === col ? 1 : 0))
  );
}

function clone(matrix: Matrix) {
  return matrix.map((row) => [...row]);
}

export function regularizeSigma(sigma: Matrix, lambda = 1e-6): Matrix {
  return sigma.map((row, rowIndex) =>
    row.map((value, colIndex) => value + (rowIndex === colIndex ? lambda : 0))
  );
}

export function invertMatrix(matrix: Matrix): Matrix {
  const size = matrix.length;
  const augmented = clone(matrix).map((row, index) => [...row, ...identity(size)[index]!]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot;

    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row]![pivot]!) > Math.abs(augmented[maxRow]![pivot]!)) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow]![pivot]!) < 1e-12) {
      throw new Error("Covariance matrix is singular.");
    }

    [augmented[pivot], augmented[maxRow]] = [augmented[maxRow]!, augmented[pivot]!];

    const pivotValue = augmented[pivot]![pivot]!;
    for (let col = 0; col < size * 2; col += 1) {
      augmented[pivot]![col] = augmented[pivot]![col]! / pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row]![pivot]!;
      for (let col = 0; col < size * 2; col += 1) {
        augmented[row]![col] = augmented[row]![col]! - factor * augmented[pivot]![col]!;
      }
    }
  }

  return augmented.map((row) => row.slice(size));
}

function multiplyMatrixVector(matrix: Matrix, vector: number[]) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index]!, 0));
}

function dotProduct(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => sum + value * b[index]!, 0);
}

function pickSubmatrix(matrix: Matrix, indices: number[]) {
  return indices.map((row) => indices.map((col) => matrix[row]![col]!));
}

function expandWeights(weights: number[], indices: number[], size: number) {
  const expanded = Array.from({ length: size }, () => 0);
  indices.forEach((index, weightIndex) => {
    expanded[index] = weights[weightIndex]!;
  });
  return expanded;
}

function enumerateSubsets(size: number) {
  const subsets: number[][] = [];

  for (let mask = 1; mask < 1 << size; mask += 1) {
    const subset: number[] = [];
    for (let bit = 0; bit < size; bit += 1) {
      if (mask & (1 << bit)) subset.push(bit);
    }
    subsets.push(subset);
  }

  return subsets;
}

export function gmvpWeightsUnconstrained(sigma: Matrix): number[] {
  const regularized = regularizeSigma(sigma);
  const inverse = invertMatrix(regularized);
  const ones = Array.from({ length: regularized.length }, () => 1);
  const numerator = multiplyMatrixVector(inverse, ones);
  const denominator = dotProduct(ones, numerator);

  return numerator.map((value) => value / denominator);
}

export function gmvpWeightsLongOnly(sigma: Matrix): number[] {
  const size = sigma.length;
  const regularized = regularizeSigma(sigma);
  let bestWeights: number[] | null = null;
  let bestVariance = Number.POSITIVE_INFINITY;

  for (const subset of enumerateSubsets(size)) {
    try {
      const subsetSigma = pickSubmatrix(regularized, subset);
      const subsetWeights = gmvpWeightsUnconstrained(subsetSigma);

      if (subsetWeights.some((weight) => weight < -1e-9)) {
        continue;
      }

      const clippedWeights = subsetWeights.map((weight) => (weight < 0 ? 0 : weight));
      const expanded = expandWeights(clippedWeights, subset, size);
      const variance = portfolioVariance(expanded, regularized);

      if (variance < bestVariance) {
        bestVariance = variance;
        bestWeights = expanded;
      }
    } catch {
      continue;
    }
  }

  if (!bestWeights) {
    throw new Error("Unable to solve long-only minimum-variance portfolio.");
  }

  const totalWeight = bestWeights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Long-only weights did not produce a valid solution.");
  }

  return bestWeights.map((weight) => weight / totalWeight);
}

export function portfolioVariance(weights: number[], sigma: Matrix) {
  let variance = 0;
  for (let row = 0; row < sigma.length; row += 1) {
    for (let col = 0; col < sigma.length; col += 1) {
      variance += weights[row]! * sigma[row]![col]! * weights[col]!;
    }
  }
  return variance;
}
