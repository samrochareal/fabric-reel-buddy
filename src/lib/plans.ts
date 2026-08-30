export type Plan = {
  id: string;
  name: string;
  credits: number;
  priceBRL: number | null;
  description: string;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Grátis",
    credits: 7,
    priceBRL: null,
    description: "Para experimentar o Modo Turbo",
    features: ["7 vídeos no Modo Turbo", "Formatos 9:16, 1:1 e 4:5", "Baixe em MP4"],
  },
  {
    id: "starter",
    name: "Starter",
    credits: 30,
    priceBRL: 29,
    description: "Para quem posta toda semana",
    features: ["30 créditos de vídeo", "Todos os formatos", "Modo Turbo + Completo", "Créditos não expiram"],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 100,
    priceBRL: 79,
    description: "Para criadores e social media",
    features: ["100 créditos de vídeo", "Todos os formatos", "Modo Turbo + Completo", "Suporte prioritário"],
    highlight: true,
  },
  {
    id: "studio",
    name: "Studio",
    credits: 300,
    priceBRL: 189,
    description: "Para agências e alto volume",
    features: ["300 créditos de vídeo", "Todos os formatos", "Modo Turbo + Completo", "Suporte prioritário"],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
