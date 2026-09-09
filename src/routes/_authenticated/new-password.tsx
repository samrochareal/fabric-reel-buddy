import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/new-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — batch video editor" },
      {
        name: "description",
        content:
          "Choose a new password to replace the temporary one issued by the platform administrator.",
      },
      { property: "og:title", content: "Set a new password — batch video editor" },
      {
        property: "og:description",
        content: "Replace your temporary password before using the editor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewPasswordPage,
});

function NewPasswordPage() {
  const t = useT();
  const navigate = useNavigate();
  const [temporary, setTemporary] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 8) {
      toast.error(t("Use at least 8 characters."));
      return;
    }
    if (password !== confirm) {
      toast.error(t("The passwords don't match."));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        // @ts-expect-error current_password is accepted by the auth server
        current_password: temporary || undefined,
        data: { must_change_password: false },
      });
      if (error) throw error;
      await supabase.auth.refreshSession();
      toast.success(t("Password updated."));
      await navigate({ to: "/app" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("We couldn't update your password."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <KeyRound className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {t("Temporary password")}
          </span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
          {t("Set a new password")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Your access was reset by the administrator. Choose a new password to continue.")}
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <p className="text-xs font-semibold">{t("Temporary password")}</p>
            <Input
              type="password"
              className="mt-1.5 h-11"
              value={temporary}
              onChange={(e) => setTemporary(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-semibold">{t("New password")}</p>
            <Input
              type="password"
              className="mt-1.5 h-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-semibold">{t("Confirm new password")}</p>
            <Input
              type="password"
              className="mt-1.5 h-11"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
          <Button className="h-11 w-full" disabled={saving} onClick={() => void submit()}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("Save new password")}
          </Button>
        </div>
      </section>
    </main>
  );
}
