import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import {
  claimFreeRefill,
  nextRefillAt,
  useMyAccount,
  useRefreshAccount,
  type Account,
} from "@/lib/account";
import { useT } from "@/lib/i18n";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** Shows the live countdown to the next free-credit refill after credits run out. */
export function CreditMeter({ account: given }: { account?: Account | null }) {
  const t = useT();
  const fallback = useMyAccount();
  const account = given ?? fallback.account;
  const refresh = useRefreshAccount();
  const target = nextRefillAt(account);
  const [now, setNow] = useState(() => Date.now());
  const claiming = useRef(false);

  // tick every second so the countdown is always live
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // keep the master-defined refill window in sync
  useEffect(() => {
    const id = window.setInterval(() => refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  // once the window is over, ask the server for the credits
  useEffect(() => {
    if (!target || target.getTime() - now > 0 || claiming.current) return;
    claiming.current = true;
    void claimFreeRefill()
      .catch(() => undefined)
      .finally(() => {
        refresh();
        window.setTimeout(() => {
          claiming.current = false;
        }, 10_000);
      });
  }, [target, now, refresh]);

  if (!account || !target) return null;

  const ms = Math.max(0, target.getTime() - now);
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
      title={t("New credits arrive {when}.", { when: target.toLocaleTimeString() })}
    >
      <Timer className="size-3.5" />
      <span className="hidden sm:inline font-semibold">{t("Free credits in")}</span>
      <span className="font-mono tabular-nums">{clock}</span>
    </span>
  );
}
