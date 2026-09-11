import { createFileRoute } from "@tanstack/react-router";
import { LandingView } from "@/components/landing/landing-view";
import { useBranding } from "@/lib/branding";
import { normalizeLandingContent } from "@/lib/landing-content";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const branding = useBranding();
  const isMobile = useIsMobile();
  const content = normalizeLandingContent(branding.landing_content);

  return (
    <LandingView
      content={content}
      systemName={branding.ready ? branding.system_name : ""}
      brandImage={branding.ready ? branding.logo_url || branding.icon_url : null}
      device={isMobile ? "mobile" : "desktop"}
    />
  );
}
