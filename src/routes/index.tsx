import { createFileRoute } from "@tanstack/react-router";
import { LandingView } from "@/components/landing/landing-view";
import { useBranding } from "@/lib/branding";
import { normalizeLandingContent } from "@/lib/landing-content";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Batch video editor — Reels, TikTok and Shorts" },
      {
        name: "description",
        content:
          "Upload up to 100 videos, batch-adjust framing, borders, overlays and titles, and download everything ready for Reels, TikTok and Shorts. All in your browser.",
      },
      { property: "og:title", content: "Batch video editor — Reels, TikTok and Shorts" },
      {
        property: "og:description",
        content:
          "Batch editing of up to 100 videos with framing, borders, overlays, titles and turbo mode. Nothing to install.",
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

  if (!branding.ready) return <main className="min-h-screen bg-background" aria-busy="true" />;

  return (
    <LandingView
      content={content}
      systemName={branding.system_name}
      brandImage={branding.logo_url || branding.icon_url}
      device={isMobile ? "mobile" : "desktop"}
    />
  );
}
