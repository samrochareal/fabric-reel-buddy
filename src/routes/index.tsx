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

const FEATURES = [
  {
    icon: Layers,
    title: "Processamento em massa",
    text: "Envie até 100 vídeos por lote e aplique as mesmas configurações em todos com um clique.",
  },
  {
    icon: Crop,
    title: "Enquadramento preciso",
    text: "Zoom de 50% a 500% e posição X/Y livres, sempre no formato 9:16, sem cortar a duração.",
  },
  {
    icon: Frame,
    title: "Bordas inteligentes",
    text: "Corte as laterais, o topo ou a base do vídeo para tirar marcas e logos indesejados.",
  },
  {
    icon: Images,
    title: "Overlays e criador próprio",
    text: "Monte suas molduras no criador de overlay, salve perfis com nome e reutilize quando quiser.",
  },
  {
    icon: TypeIcon,
    title: "Títulos que chamam atenção",
    text: "Fontes de impacto, cores, contorno e posição livre — aplicados no lote ou só em um vídeo.",
  },
  {
    icon: Wand2,
    title: "Modo anti-duplicidade",
    text: "Pequenos ajustes automáticos de velocidade e metadados para cada cópia sair única.",
  },
  {
    icon: Zap,
    title: "Processamento turbo",
    text: "Renderiza o lote no menor tempo possível e entrega arquivos bem mais leves.",
  },
  {
    icon: Gauge,
    title: "Fila com controle total",
    text: "Prévia, pausa que respeita o vídeo atual e tempo estimado que diminui em tempo real.",
  },
  {
    icon: ShieldCheck,
    title: "Seus vídeos não saem do navegador",
    text: "Toda a edição acontece no seu dispositivo. Nada é enviado para servidores externos.",
  },
];

const STEPS = [
  { n: "01", title: "Crie um projeto", text: "Cada projeto guarda suas configurações, overlays, títulos e imagens de fundo." },
  { n: "02", title: "Suba o lote", text: "Arraste seus clipes e veja a prévia do resultado antes de processar." },
  { n: "03", title: "Ajuste uma vez", text: "Enquadramento, bordas, overlay e título valem para todos os vídeos." },
  { n: "04", title: "Baixe tudo pronto", text: "Os arquivos saem nomeados pelo projeto, prontos para publicar." },
];

const FOR_WHO = [
  { title: "Criadores de conteúdo", text: "Produza semanas de posts em uma única sessão." },
  { title: "Social media e agências", text: "Entregue vários clientes com o mesmo padrão visual." },
  { title: "Lojas e infoprodutos", text: "Teste dezenas de variações do mesmo anúncio." },
  { title: "Equipes de edição", text: "Perfis salvos mantêm a identidade em todo o time." },
];

const FAQ = [
  {
    q: "Preciso instalar algum programa?",
    a: "Não. O Speed Flow roda direto no navegador, no computador ou no celular.",
  },
  {
    q: "Quantos vídeos posso processar de uma vez?",
    a: "Até 100 vídeos por lote, com até 100 MB e 3 minutos cada.",
  },
  {
    q: "Meus vídeos ficam seguros?",
    a: "Sim. A edição acontece no seu próprio dispositivo, então os arquivos não são enviados para fora.",
  },
  {
    q: "Consigo aplicar um ajuste em apenas um vídeo do lote?",
    a: "Sim. A opção “somente este vídeo” altera apenas o vídeo aberto na prévia.",
  },
  {
    q: "Posso salvar minhas molduras e títulos?",
    a: "Sim. Overlays, títulos e imagens de fundo ficam salvos dentro de cada projeto.",
  },
];

function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const branding = useBranding();
  const brandImage = branding.logo_url || branding.icon_url;

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            <a href="#recursos" className="transition-colors hover:text-foreground">Recursos</a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#para-quem" className="transition-colors hover:text-foreground">Para quem é</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>

          <Link to="/login">
            <Button size="sm" className="font-bold">
              <LogIn className="size-4" /> Entrar
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
              Edite mais. Produza mais.
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Transforme horas de edição em{" "}
              <span className="text-primary">resultados reais.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              O {branding.system_name} edita dezenas de vídeos ao mesmo tempo: enquadramento, bordas,
              overlays e títulos aplicados em lote e prontos para Reels, TikTok e Shorts.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button size="lg" className="font-bold">
                  Começar agora <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline" className="font-bold">
                  Ver como funciona
                </Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-2"><Rocket className="size-4 text-primary" /> Até 100 vídeos por lote</span>
              <span className="flex items-center gap-2"><Zap className="size-4 text-primary" /> Modo turbo</span>
              <span className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Sem instalar nada</span>
            </div>
          </div>

          {/* editor mock */}
          <div className="relative rounded-2xl border border-border bg-card p-3 shadow-2xl">
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
          </div>
        </div>
      </section>

      {/* features */}
      <section id="recursos" className="border-t border-border/60 bg-card/30 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Tudo em um só lugar
          </p>
          <div className="mt-3 gap-8 md:flex md:items-end md:justify-between">
            <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Seu fluxo de criação <span className="text-primary">muito mais simples.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground md:mt-0">
              Cada recurso existe para tirar trabalho repetitivo do seu dia e devolver tempo
              para criar.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60"
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
      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Do primeiro clipe à publicação
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo o que você precisa para criar <span className="text-primary">sem limites.</span>
            </h2>
            <ul className="mt-7 space-y-3">
              {[
                "Projetos separados, cada um com suas próprias configurações",
                "Prévia em tempo real antes de processar o lote",
                "Overlays salvos com nome e imagens de fundo reutilizáveis",
                "Ajuste individual com “somente este vídeo”",
                "Créditos, indicações e notificações no mesmo painel",
                "Português e inglês, tema claro e escuro",
              ].map((item) => (
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
            {[
              { k: "100", v: "vídeos por lote" },
              { k: "9:16", v: "formato garantido" },
              { k: "0", v: "programas para instalar" },
              { k: "1 clique", v: "para aplicar em todos" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-border bg-card p-6">
                <p className="font-display text-3xl font-bold text-primary">{s.k}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="como-funciona" className="border-y border-border/60 bg-card/30 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Como funciona</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Em poucos passos, <span className="text-primary">você vai mais longe.</span>
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-card p-5">
                <p className="font-display text-2xl font-bold text-primary">{s.n}</p>
                <h3 className="mt-3 text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* for who */}
      <section id="para-quem" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Para criadores, marcas e equipes
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Feito para quem <span className="text-primary">vive de conteúdo.</span>
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FOR_WHO.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="border-t border-border/60 bg-card/30 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Dúvidas frequentes
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Perguntas <span className="text-primary">mais comuns.</span>
            </h2>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {FAQ.map((item, i) => (
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
                    {item.a.replace("Speed Flow", branding.system_name)}
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
          <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card px-6 py-14 text-center">
            <div
              className="pointer-events-none absolute inset-x-0 -bottom-24 h-64 opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
              aria-hidden
            />
            <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Menos tempo editando.
              <br />
              <span className="text-primary">Mais vídeos no ar.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Entre agora e veja como é rápido transformar um lote de clipes em conteúdo pronto
              para publicar.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/login">
                <Button size="lg" className="font-bold">
                  Começar agora <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#recursos">
                <Button size="lg" variant="outline" className="font-bold">
                  Ver recursos
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
          <p className="text-xs">Mais conteúdo. Mais resultados.</p>
          <Link to="/login" className="text-xs font-bold text-primary hover:underline">
            Entrar na plataforma
          </Link>
        </div>
      </footer>
    </div>
  );
}
