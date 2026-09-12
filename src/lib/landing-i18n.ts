import { useMemo } from "react";
import { useLang, type Lang } from "@/lib/i18n";
import type { LandingContent, LandingPlan } from "@/lib/landing-content";

/**
 * The landing page texts are written in Portuguese (that is what the master
 * edits). When the visitor picks English we swap the known texts for their
 * English version; anything the master wrote himself stays as it is.
 */
const EN: Record<string, string> = {
  // nav
  Recursos: "Features",
  "Como funciona": "How it works",
  "Para quem é": "Who it's for",
  Entrar: "Sign in",
  "Entrar na plataforma": "Sign in to the platform",

  // hero
  "Edite mais. Produza mais.": "Edit more. Publish more.",
  "Transforme horas de edição em": "Turn hours of editing into",
  "resultados reais.": "real results.",
  "O {system} edita dezenas de vídeos ao mesmo tempo: enquadramento, bordas, overlays e títulos aplicados em lote e prontos para Reels, TikTok e Shorts.":
    "{system} edits dozens of videos at once: framing, borders, overlays and titles applied in batch and ready for Reels, TikTok and Shorts.",
  "Começar agora": "Get started",
  "Ver como funciona": "See how it works",
  "Até 100 vídeos por lote": "Up to 100 videos per batch",
  "Modo turbo": "Turbo mode",
  "Sem instalar nada": "Nothing to install",

  // features
  "Tudo em um só lugar": "Everything in one place",
  "Seu fluxo de criação": "Your creative workflow",
  "muito mais simples.": "made much simpler.",
  "Cada recurso existe para tirar trabalho repetitivo do seu dia e devolver tempo para criar.":
    "Every feature is here to take repetitive work off your day and give you time to create.",
  "Processamento em massa": "Batch processing",
  "Envie até 100 vídeos por lote e aplique as mesmas configurações em todos com um clique.":
    "Upload up to 100 videos per batch and apply the same settings to all of them in one click.",
  "Enquadramento preciso": "Precise framing",
  "Zoom de 50% a 500% e posição X/Y livres, sempre no formato 9:16, sem cortar a duração.":
    "Zoom from 50% to 500% and free X/Y position, always in 9:16, without cutting the length.",
  "Bordas inteligentes": "Smart borders",
  "Corte as laterais, o topo ou a base do vídeo para tirar marcas e logos indesejados.":
    "Crop the sides, top or bottom of the video to remove unwanted marks and logos.",
  "Overlays e criador próprio": "Overlays and your own creator",
  "Monte suas molduras no criador de overlay, salve perfis com nome e reutilize quando quiser.":
    "Build your frames in the overlay creator, save named profiles and reuse them anytime.",
  "Títulos que chamam atenção": "Titles that grab attention",
  "Fontes de impacto, cores, contorno e posição livre — aplicados no lote ou só em um vídeo.":
    "Bold fonts, colours, outline and free position — applied to the batch or to a single video.",
  "Modo anti-duplicidade": "Anti-duplicate mode",
  "Pequenos ajustes automáticos de velocidade e metadados para cada cópia sair única.":
    "Small automatic speed and metadata tweaks so every copy comes out unique.",
  "Processamento turbo": "Turbo processing",
  "Renderiza o lote no menor tempo possível e entrega arquivos bem mais leves.":
    "Renders the batch in the shortest time possible and delivers much lighter files.",
  "Fila com controle total": "Full control of the queue",
  "Prévia, pausa que respeita o vídeo atual e tempo estimado que diminui em tempo real.":
    "Preview, a pause that respects the current video and an estimate that counts down live.",
  "Seus vídeos não saem do navegador": "Your videos never leave your browser",
  "Toda a edição acontece no seu dispositivo. Nada é enviado para servidores externos.":
    "All editing happens on your device. Nothing is sent to external servers.",

  // benefits
  "Do primeiro clipe à publicação": "From the first clip to publishing",
  "Tudo o que você precisa para criar": "Everything you need to create",
  "sem limites.": "without limits.",
  "Projetos separados, cada um com suas próprias configurações":
    "Separate projects, each with its own settings",
  "Prévia em tempo real antes de processar o lote":
    "Live preview before processing the batch",
  "Overlays salvos com nome e imagens de fundo reutilizáveis":
    "Named saved overlays and reusable background images",
  "Ajuste individual com “somente este vídeo”": "Single-video tweaks with “this video only”",
  "Créditos, indicações e notificações no mesmo painel":
    "Credits, referrals and notifications in one panel",
  "Português e inglês, tema claro e escuro":
    "Portuguese and English, light and dark theme",
  "vídeos por lote": "videos per batch",
  "formato garantido": "guaranteed format",
  "programas para instalar": "programs to install",
  "1 clique": "1 click",
  "para aplicar em todos": "to apply to all",

  // steps
  "Em poucos passos,": "In a few steps,",
  "você vai mais longe.": "you go much further.",
  "Crie um projeto": "Create a project",
  "Cada projeto guarda suas configurações, overlays, títulos e imagens de fundo.":
    "Each project keeps its own settings, overlays, titles and background images.",
  "Suba o lote": "Upload the batch",
  "Arraste seus clipes e veja a prévia do resultado antes de processar.":
    "Drag your clips in and preview the result before processing.",
  "Ajuste uma vez": "Adjust once",
  "Enquadramento, bordas, overlay e título valem para todos os vídeos.":
    "Framing, borders, overlay and title apply to every video.",
  "Baixe tudo pronto": "Download everything",
  "Os arquivos saem nomeados pelo projeto, prontos para publicar.":
    "Files come out named after the project, ready to publish.",

  // plans
  "Planos e créditos": "Plans and credits",
  "Compre créditos no seu": "Buy credits at your own",
  "ritmo de produção.": "production pace.",
  "Cada crédito equivale a um vídeo processado. Pagamento único: os créditos entram na sua conta assim que o pagamento é confirmado e não expiram.":
    "One credit equals one processed video. One-time payment: credits land in your account as soon as the payment is confirmed and never expire.",
  Grátis: "Free",
  "para sempre": "forever",
  "pagamento único": "one-time payment",
  "Créditos liberados automaticamente todos os dias":
    "Credits released automatically every day",
  "Créditos gratuitos renovados automaticamente":
    "Free credits renewed automatically",
  "Todos os formatos": "All formats",
  "Sem cartão de crédito": "No credit card",
  "Começar grátis": "Start for free",
  "150 créditos": "150 credits",
  "500 créditos": "500 credits",
  "1200 créditos": "1200 credits",
  "Para quem posta toda semana": "For people posting every week",
  "Para criadores e social media": "For creators and social media",
  "Para agências e alto volume": "For agencies and high volume",
  "150 vídeos processados": "150 processed videos",
  "500 vídeos processados": "500 processed videos",
  "1200 vídeos processados": "1200 processed videos",
  "Créditos não expiram": "Credits never expire",
  "Suporte prioritário": "Priority support",
  "Comprar 150 créditos": "Buy 150 credits",
  "Comprar 500 créditos": "Buy 500 credits",
  "Comprar 1200 créditos": "Buy 1200 credits",
  "Comprar créditos": "Buy credits",

  // audience
  "Para criadores, marcas e equipes": "For creators, brands and teams",
  "Feito para quem": "Made for people who",
  "vive de conteúdo.": "live on content.",
  "Criadores de conteúdo": "Content creators",
  "Produza semanas de posts em uma única sessão.":
    "Produce weeks of posts in a single session.",
  "Social media e agências": "Social media and agencies",
  "Entregue vários clientes com o mesmo padrão visual.":
    "Deliver several clients with the same visual standard.",
  "Lojas e infoprodutos": "Stores and digital products",
  "Teste dezenas de variações do mesmo anúncio.":
    "Test dozens of variations of the same ad.",
  "Equipes de edição": "Editing teams",
  "Perfis salvos mantêm a identidade em todo o time.":
    "Saved profiles keep the identity across the whole team.",

  // faq
  "Dúvidas frequentes": "Frequently asked questions",
  Perguntas: "Questions",
  "mais comuns.": "people ask the most.",
  "Preciso instalar algum programa?": "Do I need to install anything?",
  "Não. O {system} roda direto no navegador, no computador ou no celular.":
    "No. {system} runs straight in your browser, on desktop or mobile.",
  "Quantos vídeos posso processar de uma vez?":
    "How many videos can I process at once?",
  "Até 100 vídeos por lote, com até 100 MB e 3 minutos cada.":
    "Up to 100 videos per batch, each up to 100 MB and 3 minutes long.",
  "Meus vídeos ficam seguros?": "Are my videos safe?",
  "Sim. A edição acontece no seu próprio dispositivo, então os arquivos não são enviados para fora.":
    "Yes. Editing happens on your own device, so files are never sent anywhere.",
  "Consigo aplicar um ajuste em apenas um vídeo do lote?":
    "Can I adjust a single video of the batch?",
  "Sim. A opção “somente este vídeo” altera apenas o vídeo aberto na prévia.":
    "Yes. The “this video only” option changes just the video open in the preview.",
  "Posso salvar minhas molduras e títulos?": "Can I save my frames and titles?",
  "Sim. Overlays, títulos e imagens de fundo ficam salvos dentro de cada projeto.":
    "Yes. Overlays, titles and background images are saved inside each project.",

  // final cta & footer
  "Menos tempo editando.": "Less time editing.",
  "Mais vídeos no ar.": "More videos live.",
  "Entre agora e veja como é rápido transformar um lote de clipes em conteúdo pronto para publicar.":
    "Sign in now and see how fast a batch of clips becomes content ready to publish.",
  "Ver recursos": "See features",
  "Mais conteúdo. Mais resultados.": "More content. More results.",

  // mobile copy
  "Edite até 100 vídeos de uma vez, direto no navegador.":
    "Edit up to 100 videos at once, straight in your browser.",
  "Tudo para editar mais rápido.": "Everything to edit faster.",
  "Entre e deixe seu próximo lote pronto em poucos passos.":
    "Sign in and get your next batch done in a few steps.",
};

/** Translates one landing string, keeping unknown (master-written) text as is. */
export function landingText(text: string, lang: Lang, extra?: Record<string, string>): string {
  if (lang === "pt") return text;
  const trimmed = text.trim();
  return EN[trimmed] ?? extra?.[trimmed] ?? text;
}

/** Keys whose values are not user-facing text and must never be translated. */
const SKIP = new Set([
  "links",
  "styles",
  "colors",
  "hidden",
  "sections",
  "removedSections",
  "image",
  "id",
  "priceId",
]);

function deep<T>(value: T, lang: Lang, extra?: Record<string, string>): T {
  if (typeof value === "string") return landingText(value, lang, extra) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => deep(item, lang, extra)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SKIP.has(key) ? item : deep(item, lang, extra);
    }
    return out as unknown as T;
  }
  return value;
}

export function translateLandingContent(
  content: LandingContent,
  lang: Lang,
  extra?: Record<string, string>,
): LandingContent {
  if (lang === "pt") return content;
  return deep(content, lang, extra);
}

export function translateLandingPlan(
  plan: LandingPlan,
  lang: Lang,
  extra?: Record<string, string>,
): LandingPlan {
  if (lang === "pt") return plan;
  return deep(plan, lang, extra);
}

/** True when a string looks like visible copy (not a URL, colour or number). */
function isCopy(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 600) return false;
  if (/^(https?:|\/|#|mailto:|data:)/i.test(trimmed)) return false;
  if (/^[\d\s.,%$R+-]+$/.test(trimmed)) return false;
  return /\p{L}{2}/u.test(trimmed);
}

/** Collects the strings that the built-in dictionary does not cover. */
function collectUnknown(value: unknown, acc: Set<string>): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!EN[trimmed] && isCopy(trimmed)) acc.add(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUnknown(item, acc));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (!SKIP.has(key)) collectUnknown(item, acc);
    }
  }
}

/**
 * Translates the texts the master typed himself, on demand, and remembers the
 * result so the page does not translate the same sentence twice.
 */
function useMasterTexts(source: unknown, lang: Lang, enabled: boolean): Record<string, string> {
  const translate = useServerFn(translateLandingTexts);
  const [map, setMap] = useState<Record<string, string>>({});

  const pending = useMemo(() => {
    if (!enabled || lang === "pt") return [] as string[];
    const acc = new Set<string>();
    collectUnknown(source, acc);
    return Array.from(acc).filter((text) => !(text in map));
  }, [source, lang, enabled, map]);

  const key = pending.join("\u0000");

  useEffect(() => {
    if (!key) return;
    let active = true;
    void (async () => {
      try {
        const result = await translate({ data: { lang: "en", texts: key.split("\u0000") } });
        if (!active) return;
        setMap((prev) => {
          const next = { ...prev };
          for (const text of key.split("\u0000")) next[text] = result[text] ?? text;
          return next;
        });
      } catch {
        if (active) {
          setMap((prev) => {
            const next = { ...prev };
            for (const text of key.split("\u0000")) next[text] = text;
            return next;
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [key, translate]);

  return map;
}

/** Landing content already translated to the language the visitor is using. */
export function useLandingContent(content: LandingContent, enabled = true): LandingContent {
  const [lang] = useLang();
  const extra = useMasterTexts(content, lang, enabled);
  return useMemo(
    () => (enabled ? translateLandingContent(content, lang, extra) : content),
    [content, lang, enabled, extra],
  );
}

/** Plan texts translated to the visitor's language. */
export function useLandingPlans(plans: LandingPlan[]): LandingPlan[] {
  const [lang] = useLang();
  const extra = useMasterTexts(plans, lang, true);
  return useMemo(
    () => plans.map((plan) => translateLandingPlan(plan, lang, extra)),
    [plans, lang, extra],
  );
}

