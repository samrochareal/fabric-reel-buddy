import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export type BuyerCurrency = "brl" | "usd";

/** Picks the charge currency from the visitor's country: BRL in Brazil, USD elsewhere. */
export function currencyForCountry(country: string | null | undefined): BuyerCurrency {
  return country?.toUpperCase() === "BR" ? "brl" : "usd";
}

export const getBuyerCurrency = createServerFn({ method: "GET" }).handler(
  (): { currency: BuyerCurrency } => {
    const country =
      getRequestHeader("cf-ipcountry") ??
      getRequestHeader("x-vercel-ip-country") ??
      getRequestHeader("x-country-code");
    return { currency: currencyForCountry(country) };
  },
);

/** Formats an amount (major unit) with the currency symbol, 1:1 without conversion. */
export function formatPrice(amount: number, currency: BuyerCurrency): string {
  return currency === "brl" ? `R$ ${amount}` : `$${amount}`;
}
