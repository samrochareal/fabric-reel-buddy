import { useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toExternalUrl } from "@/lib/branding";
import { useT } from "@/lib/i18n";
import {
  markNotificationRead,
  useMyNotifications,
  useRefreshNotifications,
  type AppNotification,
} from "@/lib/notifications";

/** Bell in the top right corner: the list opens, then each item opens a popup. */
export function NotificationBell() {
  const t = useT();
  const { items, unread } = useMyNotifications();
  const refresh = useRefreshNotifications();
  const [listOpen, setListOpen] = useState(false);
  const [current, setCurrent] = useState<AppNotification | null>(null);

  const open = (item: AppNotification) => {
    setCurrent(item);
    setListOpen(false);
    if (!item.read) {
      void markNotificationRead(item.id).then(refresh);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="relative grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        aria-label={t("Notifications")}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Notifications")}</DialogTitle>
            <DialogDescription>{t("Tap a notification to read it.")}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {items.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("You have no notifications yet.")}
              </p>
            )}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/60 ${
                  item.read ? "border-border bg-card" : "border-primary/50 bg-primary/5"
                }`}
              >
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.body}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </span>
                {!item.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!current} onOpenChange={(v) => !v && setCurrent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{current?.title}</DialogTitle>
            <DialogDescription>
              {current ? new Date(current.created_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {current?.body && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.body}</p>
          )}
          {current?.link_url && (
            <Button asChild className="w-full">
              <a href={toExternalUrl(current.link_url)} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 size-4" />
                {current.link_label || t("Open link")}
              </a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
