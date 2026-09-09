/** Blocks throwaway / disposable e-mail providers at sign-up. */
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "33mail.com",
  "anonbox.net",
  "burnermail.io",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.net",
  "harakirimail.com",
  "inboxbear.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mailsac.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "nada.email",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempinbox.com",
  "tempmail.dev",
  "tempmail.net",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.de",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

const DISPOSABLE_HINTS = ["tempmail", "temp-mail", "trashmail", "throwaway", "10minute", "yopmail", "guerrillamail", "fakemail", "mailinator", "disposable"];

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim());
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  const root = domain.split(".").slice(-2).join(".");
  if (DISPOSABLE_DOMAINS.has(root)) return true;
  return DISPOSABLE_HINTS.some((hint) => domain.includes(hint));
}
