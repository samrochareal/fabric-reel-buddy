import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Translates the landing page texts the master wrote himself. Results are
 * cached in the database so a visitor only pays the translation cost once.
 */
const schema = z.object({
  lang: z.enum(["en", "pt"]),
  texts: z.array(z.string().min(1).max(600)).max(200),
});

export const translateLandingTexts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const { lang, texts } = data;
    const unique = Array.from(new Set(texts.map((t) => t.trim()).filter(Boolean)));
    if (unique.length === 0) return {};

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const out: Record<string, string> = {};
    const { data: cached } = await supabaseAdmin
      .from("landing_translations")
      .select("source, translated")
      .eq("lang", lang)
      .in("source", unique);
    for (const row of cached ?? []) out[row.source] = row.translated;

    const missing = unique.filter((text) => !(text in out));
    if (missing.length === 0) return out;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return out;

    const target = lang === "en" ? "English" : "Brazilian Portuguese";
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              `Translate marketing website copy to ${target}. Keep the meaning, tone and any ` +
              `placeholders such as {system} untouched. Do not add quotes or explanations. ` +
              `Reply with a JSON object: {"items":[{"i":0,"t":"translation"}, ...]} covering every input index.`,
          },
          { role: "user", content: JSON.stringify(missing.map((t, i) => ({ i, t }))) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return out;

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    let items: { i?: number; t?: string }[] = [];
    try {
      const parsed = JSON.parse(content) as { items?: { i?: number; t?: string }[] };
      items = Array.isArray(parsed.items) ? parsed.items : [];
    } catch {
      return out;
    }

    const rows: { lang: string; source: string; translated: string }[] = [];
    for (const item of items) {
      const source = typeof item.i === "number" ? missing[item.i] : undefined;
      const translated = typeof item.t === "string" ? item.t.trim() : "";
      if (!source || !translated) continue;
      out[source] = translated;
      rows.push({ lang, source, translated });
    }

    if (rows.length > 0) {
      await supabaseAdmin
        .from("landing_translations")
        .upsert(rows, { onConflict: "lang,source" });
    }

    return out;
  });
