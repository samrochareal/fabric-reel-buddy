import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/**
 * Shown when a user without credits tries to process videos.
 * Displays the countdown to the next free refill and a buy button that
 * opens the credit packs page in a new tab. Credits arriving after a
 * successful purchase close the dialog automatically.
 */
export function OutOfCreditsDialog({
  open,
  onOpenChange,
  account: given,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}) {
  const t = useT();
  const fallback = useMyAccount();
  const account = given ?? fallback.account;
  const refresh = useRefreshAccount();
  const target = nextRefillAt(account);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  // poll for credits bought in the other tab
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => refresh(), 5000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !account) return;
    if (account.premium || account.credits > 0) {
      onOpenChange(false);
      toast.success(t("Credits added — you can process videos now."));
    }
  }, [open, account?.credits, account?.premium]);

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

  const ms = target ? Math.max(0, target.getTime() - now) : 0;
  const clock = `${pad(Math.floor(ms / 3600_000))}:${pad(
    Math.floor((ms % 3600_000) / 60_000),
  )}:${pad(Math.floor((ms % 60_000) / 1000))}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("You are out of credits.")}</DialogTitle>
          <DialogDescription>
            {t("Buy a credit pack to keep going or wait for the next free refill.")}
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-primary">
            <Timer className="size-4" />
            <span className="text-sm font-semibold">{t("Free credits in")}</span>
            <span className="font-mono text-lg font-bold tabular-nums">{clock}</span>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Close")}
          </Button>
          <Button
            onClick={() => window.open("/recharge", "_blank", "noopener,noreferrer")}
            className="gap-2"
          >
            <ShoppingCart className="size-4" />
            {t("Buy credits")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
