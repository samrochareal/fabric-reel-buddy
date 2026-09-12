import { useEffect, useState } from "react";
import { getBuyerCurrency, type BuyerCurrency } from "./geo.functions";
import { setLang } from "./i18n";

/**
 * Where the visitor is accessing from. Used for two things:
 * the charge currency (real in Brazil, dollar elsewhere) and the
 * starting language (Portuguese in Brazil, English elsewhere).
 */
type Locale = { currency: BuyerCurrency; country: string };

const CURRENCY_KEY = "fdr.currency";
const COUNTRY_KEY = "fdr.country";
const LANG_KEY = "fdr.lang";

let pending: Promise<Locale> | null = null;

function cached(): Locale | null {
  if (typeof window === "undefined") return null;
  const currency = window.localStorage.getItem(CURRENCY_KEY);
  const country = window.localStorage.getItem(COUNTRY_KEY);
  if (currency !== "brl" && currency !== "usd") return null;
  return { currency, country: country ?? "" };
}

export function resolveLocale(): Promise<Locale> {
  if (pending) return pending;
  pending = getBuyerCurrency()
    .then((geo) => {
      const locale: Locale = { currency: geo.currency, country: geo.country ?? "" };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CURRENCY_KEY, locale.currency);
        window.localStorage.setItem(COUNTRY_KEY, locale.country);
      }
      return locale;
    })
    .catch(() => cached() ?? { currency: "brl" as BuyerCurrency, country: "BR" });
  return pending;
}

/** Currency the visitor should see and be charged in. */
export function useBuyerCurrency(): BuyerCurrency {
  const [currency, setCurrency] = useState<BuyerCurrency>(() => cached()?.currency ?? "brl");
  useEffect(() => {
    void resolveLocale().then((locale) => setCurrency(locale.currency));
  }, []);
  return currency;
}

/**
 * First visit: the whole system opens in Portuguese for Brazil and in English
 * anywhere else. The person can still switch languages, and that choice wins.
 */
export function useAutoLanguage() {
  useEffect(() => {
    if (window.localStorage.getItem(LANG_KEY)) return;
    void resolveLocale().then((locale) => {
      if (window.localStorage.getItem(LANG_KEY)) return;
      setLang(locale.country === "BR" || locale.country === "" ? "pt" : "en");
    });
  }, []);
}
