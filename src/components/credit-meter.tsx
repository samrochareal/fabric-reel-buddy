import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { nextRefillAt, useMyAccount, useRefreshAccount, type Account } from "@/lib/account";
import { useT } from "@/lib/i18n";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** Shows the next free-credit refill only after credits have run out. */
export function CreditMeter({ account: given }: { account?: Account | null }) {
  const t = useT();
  const fallback = useMyAccount();
  const account = given ?? fallback.account;
  const refresh = useRefreshAccount();
  const target = nextRefillAt(account);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target?.getTime()]);

  useEffect(() => {
    if (target && target.getTime() - now <= 0) refresh();
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
