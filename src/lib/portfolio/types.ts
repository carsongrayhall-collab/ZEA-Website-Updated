export type Matrix = number[][];

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface AssetSeries {
  symbol: string;
  prices: TimeSeriesPoint[];
}

export interface ReturnSeries {
  symbol: string;
  returns: number[];
  dates: string[];
}

export type CovarianceMethod = "sample" | "constant-correlation" | "single-index";
