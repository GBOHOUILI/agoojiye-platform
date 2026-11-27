// Provisional demo parameters — to be confirmed with AGOOJIYÉ. Amounts are HT, in FCFA.
export const PURCHASING_RULES = {
  financeThresholdHT: 500_000,
  directionThresholdHT: 5_000_000,
  minQuotesAboveHT: 1_000_000,
  minQuotes: 2,
  overrunTolerancePct: 10,
  defaultVatRateBp: 1800,
  allowedVatRatesBp: [0, 1800] as readonly number[],
} as const;
