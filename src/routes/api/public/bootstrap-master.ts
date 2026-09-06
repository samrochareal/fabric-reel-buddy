import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bootstrap-master")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          password?: string;
        };
        if (!body.email || !body.password) {
          return new Response("missing", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
        });
        let userId = data?.user?.id ?? null;
        if (error && !userId) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
          userId = list?.users.find((u) => u.email === body.email)?.id ?? null;
          if (!userId) return new Response(error.message, { status: 400 });
        }
        await supabaseAdmin
          .from("profiles")
          .upsert({ id: userId!, email: body.email }, { onConflict: "id" });
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId!, role: "admin" }, { onConflict: "user_id,role" });
        return Response.json({ ok: true });
      },
    },
  },
});
