import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UploadCloud,
  Crop,
  Download,
  Zap,
  ShieldCheck,
  Timer,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fábrica de Reels — Edite vídeos em massa e economize horas" },
      {
        name: "description",
        content:
          "Suba até 50 clipes de uma vez, ajuste o enquadramento em segundos e baixe tudo pronto. Modo Turbo: cada vídeo fica pronto em cerca de 30 segundos.",
      },
      { property: "og:title", content: "Fábrica de Reels — Edite vídeos em massa" },
      {
        property: "og:description",
        content: "Suba até 50 clipes, enquadre em segundos e baixe tudo pronto para Reels, TikTok e Shorts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    icon: UploadCloud,
    title: "Suba seus clipes",
    text: "Arraste até 50 vídeos de uma vez. Nada sai do seu computador: o processamento acontece no seu navegador.",
  },
  {
    icon: Crop,
    title: "Escolha o enquadramento",
    text: "9:16 para Reels e Shorts, 1:1 ou 4:5 para o feed. Modo Turbo corta e preenche; Modo Completo mantém o vídeo inteiro com fundo desfocado.",
  },
  {
    icon: Download,
    title: "Baixe tudo pronto",
    text: "Receba cada vídeo em MP4 otimizado ou baixe o lote inteiro em um único .zip.",
  },
];

const BULLETS = [
  { icon: Zap, text: "Modo Turbo: cerca de 30 segundos por vídeo" },
  { icon: ShieldCheck, text: "Seus vídeos nunca saem do seu dispositivo" },
  { icon: Timer, text: "Sem filas: o processamento começa na hora" },
];

const FAQS = [
  {
    q: "Já paguei, e agora?",
    a: "Basta criar uma conta ou fazer login com o mesmo e-mail usado na compra. Seus créditos aparecem automaticamente.",
  },
  {
    q: "Os planos renovam automaticamente?",
    a: "Não. Você compra créditos conforme a necessidade — sem renovação mensal nem cobrança recorrente. Créditos não expiram.",
  },
  {
    q: "Comprar um plano menor faz downgrade?",
    a: "Não. Comprar um plano menor apenas soma créditos à sua conta — seu plano atual e benefícios não sofrem downgrade.",
  },
  {
    q: "Meus vídeos são enviados para algum servidor?",
    a: "Não. Todo o processamento acontece localmente no seu navegador. Seus arquivos nunca saem do seu dispositivo.",
  },
  {
    q: "Quantos vídeos posso processar de uma vez?",
    a: "Até 50 clipes por lote, em qualquer um dos formatos disponíveis (9:16, 1:1 e 4:5).",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-fade" aria-hidden />
        <div
          className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.78 0.19 55 / 60%), transparent)" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 text-center md:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Zap className="size-3.5 text-turbo" />
            Plano Grátis: 7 vídeos no Modo Turbo por conta, grátis
          </div>
          <h1 className="mx-auto max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Edite vídeos <span className="text-gradient-brand">em massa</span> e economize horas.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Suba até 50 clipes de uma vez, ajuste o enquadramento em segundos e baixe tudo pronto.
            Com o Modo Turbo, cada vídeo fica pronto em cerca de 30 segundos.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="glow-primary h-12 px-8 text-base font-semibold">
              <Link to="/auth">
                Começar grátis <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link to="/pricing">Ver planos</Link>
            </Button>
          </div>
          <ul className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {BULLETS.map((b) => (
              <li key={b.text} className="flex items-center gap-2">
                <b.icon className="size-4 text-turbo" />
                {b.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight md:text-4xl">
            Veja como funciona
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Do upload ao download em três passos — sem instalar nada.
          </p>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="group relative rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/50"
              >
                <span className="absolute right-6 top-6 font-display text-5xl font-bold text-border transition-colors group-hover:text-primary/30">
                  {i + 1}
                </span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <step.icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight md:text-4xl">
            Créditos que não expiram
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Sem mensalidade, sem renovação automática. Compre quando precisar.
          </p>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.highlight
                    ? "glow-primary border-primary/60 bg-card"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    Mais popular
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                <p className="mt-5 font-display text-4xl font-bold">
                  {plan.priceBRL == null ? "R$ 0" : `R$ ${plan.priceBRL}`}
                </p>
                <p className="text-sm text-muted-foreground">{plan.credits} créditos</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-turbo" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-7 w-full font-semibold"
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link to={plan.priceBRL == null ? "/auth" : "/pricing"}>
                    {plan.priceBRL == null ? "Começar grátis" : "Comprar créditos"}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight md:text-4xl">
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="mt-12">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-display text-base font-semibold">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
