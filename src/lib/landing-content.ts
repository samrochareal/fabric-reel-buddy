import { supabase } from "@/integrations/supabase/client";

export type LandingFeature = { title: string; text: string };
export type LandingStep = { title: string; text: string };
export type LandingAudience = { title: string; text: string };
export type LandingFaq = { q: string; a: string };
export type LandingElementStyle = {
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  width?: number;
  x?: number;
  y?: number;
  textAlign?: "left" | "center" | "right";
};

export type LandingPlan = {
  id: string;
  priceId: string;
  name: string;
  price: string;
  period: string;
  credits: number;
  description: string;
  features: string[];
  active: boolean;
  highlight: boolean;
  cta: string;
};

export const LANDING_SECTIONS = ["hero", "features", "benefits", "steps", "plans", "audience", "faq", "cta"] as const;
export type LandingSection = (typeof LANDING_SECTIONS)[number];

export type LandingContent = {
  sections: LandingSection[];
  hidden: Record<string, boolean>;
  links: Record<string, string>;
  styles: Record<string, LandingElementStyle>;
  colors: { primary: string; background: string; accent: string };
  nav: { features: string; how: string; audience: string; faq: string; login: string };
  hero: {
    eyebrow: string;
    title: string;
    highlight: string;
    text: string;
    primaryCta: string;
    secondaryCta: string;
    badges: string[];
    image: string | null;
  };
  features: { eyebrow: string; title: string; highlight: string; intro: string; items: LandingFeature[] };
  benefits: { eyebrow: string; title: string; highlight: string; items: string[]; stats: LandingFeature[] };
  steps: { eyebrow: string; title: string; highlight: string; items: LandingStep[] };
  plans: { eyebrow: string; title: string; highlight: string; intro: string; items: LandingPlan[] };
  audience: { eyebrow: string; title: string; highlight: string; items: LandingAudience[] };
  faq: { eyebrow: string; title: string; highlight: string; items: LandingFaq[] };
  cta: { title: string; highlight: string; text: string; primary: string; secondary: string; image: string | null };
  footer: { text: string; login: string };
  mobile: { heroText: string; featuresTitle: string; ctaText: string };
};

export const defaultLandingContent: LandingContent = {
  sections: [...LANDING_SECTIONS],
  hidden: {},
  links: {},
  styles: {},
  colors: { primary: "#f97316", background: "#0b0b0d", accent: "#27272a" },
  nav: { features: "Recursos", how: "Como funciona", audience: "Para quem é", faq: "FAQ", login: "Entrar" },
  hero: {
    eyebrow: "Edite mais. Produza mais.", title: "Transforme horas de edição em", highlight: "resultados reais.",
    text: "O {system} edita dezenas de vídeos ao mesmo tempo: enquadramento, bordas, overlays e títulos aplicados em lote e prontos para Reels, TikTok e Shorts.",
    primaryCta: "Começar agora", secondaryCta: "Ver como funciona",
    badges: ["Até 100 vídeos por lote", "Modo turbo", "Sem instalar nada"], image: null,
  },
  features: {
    eyebrow: "Tudo em um só lugar", title: "Seu fluxo de criação", highlight: "muito mais simples.",
    intro: "Cada recurso existe para tirar trabalho repetitivo do seu dia e devolver tempo para criar.",
    items: [
      { title: "Processamento em massa", text: "Envie até 100 vídeos por lote e aplique as mesmas configurações em todos com um clique." },
      { title: "Enquadramento preciso", text: "Zoom de 50% a 500% e posição X/Y livres, sempre no formato 9:16, sem cortar a duração." },
      { title: "Bordas inteligentes", text: "Corte as laterais, o topo ou a base do vídeo para tirar marcas e logos indesejados." },
      { title: "Overlays e criador próprio", text: "Monte suas molduras no criador de overlay, salve perfis com nome e reutilize quando quiser." },
      { title: "Títulos que chamam atenção", text: "Fontes de impacto, cores, contorno e posição livre — aplicados no lote ou só em um vídeo." },
      { title: "Modo anti-duplicidade", text: "Pequenos ajustes automáticos de velocidade e metadados para cada cópia sair única." },
      { title: "Processamento turbo", text: "Renderiza o lote no menor tempo possível e entrega arquivos bem mais leves." },
      { title: "Fila com controle total", text: "Prévia, pausa que respeita o vídeo atual e tempo estimado que diminui em tempo real." },
      { title: "Seus vídeos não saem do navegador", text: "Toda a edição acontece no seu dispositivo. Nada é enviado para servidores externos." },
    ],
  },
  benefits: {
    eyebrow: "Do primeiro clipe à publicação", title: "Tudo o que você precisa para criar", highlight: "sem limites.",
    items: ["Projetos separados, cada um com suas próprias configurações", "Prévia em tempo real antes de processar o lote", "Overlays salvos com nome e imagens de fundo reutilizáveis", "Ajuste individual com “somente este vídeo”", "Créditos, indicações e notificações no mesmo painel", "Português e inglês, tema claro e escuro"],
    stats: [{ title: "100", text: "vídeos por lote" }, { title: "9:16", text: "formato garantido" }, { title: "0", text: "programas para instalar" }, { title: "1 clique", text: "para aplicar em todos" }],
  },
  steps: { eyebrow: "Como funciona", title: "Em poucos passos,", highlight: "você vai mais longe.", items: [{ title: "Crie um projeto", text: "Cada projeto guarda suas configurações, overlays, títulos e imagens de fundo." }, { title: "Suba o lote", text: "Arraste seus clipes e veja a prévia do resultado antes de processar." }, { title: "Ajuste uma vez", text: "Enquadramento, bordas, overlay e título valem para todos os vídeos." }, { title: "Baixe tudo pronto", text: "Os arquivos saem nomeados pelo projeto, prontos para publicar." }] },
  plans: {
    eyebrow: "Planos e créditos",
    title: "Escolha o plano do seu",
    highlight: "ritmo de produção.",
    intro: "Cada crédito equivale a um vídeo processado. Os créditos entram na sua conta assim que o pagamento é confirmado.",
    items: [
      {
        id: "starter", priceId: "starter_monthly", name: "Starter", price: "R$ 29", period: "/mês", credits: 30,
        description: "Para quem posta toda semana",
        features: ["30 créditos de vídeo por mês", "Todos os formatos", "Créditos somados na sua conta"],
        active: true, highlight: false, cta: "Assinar Starter",
      },
      {
        id: "pro", priceId: "pro_monthly", name: "Pro", price: "R$ 79", period: "/mês", credits: 100,
        description: "Para criadores e social media",
        features: ["100 créditos de vídeo por mês", "Todos os formatos", "Suporte prioritário"],
        active: true, highlight: true, cta: "Assinar Pro",
      },
      {
        id: "studio", priceId: "studio_monthly", name: "Studio", price: "R$ 189", period: "/mês", credits: 300,
        description: "Para agências e alto volume",
        features: ["300 créditos de vídeo por mês", "Todos os formatos", "Suporte prioritário"],
        active: true, highlight: false, cta: "Assinar Studio",
      },
    ],
  },
  audience: { eyebrow: "Para criadores, marcas e equipes", title: "Feito para quem", highlight: "vive de conteúdo.", items: [{ title: "Criadores de conteúdo", text: "Produza semanas de posts em uma única sessão." }, { title: "Social media e agências", text: "Entregue vários clientes com o mesmo padrão visual." }, { title: "Lojas e infoprodutos", text: "Teste dezenas de variações do mesmo anúncio." }, { title: "Equipes de edição", text: "Perfis salvos mantêm a identidade em todo o time." }] },
  faq: { eyebrow: "Dúvidas frequentes", title: "Perguntas", highlight: "mais comuns.", items: [{ q: "Preciso instalar algum programa?", a: "Não. O {system} roda direto no navegador, no computador ou no celular." }, { q: "Quantos vídeos posso processar de uma vez?", a: "Até 100 vídeos por lote, com até 100 MB e 3 minutos cada." }, { q: "Meus vídeos ficam seguros?", a: "Sim. A edição acontece no seu próprio dispositivo, então os arquivos não são enviados para fora." }, { q: "Consigo aplicar um ajuste em apenas um vídeo do lote?", a: "Sim. A opção “somente este vídeo” altera apenas o vídeo aberto na prévia." }, { q: "Posso salvar minhas molduras e títulos?", a: "Sim. Overlays, títulos e imagens de fundo ficam salvos dentro de cada projeto." }] },
  cta: { title: "Menos tempo editando.", highlight: "Mais vídeos no ar.", text: "Entre agora e veja como é rápido transformar um lote de clipes em conteúdo pronto para publicar.", primary: "Começar agora", secondary: "Ver recursos", image: null },
  footer: { text: "Mais conteúdo. Mais resultados.", login: "Entrar na plataforma" },
  mobile: { heroText: "Edite até 100 vídeos de uma vez, direto no navegador.", featuresTitle: "Tudo para editar mais rápido.", ctaText: "Entre e deixe seu próximo lote pronto em poucos passos." },
};

function merge<T>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return base;
  const out = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(saved as Record<string, unknown>)) {
    if (value !== undefined && value !== null) {
      out[key] = typeof value === "object" && !Array.isArray(value) ? merge(out[key], value) : value;
    }
  }
  return out as T;
}

export function normalizeLandingContent(value: unknown) {
  const merged = merge(defaultLandingContent, value);
  const saved = Array.isArray(merged.sections) ? merged.sections : [];
  const order = saved.filter((s): s is LandingSection => (LANDING_SECTIONS as readonly string[]).includes(s));
  return { ...merged, sections: order.length ? order : [...LANDING_SECTIONS] };
}

/** An empty text means the master removed that element from the page. */
export function shown(text: string | null | undefined) {
  return Boolean(String(text ?? "").trim());
}
export function withSystemName(text: string, systemName: string) { return text.replaceAll("{system}", systemName); }

export async function saveLandingContent(content: LandingContent) {
  const { error } = await supabase.from("platform_settings").update({ landing_content: content as never }).eq("id", true);
  if (error) throw error;
}