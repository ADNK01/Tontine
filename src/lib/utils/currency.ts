const currencyConfig: Record<string, { symbol: string; locale: string; decimals: number }> = {
  RWF: { symbol: "FRw", locale: "rw-RW", decimals: 0 },
  USD: { symbol: "$", locale: "en-US", decimals: 2 },
  EUR: { symbol: "€", locale: "fr-FR", decimals: 2 },
  GBP: { symbol: "£", locale: "en-GB", decimals: 2 },
  XOF: { symbol: "CFA", locale: "fr-ML", decimals: 0 },
};

export function formatCurrency(amount: number, currency: string = "RWF"): string {
  const config = currencyConfig[currency] || { symbol: currency, locale: "en-US", decimals: 2 };
  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
  } catch {
    return `${config.symbol} ${amount.toLocaleString("en-US", { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })}`;
  }
}

export function getCurrencySymbol(currency: string): string {
  return currencyConfig[currency]?.symbol || currency;
}

export const supportedCurrencies = [
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "XOF", name: "CFA Franc", symbol: "CFA" },
];
