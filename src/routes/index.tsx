import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Crop,
  Frame,
  Gauge,
  Images,
  Layers,
  LogIn,
  Rocket,
  Scissors,
  ShieldCheck,
  Sparkles,
  Type as TypeIcon,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/lib/branding";
import { withSystemName } from "@/lib/landing-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Edição de vídeos em massa" },
      {
        name: "description",
        content:
          "Suba até 100 vídeos, ajuste enquadramento, bordas, overlays e títulos em lote e baixe tudo pronto para Reels, TikTok e Shorts. Tudo direto no navegador.",
      },
      { property: "og:title", content: "Edição de vídeos em massa" },
      {
        property: "og:description",
        content:
          "Edição em lote de até 100 vídeos com enquadramento, bordas, overlays, títulos e modo turbo. Sem instalar nada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const branding = useBranding();
  const brandImage = branding.logo_url || branding.icon_url;
  const content = branding.landing_content;
  const featureIcons = [Layers, Crop, Frame, Images, TypeIcon, Wand2, Zap, Gauge, ShieldCheck];
  const features = content.features.items.map((item, i) => ({ ...item, icon: featureIcons[i % featureIcons.length] ?? Layers }));
  const pageStyle = {
    "--primary": content.colors.primary,
    "--background": content.colors.background,
    "--accent": content.colors.accent,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background text-foreground" style={pageStyle}>
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            {brandImage ? (
              <img
                src={brandImage}
                alt=""
                className="size-9 shrink-0 object-contain"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scissors className="size-4" />
              </span>
            )}
            <span className="truncate font-display text-lg font-bold">
              {branding.system_name}
            </span>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#recursos" className="transition-colors hover:text-foreground"> {content.nav.features}</a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground"> {content.nav.how}</a>
            <a href="#para-quem" className="transition-colors hover:text-foreground"> {content.nav.audience}</a>
            <a href="#faq" className="transition-colors hover:text-foreground"> {content.nav.faq}</a>
          </nav>

          <Link to="/login">
            <Button size="sm" className="font-bold">
              <LogIn className="size-4" /> {content.nav.login}
            </Button>
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {content.hero.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {content.hero.title}{" "}
              <span className="text-primary">{content.hero.highlight}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              <span className="md:hidden">{withSystemName(content.mobile.heroText, branding.system_name)}</span>
              <span className="hidden md:inline">{withSystemName(content.hero.text, branding.system_name)}</span>
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button size="lg" className="font-bold">
                  {content.hero.primaryCta} <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline" className="font-bold">
                  {content.hero.secondaryCta}
                </Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground">
              {content.hero.badges.map((badge, i) => { const Icon = [Rocket, Zap, Sparkles][i % 3] ?? Sparkles; return <span key={badge} className="flex items-center gap-2"><Icon className="size-4 text-primary" /> {badge}</span>; })}
            </div>
          </div>

          {/* editor mock or master-provided visual */}
          <div className="relative rounded-2xl border border-border bg-card p-3 shadow-2xl">
            {content.hero.image ? <img src={content.hero.image} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" /> : <>
            <div className="flex items-center gap-2 px-2 pb-3">
              <span className="size-2.5 rounded-full bg-primary/70" />
              <span className="size-2.5 rounded-full bg-muted-foreground/40" />
              <span className="size-2.5 rounded-full bg-muted-foreground/25" />
              <span className="ml-2 text-[11px] font-semibold text-muted-foreground">
                Projeto · Lançamento setembro
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2 space-y-2">
                {["Ajuste", "Bordas", "Overlay", "Título", "Extras"].map((tab, i) => (
                  <div
                    key={tab}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${
                      i === 0
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {tab}
                  </div>
                ))}
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Zoom
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 w-2/5 rounded-full bg-primary" />
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Posição
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 w-3/5 rounded-full bg-primary/70" />
                  </div>
                </div>
              </div>
              <div className="col-span-3 space-y-3">
                <div className="relative mx-auto aspect-[9/16] w-full max-w-[190px] overflow-hidden rounded-xl border border-border bg-gradient-to-b from-primary/25 via-background to-background">
                  <div className="absolute inset-x-3 bottom-4 rounded-md bg-background/70 px-2 py-1 text-center text-[10px] font-bold uppercase">
                    Seu título aqui
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-[11px] font-semibold">
                  <div className="flex items-center justify-between">
                    <span>Fila</span>
                    <span className="text-primary">48 / 100</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-muted-foreground">
                    <span>Tempo restante</span>
                    <span>00:04:12</span>
                  </div>
                </div>
              </div>
            </div>
            </>}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="recursos" className="border-t border-border/60 bg-card/30 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {content.features.eyebrow}
          </p>
          <div className="mt-3 gap-8 md:flex md:items-end md:justify-between">
            <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="md:hidden">{content.mobile.featuresTitle}</span><span className="hidden md:inline">{content.features.title} <span className="text-primary">{content.features.highlight}</span></span>
            </h2>
            <p className="mt-4 hidden max-w-sm text-sm leading-relaxed text-muted-foreground md:mt-0 md:block">
              {content.features.intro}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60 [&:nth-child(n+5)]:hidden md:[&:nth-child(n+5)]:block"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* differentials */}
      <section className="hidden py-16 md:block md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {content.benefits.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {content.benefits.title} <span className="text-primary">{content.benefits.highlight}</span>
            </h2>
            <ul className="mt-7 space-y-3">
              {content.benefits.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-semibold">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {content.benefits.stats.map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-6">
                <p className="font-display text-3xl font-bold text-primary">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="como-funciona" className="hidden border-y md:block border-border/60 bg-card/30 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{content.steps.eyebrow}</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {content.steps.title} <span className="text-primary">{content.steps.highlight}</span>
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.steps.items.map((s, i) => (
              <div key={`${s.title}-${i}`} className="rounded-xl border border-border bg-card p-5">
                <p className="font-display text-2xl font-bold text-primary">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* for who */}
      <section id="para-quem" className="hidden py-16 md:block md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {content.audience.eyebrow}
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {content.audience.title} <span className="text-primary">{content.audience.highlight}</span>
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.audience.items.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="hidden border-t md:block border-border/60 bg-card/30 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {content.faq.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {content.faq.title} <span className="text-primary">{content.faq.highlight}</span>
            </h2>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {content.faq.items.map((item, i) => (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold transition-colors hover:text-primary"
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <ChevronDown
                    className={`size-4 shrink-0 transition-transform ${openFaq === i ? "rotate-180 text-primary" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                    {withSystemName(item.a, branding.system_name)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* final cta */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card px-6 py-14 text-center" style={content.cta.image ? { backgroundImage: `linear-gradient(rgb(0 0 0 / .68), rgb(0 0 0 / .68)), url(${content.cta.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
            <div
              className="pointer-events-none absolute inset-x-0 -bottom-24 h-64 opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
              aria-hidden
            />
            <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {content.cta.title}
              <br />
              <span className="text-primary">{content.cta.highlight}</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              <span className="md:hidden">{content.mobile.ctaText}</span>
              <span className="hidden md:inline">{content.cta.text}</span>
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/login">
                <Button size="lg" className="font-bold">
                  {content.cta.primary} <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#recursos">
                <Button size="lg" variant="outline" className="font-bold">
                  {content.cta.secondary}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex min-w-0 items-center gap-2">
            {brandImage ? (
              <img
                src={brandImage}
                alt=""
                className="size-8 shrink-0 object-contain"
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scissors className="size-3.5" />
              </span>
            )}
            <span className="truncate font-display font-bold text-foreground">
              {branding.system_name}
            </span>
          </div>
          <p className="text-xs">{content.footer.text}</p>
          <Link to="/login" className="text-xs font-bold text-primary hover:underline">
            {content.footer.login}
          </Link>
        </div>
      </footer>
    </div>
  );
}
