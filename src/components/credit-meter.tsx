import { useEffect, useState } from "react";
import { Coins, Timer } from "lucide-react";
import { Infinity as InfinityIcon } from "lucide-react";
import { nextRefillAt, useMyAccount, useRefreshAccount, type Account } from "@/lib/account";
import { useT } from "@/lib/i18n";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** Credits as used/available, replaced by a countdown once they run out. */
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

  if (!account) return null;

  if (account.premium) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
        <InfinityIcon className="size-3.5" />
        <span className="font-mono tabular-nums">{pad(account.credits_used)}/∞</span>
      </span>
    );
  }

  if (target) {
    const ms = Math.max(0, target.getTime() - now);
    const h = Math.floor(ms / 3600_000);
    const m = Math.floor((ms % 3600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return (
      <span
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-muted-foreground"
        title={t("New credits arrive {when}.", { when: target.toLocaleTimeString() })}
      >
        <Timer className="size-3.5 text-primary" />
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold tabular-nums"
      title={t("Credits used / credits available")}
    >
      <Coins className="size-3.5 text-primary" />
      {pad(account.credits_used)}/{pad(account.credits)}
    </span>
  );
}
