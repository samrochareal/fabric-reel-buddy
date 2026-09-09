import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  Gift,
  Image as ImageIcon,
  Link2,
  Loader2,
  Palette,
  Plus,
  Save,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deletePlatformUser,
  fetchPlatformStats,

  fetchPlatformUsers,
  savePlatformUser,
  useIsAdmin,
  type PlatformUser,
} from "@/lib/admin";
import { TOOL_KEYS, TOOL_LABELS } from "@/lib/account";
import {
  defaultBranding,
  fetchBranding,
  saveBranding,
  saveExternalLinks,
  saveReferralSettings,
  useBranding,
  useRefreshBranding,
  type ExternalLink,
  type Palette as BrandPalette,
} from "@/lib/branding";
import { LanguageToggle, useT } from "@/lib/i18n";
import { LINK_ICON_NAMES, LinkGlyph } from "@/components/link-icons";
import {
  adminDeleteNotification,
  adminListNotifications,
  adminSendNotification,
} from "@/lib/notifications";
import { Textarea } from "@/components/ui/textarea";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Master panel — batch video editor" },
      {
        name: "description",
        content:
          "Master panel with platform usage, registered accounts, per-user credits and the system visual identity.",
      },
      { property: "og:title", content: "Master panel — batch video editor" },
      {
        property: "og:description",
        content: "Track platform usage and customise name, colours, logo and icon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function readFileAsDataUrl(file: File, tooBig: string, unreadable: string, maxBytes = 400_000) {
  return new Promise<string>((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(tooBig));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(unreadable));
    reader.readAsDataURL(file);
  });
}

function UserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: PlatformUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [credits, setCredits] = useState(0);
  const [refillAmount, setRefillAmount] = useState(5);
  const [refillHours, setRefillHours] = useState(12);
  const [premium, setPremium] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [days, setDays] = useState("");
  const [tools, setTools] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!user) return;
    if (!window.confirm(t("Delete this account for good? This cannot be undone."))) return;
    setDeleting(true);
    try {
      await deletePlatformUser(user.id);
      toast.success(t("Account deleted."));
      onSaved();
      onClose();
    } catch {
      toast.error(t("We couldn't delete this account."));
    } finally {
      setDeleting(false);
    }
  };


  useEffect(() => {
    if (!user) return;
    setCredits(user.credits);
    setRefillAmount(user.credit_refill_amount);
    setRefillHours(user.credit_refill_hours);
    setPremium(user.premium);
    setBlocked(user.blocked);
    setDays("");
    setTools(user.allowed_tools ?? {});
  }, [user]);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const parsed = Number(days);
      const accessDays =
        days.trim() === "" ? null : Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      await savePlatformUser({
        userId: user.id,
        credits,
        creditRefillAmount: refillAmount,
        creditRefillHours: refillHours,
        premium,
        blocked,
        accessDays,
        allowedTools: tools,
      });

      toast.success(t("Account updated."));
      onSaved();
      onClose();
    } catch {
      toast.error(t("We couldn't update this account."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user?.full_name || user?.email || t("no name")}</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: t("Credits available"), value: credits, set: setCredits },
              { label: t("Refill amount"), value: refillAmount, set: setRefillAmount },
              { label: t("Refill every (hours)"), value: refillHours, set: setRefillHours },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-xs font-semibold">{row.label}</p>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5 h-10"
                  value={row.value}
                  onChange={(e) => row.set(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-xs font-semibold">{t("Premium (no credit limit)")}</span>
            <Switch checked={premium} onCheckedChange={setPremium} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-xs font-semibold">{t("Block access")}</span>
            <Switch checked={blocked} onCheckedChange={setBlocked} />
          </div>

          <div>
            <p className="text-xs font-semibold">{t("Access for how many days")}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                type="number"
                min={0}
                placeholder="30"
                className="h-10"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={() => setDays("0")}>
                {t("No time limit")}
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("Access expires {when}", {
                when: user?.access_expires_at
                  ? new Date(user.access_expires_at).toLocaleDateString()
                  : t("never"),
              })}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold">{t("Allowed editing tools")}</p>
            <div className="mt-2 space-y-2">
              {TOOL_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
                >
                  <span>{t(TOOL_LABELS[key])}</span>
                  <Switch
                    checked={tools[key] !== false}
                    onCheckedChange={(v) => setTools((prev) => ({ ...prev, [key]: v }))}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={deleting || saving || Boolean(user?.is_admin)}
              onClick={() => void remove()}
            >
              {deleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              {t("Delete account")}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {t("Close")}
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                {t("Save changes")}
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminPage() {
  const t = useT();
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();
  const refreshBranding = useRefreshBranding();
  const branding = useBranding();

  const [name, setName] = useState(defaultBranding.system_name);
  const [tagline, setTagline] = useState("");
  const [palette, setPalette] = useState<BrandPalette>(defaultBranding.palette);
  const [logo, setLogo] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [tab, setTab] = useState<
    "overview" | "people" | "notifications" | "referral" | "menu" | "identity"
  >("overview");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifLinkUrl, setNotifLinkUrl] = useState("");
  const [notifLinkLabel, setNotifLinkLabel] = useState("");
  const [notifTarget, setNotifTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [referralOn, setReferralOn] = useState(false);
  const [referralCredits, setReferralCredits] = useState(5);
  const [savingReferral, setSavingReferral] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error(t("This area is for the master user only."));
      void navigate({ to: "/", replace: true });
    }
  }, [isAdmin, loading, navigate, t]);

  useEffect(() => {
    void fetchBranding().then((b) => {
      setName(b.system_name);
      setTagline(b.tagline ?? "");
      setPalette(b.palette);
      setLogo(b.logo_url);
      setIcon(b.icon_url);
      setLinks(b.external_links);
      setReferralOn(b.referral_enabled);
      setReferralCredits(b.referral_reward_credits);
    });
  }, []);

  const onSaveReferral = async () => {
    setSavingReferral(true);
    try {
      await saveReferralSettings({ enabled: referralOn, credits: referralCredits });
      refreshBranding();
      void stats.refetch();
      toast.success(t("Referral settings updated."));
    } catch {
      toast.error(t("We couldn't save your changes."));
    } finally {
      setSavingReferral(false);
    }
  };

  const stats = useQuery({
    queryKey: ["platform-stats"],
    queryFn: fetchPlatformStats,
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  const users = useQuery({
    queryKey: ["platform-users"],
    queryFn: fetchPlatformUsers,
    enabled: isAdmin,
  });

  const notifications = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: adminListNotifications,
    enabled: isAdmin,
  });

  const onSendNotification = async () => {
    if (!notifTitle.trim()) {
      toast.error(t("Give the notification a title."));
      return;
    }
    setSending(true);
    try {
      await adminSendNotification({
        title: notifTitle,
        body: notifBody,
        linkUrl: notifLinkUrl,
        linkLabel: notifLinkLabel,
        targetUserId: notifTarget === "all" ? null : notifTarget,
      });
      setNotifTitle("");
      setNotifBody("");
      setNotifLinkUrl("");
      setNotifLinkLabel("");
      setNotifTarget("all");
      void notifications.refetch();
      toast.success(t("Notification sent."));
    } catch {
      toast.error(t("We couldn't send the notification."));
    } finally {
      setSending(false);
    }
  };

  const onDeleteNotification = async (id: string) => {
    try {
      await adminDeleteNotification(id);
      void notifications.refetch();
      toast.success(t("Notification removed."));
    } catch {
      toast.error(t("We couldn't remove the notification."));
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = users.data ?? [];
    if (!q) return rows;
    return rows.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q),
    );
  }, [users.data, search]);

  const onSave = async () => {
    if (!name.trim()) {
      toast.error(t("Enter the system name."));
      return;
    }
    setSaving(true);
    try {
      await saveBranding({
        system_name: name.trim(),
        tagline: tagline.trim() || null,
        palette,
        logo_url: logo,
        icon_url: icon,
      });
      refreshBranding();
      toast.success(t("System identity updated."));
    } catch {
      toast.error(t("We couldn't save your changes."));
    } finally {
      setSaving(false);
    }
  };

  const onSaveLinks = async () => {
    setSavingLinks(true);
    try {
      await saveExternalLinks(
        links
          .map((l) => ({ title: l.title.trim(), url: l.url.trim(), icon: l.icon ?? "link" }))
          .filter((l) => l.title && l.url),
      );
      refreshBranding();
      toast.success(t("Links updated."));
    } catch {
      toast.error(t("We couldn't save your changes."));
    } finally {
      setSavingLinks(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const s = stats.data;
  const maxDaily = Math.max(1, ...(s?.daily ?? []).map((d) => d.videos));

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/60"
          >
            <ArrowLeft className="size-3.5" /> {t("Editor")}
          </Link>
          <span className="font-display text-base font-bold tracking-tight">
            {branding.ready ? branding.system_name : ""} {t("Master panel")}
          </span>
          <div className="ml-auto">
            <div className="flex items-center gap-2"><LanguageToggle /></div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-2 md:sticky md:top-20">
          {(
            [
              ["overview", t("Overview"), <BarChart3 key="a" className="size-4" />],
              ["people", t("People"), <Users key="b" className="size-4" />],
              ["notifications", t("Notifications"), <Bell key="f" className="size-4" />],
              ["referral", t("Rewards"), <Gift key="e" className="size-4" />],
              ["menu", t("Side menu"), <Link2 key="c" className="size-4" />],
              ["identity", t("System identity"), <Palette key="d" className="size-4" />],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </aside>

        <div>
        {tab === "overview" && (
        <section>
          <h1 className="font-display text-xl font-bold tracking-tight">
            {t("How the platform is being used")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Numbers refresh automatically every minute.")}
          </p>

          {stats.isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("Loading numbers…")}
            </div>
          ) : stats.isError ? (
            <p className="mt-4 text-sm text-destructive">
              {t("We couldn't load the numbers right now.")}
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  icon={<Users className="size-4" />}
                  label={t("Registered accounts")}
                  value={s?.total_users ?? 0}
                  hint={t("{n} in the last 7 days", { n: s?.new_users_7d ?? 0 })}
                />
                <Stat
                  icon={<Video className="size-4" />}
                  label={t("Processed videos")}
                  value={s?.total_videos ?? 0}
                  hint={t("{n} in the last 7 days", { n: s?.videos_7d ?? 0 })}
                />
                <Stat
                  icon={<BarChart3 className="size-4" />}
                  label={t("Active people (30 days)")}
                  value={s?.active_users_30d ?? 0}
                  hint={t("{n} videos in the period", { n: s?.videos_30d ?? 0 })}
                />
                <Stat
                  icon={<ImageIcon className="size-4" />}
                  label={t("Saved overlays total")}
                  value={s?.overlay_presets ?? 0}
                  hint={t("{n} min of video in total", { n: s?.total_minutes ?? 0 })}
                />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  icon={<Users className="size-4" />}
                  label={t("Premium accounts")}
                  value={s?.premium_users ?? 0}
                  hint={t("{n} blocked accounts", { n: s?.blocked_users ?? 0 })}
                />
                <Stat
                  icon={<BarChart3 className="size-4" />}
                  label={t("Credits available")}
                  value={s?.credits_available ?? 0}
                  hint={t("{n} credits used so far", { n: s?.credits_used ?? 0 })}
                />
                <Stat
                  icon={<Gift className="size-4" />}
                  label={t("Sign-ups by referral")}
                  value={s?.total_referrals ?? 0}
                  hint={t("{n} in the last 7 days", { n: s?.referrals_7d ?? 0 })}
                />
                <Stat
                  icon={<Gift className="size-4" />}
                  label={t("Referral credits given")}
                  value={s?.referral_credits_awarded ?? 0}
                  hint={
                    s?.referral_enabled
                      ? t("Programme on · {n} credits per sign-up", {
                          n: s?.referral_reward_credits ?? 0,
                        })
                      : t("Programme off")
                  }
                />
              </div>

              {(s?.top_referrers?.length ?? 0) > 0 && (
                <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Top referrers")}
                  </p>
                  <ul className="mt-3 divide-y divide-border text-sm">
                    {(s?.top_referrers ?? []).map((r) => (
                      <li
                        key={`${r.email}-${r.invites}`}
                        className="flex items-center justify-between py-2"
                      >
                        <span className="min-w-0 truncate">
                          {r.full_name || r.email || t("no name")}
                        </span>
                        <span className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {r.invites} {t("Sign-ups")}
                          </span>
                          <span className="font-semibold text-primary">+{r.credits}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Videos per day (last 2 weeks)")}
                </p>
                <div className="mt-4 flex h-32 items-end gap-1.5">
                  {(s?.daily ?? []).map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className="w-full rounded-t bg-primary/80"
                        style={{ height: `${Math.max(3, (d.videos / maxDaily) * 100)}%` }}
                        title={`${d.videos}`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(d.day).getUTCDate()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
        )}

        {/* ---------- notifications ---------- */}
        {tab === "notifications" && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h2 className="font-display text-lg font-bold tracking-tight">
              {t("Notifications")}
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Send a message to everyone or to one account. It shows up in their bell icon.")}
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t("Who receives it")}</label>
              <select
                value={notifTarget}
                onChange={(e) => setNotifTarget(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="all">{t("Everyone")}</option>
                {(users.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email ?? u.full_name ?? u.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t("Title")}</label>
              <Input
                className="mt-1"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder={t("New feature available")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t("Message")}</label>
              <Textarea
                className="mt-1 min-h-[110px]"
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder={t("Write the notification content here.")}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("Button link (optional)")}
                </label>
                <Input
                  className="mt-1"
                  value={notifLinkUrl}
                  onChange={(e) => setNotifLinkUrl(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("Button text")}
                </label>
                <Input
                  className="mt-1"
                  value={notifLinkLabel}
                  onChange={(e) => setNotifLinkLabel(e.target.value)}
                  placeholder={t("Learn more")}
                />
              </div>
            </div>
            <Button onClick={() => void onSendNotification()} disabled={sending}>
              {sending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Bell className="mr-1.5 size-4" />
              )}
              {t("Send notification")}
            </Button>
          </div>

          <div className="mt-6 border-t border-border/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Sent notifications")}
            </p>
            <div className="mt-3 space-y-2">
              {(notifications.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">{t("Nothing sent yet.")}</p>
              )}
              {(notifications.data ?? []).map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{n.title}</span>
                    <span className="block text-xs text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {n.target_user_id ? (n.target_email ?? t("One account")) : t("Everyone")} ·{" "}
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void onDeleteNotification(n.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={t("Remove")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* ---------- referral programme ---------- */}
        {tab === "referral" && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Gift className="size-4 text-primary" />
            <h2 className="font-display text-lg font-bold tracking-tight">
              {t("Referral programme")}
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Turn the programme on and choose how many credits each invite is worth.")}
          </p>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-xs font-semibold">{t("Referral programme is active")}</span>
            <Switch checked={referralOn} onCheckedChange={setReferralOn} />
          </div>

          <div className="mt-3 max-w-xs">
            <p className="text-xs font-semibold">{t("Credits per referral")}</p>
            <Input
              type="number"
              min={0}
              className="mt-1.5 h-10"
              value={referralCredits}
              onChange={(e) => setReferralCredits(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              icon={<Gift className="size-4" />}
              label={t("Sign-ups by referral")}
              value={s?.total_referrals ?? 0}
            />
            <Stat
              icon={<Users className="size-4" />}
              label={t("People inviting")}
              value={s?.referring_users ?? 0}
            />
            <Stat
              icon={<BarChart3 className="size-4" />}
              label={t("Referral credits given")}
              value={s?.referral_credits_awarded ?? 0}
            />
          </div>

          <Button className="mt-4" onClick={() => void onSaveReferral()} disabled={savingReferral}>
            {savingReferral ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {t("Save changes")}
          </Button>
        </section>
        )}

        {/* ---------- people ---------- */}
        {tab === "people" && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="font-display text-lg font-bold tracking-tight">
                {t("People using the system")}
              </h2>
            </div>
            <Input
              className="h-9 w-full sm:w-64"
              placeholder={t("Search by name or e-mail")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("1 credit = 1 processed video")}
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-3 font-semibold">{t("Name")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("E-mail")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("Signed up")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("Available")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("Used")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("Videos")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("Access")}</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {users.isLoading && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    </td>
                  </tr>
                )}
                {!users.isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
                      {t("No accounts yet.")}
                    </td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const expired =
                    u.access_expires_at && new Date(u.access_expires_at).getTime() < Date.now();
                  return (
                    <tr key={u.id} className="border-b border-border/40">
                      <td className="py-2.5 pr-3 font-semibold">
                        {u.full_name || t("no name")}
                        {u.is_admin && (
                          <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {t("Master")}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[180px] truncate py-2.5 pr-3 text-muted-foreground">
                        {u.email}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 pr-3 font-bold">
                        {u.premium ? t("Unlimited") : u.credits}
                      </td>
                      <td className="py-2.5 pr-3">{u.credits_used}</td>
                      <td className="py-2.5 pr-3">{u.videos_processed}</td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={
                            u.blocked || expired
                              ? "font-semibold text-destructive"
                              : "font-semibold text-muted-foreground"
                          }
                        >
                          {u.blocked ? t("Blocked") : expired ? t("Expired") : t("Active")}
                        </span>
                        {u.premium && (
                          <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {t("Premium")}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
                          {t("Manage")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {/* ---------- side menu links ---------- */}
        {tab === "menu" && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            <h2 className="font-display text-lg font-bold tracking-tight">{t("Side menu")}</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("Links shown inside the hamburger menu. They open in a new tab.")}
          </p>

          <div className="mt-4 space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  className="h-10 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                  value={link.icon ?? "link"}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((l, j) => (j === i ? { ...l, icon: e.target.value } : l)),
                    )
                  }
                  aria-label={t("Icon")}
                >
                  {LINK_ICON_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="flex size-10 items-center justify-center rounded-md border border-border bg-background">
                  <LinkGlyph name={link.icon} className="size-4 text-primary" />
                </span>
                <Input
                  className="h-10 w-full sm:w-48"
                  placeholder={t("Title")}
                  value={link.title}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((l, j) => (j === i ? { ...l, title: e.target.value } : l)),
                    )
                  }
                />
                <Input
                  className="h-10 flex-1"
                  placeholder={t("Address")}
                  value={link.url}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={t("Remove")}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setLinks((prev) => [...prev, { title: "", url: "", icon: "link" }])}
            >
              <Plus className="mr-1.5 size-4" /> {t("Add link")}
            </Button>
            <Button onClick={() => void onSaveLinks()} disabled={savingLinks}>
              {savingLinks ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {t("Save links")}
            </Button>
          </div>
        </section>
        )}

        {/* ---------- identity ---------- */}
        {tab === "identity" && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <h2 className="font-display text-lg font-bold tracking-tight">
              {t("System identity")}
            </h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold">{t("System name")}</p>
              <Input className="mt-1.5 h-11" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <p className="text-xs font-semibold">{t("Tagline (optional)")}</p>
              <Input
                className="mt-1.5 h-11"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
          </div>

          <p className="mt-5 text-xs font-semibold">{t("Colour palette")}</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {([
              ["primary", t("Primary colour")],
              ["background", t("Background")],
              ["accent", t("Accent")],
            ] as const).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3"
              >
                <input
                  type="color"
                  className="size-9 cursor-pointer rounded border-0 bg-transparent"
                  value={palette[key]}
                  onChange={(e) => setPalette((p) => ({ ...p, [key]: e.target.value }))}
                />
                <span className="text-xs">
                  <span className="font-semibold">{label}</span>
                  <span className="block text-muted-foreground">{palette[key]}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {([
              ["logo", t("Logo (shown at the top)"), logo, setLogo] as const,
              ["icon", t("Browser icon"), icon, setIcon] as const,
            ]).map(([key, label, value, set]) => (
              <div key={key} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold">{label}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                    {value ? (
                      <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      className="text-xs"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          set(
                            await readFileAsDataUrl(
                              file,
                              t("Pick an image up to 400KB."),
                              t("We couldn't read the image."),
                            ),
                          );
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : t("Invalid image."));
                        }
                      }}
                    />
                    {value && (
                      <button
                        type="button"
                        className="w-fit text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => set(null)}
                      >
                        {t("Remove")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button className="mt-6 h-11 w-full sm:w-auto" onClick={() => void onSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {t("Save identity")}
          </Button>
        </section>
        )}
        </div>
      </div>

      <UserDialog
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={() => void users.refetch()}
      />
    </div>
  );
}
