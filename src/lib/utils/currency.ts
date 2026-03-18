const currencyConfig: Record<string, { symbol: string; decimals: number }> = {
  RWF: { symbol: "RWF", decimals: 0 },
  USD: { symbol: "$", decimals: 2 },
  EUR: { symbol: "€", decimals: 2 },
  GBP: { symbol: "£", decimals: 2 },
  XOF: { symbol: "CFA", decimals: 0 },
};

function formatNumber(amount: number, decimals: number): string {
  const fixed = Math.abs(amount).toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  // Add thousand separators using simple regex
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = amount < 0 ? "-" : "";
  return decPart ? `${sign}${withCommas}.${decPart}` : `${sign}${withCommas}`;
}

export function formatCurrency(amount: number, currency: string = "RWF"): string {
  const config = currencyConfig[currency] || { symbol: currency, decimals: 2 };
  return `${config.symbol} ${formatNumber(amount, config.decimals)}`;
}

export function getCurrencySymbol(currency: string): string {
  return currencyConfig[currency]?.symbol || currency;
}

export const supportedCurrencies = [
  { code: "RWF", name: "Rwandan Franc", symbol: "RWF" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "XOF", name: "CFA Franc", symbol: "CFA" },
];
