import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Coins,
  Crop,
  FolderPlus,
  Gauge,
  Gift,
  Image as ImageIcon,
  Layers,
  ListVideo,
  Play,
  Settings2,
  Sparkles,
  Type as TypeIcon,
  Upload,
} from "lucide-react";
import { useBranding } from "@/lib/branding";
import { LanguageToggle, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/info")({
  head: () => ({
    meta: [
      { title: "Information — a guided tour of every feature" },
      {
        name: "description",
        content:
          "A simple step-by-step tour of the dashboard: projects, uploads, adjustments, borders, overlays, titles, extras, turbo processing and credits.",
      },
      { property: "og:title", content: "Information — a guided tour of every feature" },
      {
        property: "og:description",
        content: "Learn every feature of the dashboard, one short step at a time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InfoPage,
});

type Step = {
  icon: typeof Play;
  title: [string, string];
  body: [string, string];
  tips?: Array<[string, string]>;
};

const STEPS: Step[] = [
  {
    icon: FolderPlus,
    title: ["1. Crie um projeto", "1. Create a project"],
    body: [
      "Na tela inicial você vê todos os seus projetos. Clique em novo projeto, dê um nome e ele guarda tudo: ajustes, overlays, títulos e imagens de fundo. Volte quando quiser e continue de onde parou.",
      "The first screen lists all of your projects. Create a new one, give it a name and it keeps everything: adjustments, overlays, titles and background images. Come back any time and pick up where you left off.",
    ],
    tips: [
      [
        "O nome do projeto também é usado no nome de cada arquivo pronto, com 8 números aleatórios no final.",
        "The project name is also used in each finished file name, with 8 random numbers at the end.",
      ],
    ],
  },
  {
    icon: Upload,
    title: ["2. Envie seus vídeos", "2. Add your videos"],
    body: [
      "Arraste ou escolha até 100 vídeos por lote. Cada arquivo pode ter até 100MB e 3 minutos. Eles entram numa fila e são preparados um a um, no seu próprio navegador.",
      "Drag in or pick up to 100 videos per batch. Each file can be up to 100MB and 3 minutes long. They go into a queue and are handled one by one, right inside your browser.",
    ],
  },
  {
    icon: ListVideo,
    title: ["3. Entenda a prévia e a fila", "3. The preview and the queue"],
    body: [
      "A prévia mostra sempre um vídeo por vez, no formato vertical 9:16, para você conferir o resultado antes de processar. A lista ao lado mostra o que já ficou pronto e o que ainda falta.",
      "The preview always shows one video at a time, in vertical 9:16, so you can check the result before processing. The list beside it shows what is done and what is still waiting.",
    ],
  },
  {
    icon: Settings2,
    title: ["4. Aba Ajuste", "4. Adjust tab"],
    body: [
      "Aqui você controla o zoom (de 50% a 500%, com 100% centralizado), a posição horizontal e vertical, e o espelhamento da imagem. Tudo mantém o formato vertical, sem cortar a duração.",
      "Here you control zoom (50% to 500%, with 100% centred), horizontal and vertical position, and mirroring. Everything keeps the vertical format and never shortens the video.",
    ],
    tips: [
      [
        "Use \"somente este vídeo\" quando quiser um ajuste diferente apenas no vídeo aberto.",
        "Use \"only this video\" when one single video needs a different adjustment.",
      ],
    ],
  },
  {
    icon: Crop,
    title: ["5. Aba Bordas", "5. Borders tab"],
    body: [
      "Corte as laterais, o topo ou a base para tirar marcas, legendas e elementos que você não quer no vídeo final. As bordas apenas cortam, sem esticar a imagem.",
      "Trim the sides, top or bottom to remove watermarks, captions and anything you don't want in the final video. Borders only crop — they never stretch the image.",
    ],
  },
  {
    icon: Layers,
    title: ["6. Aba Overlay", "6. Overlay tab"],
    body: [
      "Coloque a sua imagem de marca sobre o vídeo, escolhendo tamanho, posição e se ela fica atrás ou à frente. Você pode salvar perfis de overlay e renomeá-los para reutilizar em outros projetos.",
      "Place your brand image over the video, choosing size, position and whether it sits behind or in front. Save overlay profiles and rename them to reuse in other projects.",
    ],
    tips: [
      [
        "No criador de overlay você monta a sua arte com fundo transparente e prévia ao lado.",
        "In the overlay creator you build your artwork with a transparent background and a live preview.",
      ],
    ],
  },
  {
    icon: TypeIcon,
    title: ["7. Aba Título", "7. Title tab"],
    body: [
      "Escreva o título que aparece no vídeo e ajuste fonte, tamanho, cor, fundo e posição. A prévia mostra na hora como o texto vai aparecer.",
      "Write the title that appears on the video and set the font, size, colour, background and position. The preview shows instantly how the text will look.",
    ],
  },
  {
    icon: Sparkles,
    title: ["8. Aba Extras", "8. Extras tab"],
    body: [
      "Aqui ficam a anti-duplicidade (pequena aceleração e mudanças sutis para deixar cada cópia diferente), a velocidade, a remoção de informações do arquivo e as imagens de fundo nomeadas.",
      "This is where you find anti-duplicate mode (a small speed-up and subtle changes so each copy is different), playback speed, file information removal and your named background images.",
    ],
  },
  {
    icon: Gauge,
    title: ["9. Processamento turbo", "9. Turbo processing"],
    body: [
      "Ative o turbo para render mais rápido e escolha a perda de qualidade, o tamanho de saída (480p, 720p ou 1080p) e o tipo de compressão. O painel explica o resultado esperado de cada escolha.",
      "Turn on turbo for faster rendering and choose the quality loss, the output size (480p, 720p or 1080p) and the compression type. The panel explains what to expect from each choice.",
    ],
  },
  {
    icon: Play,
    title: ["10. Processar e pausar", "10. Process and pause"],
    body: [
      "Os botões ficam sempre fixos abaixo da prévia. Ao processar, os controles ficam bloqueados para não mudar nada no meio do caminho. Pausar interrompe só depois de terminar o vídeo atual.",
      "The buttons stay fixed below the preview. While processing, the controls are locked so nothing changes halfway. Pausing stops only after the current video finishes.",
    ],
  },
  {
    icon: ImageIcon,
    title: ["11. Baixe os arquivos prontos", "11. Download the finished files"],
    body: [
      "Cada vídeo concluído fica disponível para download na lista, com o nome do projeto e um código de 8 números — assim nenhum arquivo se confunde com outro.",
      "Every finished video is available to download from the list, named after the project plus an 8-digit code, so no two files get mixed up.",
    ],
  },
  {
    icon: Coins,
    title: ["12. Créditos e recarga", "12. Credits and top-ups"],
    body: [
      "O contador no topo mostra os créditos usados e os disponíveis. Cada vídeo processado consome 1 crédito. Em Adicionar créditos você escolhe um pacote e paga em reais ou em dólar, conforme o seu país.",
      "The counter at the top shows credits used and credits available. Each processed video uses 1 credit. Under Add credits you pick a pack and pay in your local currency, depending on your country.",
    ],
    tips: [
      [
        "Os créditos entram na conta automaticamente assim que o pagamento é confirmado.",
        "Credits land in your account automatically as soon as the payment is confirmed.",
      ],
    ],
  },
  {
    icon: Gift,
    title: ["13. Convites", "13. Referrals"],
    body: [
      "Compartilhe o seu link de convite: cada pessoa que criar conta por ele rende créditos extras para você, e a página mostra quantas pessoas entraram.",
      "Share your invite link: every person who signs up through it earns you extra credits, and the page shows how many people joined.",
    ],
  },
  {
    icon: BadgeCheck,
    title: ["14. Conta e preferências", "14. Account and preferences"],
    body: [
      "No menu lateral você troca entre tema claro e escuro, muda o idioma, vê os seus créditos e sai da conta com segurança.",
      "In the side menu you switch between light and dark themes, change the language, see your credits and sign out safely.",
    ],
  },
];

function InfoPage() {
  const [lang] = useLang();
  const branding = useBranding();
  const i = lang === "pt" ? 0 : 1;
  const [openStep, setOpenStep] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/60"
          >
            <ArrowLeft className="size-3.5" /> {i === 0 ? "Projetos" : "Projects"}
          </Link>
          <span className="font-display text-base font-bold tracking-tight">
            {branding.ready ? branding.system_name : ""}{" "}
            {i === 0 ? "Informações" : "Information"}
          </span>
          <div className="ml-auto">
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {i === 0 ? "Tour completo pelo sistema" : "A complete tour of the system"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {i === 0
            ? "Um passo a passo simples: toque em cada etapa para ver o que ela faz e como usar."
            : "A simple step-by-step guide: tap each step to see what it does and how to use it."}
        </p>

        <ol className="mt-6 space-y-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const open = openStep === index;
            return (
              <li key={step.title[1]} className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenStep(open ? null : index)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{step.title[i]}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {open ? "−" : "+"}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.body[i]}</p>
                    {step.tips?.map((tip) => (
                      <p
                        key={tip[1]}
                        className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs leading-relaxed"
                      >
                        {tip[i]}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {i === 0 ? "Começar agora" : "Start now"}
          </Link>
          <Link
            to="/recharge"
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:border-primary/60"
          >
            {i === 0 ? "Adicionar créditos" : "Add credits"}
          </Link>
        </div>
      </div>
    </div>
  );
}
