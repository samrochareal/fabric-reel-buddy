import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/criador-de-overlay")({
  head: () => ({
    meta: [
      { title: "Criador de Overlay — Fábrica de Reels" },
      {
        name: "description",
        content:
          "Monte uma overlay personalizada com seu nome, @ e foto e baixe em PNG transparente para usar nos seus vídeos 9:16.",
      },
      { property: "og:title", content: "Criador de Overlay — Fábrica de Reels" },
      {
        property: "og:description",
        content: "Crie molduras e overlays com nome, @ e foto para seus Reels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OverlayCreator,
});

const W = 1080;
const H = 1920;

function OverlayCreator() {
  const [name, setName] = useState("Seu Nome");
  const [handle, setHandle] = useState("@seuperfil");
  const [color, setColor] = useState("#ffffff");
  const [accent, setAccent] = useState("#ff6a1a");
  const [size, setSize] = useState(56);
  const [posY, setPosY] = useState(0.88);
  const [photo, setPhoto] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const draw = (img?: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, W, H);
      const baseY = H * posY;
      const avatar = size * 1.8;
      const gap = size * 0.5;
      const textLeft = img ? W * 0.5 - (avatar + gap) / 2 + avatar + gap : W * 0.5;

      if (img) {
        const cx = W * 0.5 - (avatar + gap) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, baseY - size * 0.15, avatar / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.strokeStyle = accent;
        ctx.lineWidth = size * 0.12;
        ctx.stroke();
        ctx.clip();
        const r = avatar / 2;
        ctx.drawImage(img, cx - r, baseY - size * 0.15 - r, avatar, avatar);
        ctx.restore();
      }

      ctx.textAlign = img ? "left" : "center";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = size * 0.4;
      ctx.fillStyle = color;
      ctx.font = `800 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(name, textLeft, baseY - size * 0.15);
      ctx.fillStyle = accent;
      ctx.font = `600 ${size * 0.7}px Inter, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(handle, textLeft, baseY + size * 0.75);
      ctx.shadowBlur = 0;
    };

    if (photo) {
      const img = new Image();
      img.onload = () => draw(img);
      img.onerror = () => draw(null);
      img.src = photo;
    } else {
      draw(null);
    }
  }, [name, handle, color, accent, size, posY, photo]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "overlay.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, "image/png");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <Sparkles className="size-5 text-primary" /> Criador de Overlay
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Monte sua overlay com nome, @ e foto. Baixe o PNG transparente e envie no editor, na aba
          Overlay.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="rounded-xl border border-border bg-card p-4">
            <div
              className="relative mx-auto w-full max-w-[240px] overflow-hidden rounded-lg border border-border"
              style={{ aspectRatio: `${W} / ${H}`, background: "#111" }}
            >
              <canvas ref={canvasRef} width={W} height={H} className="size-full" />
            </div>
            <Button className="mt-4 w-full" onClick={download}>
              <Download className="mr-1.5 size-4" /> Baixar overlay (.png)
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Nome</p>
              <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">@ do perfil</p>
              <Input
                className="mt-1.5"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Cor do nome</span>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-14 p-1"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Cor de destaque</span>
                <Input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-8 w-14 p-1"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tamanho do texto</span>
                <span className="font-bold">{size}px</span>
              </div>
              <Slider
                className="mt-2"
                value={[size]}
                min={28}
                max={120}
                step={2}
                onValueChange={([v]) => setSize(v ?? size)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Posição vertical</span>
                <span className="font-bold">{Math.round(posY * 100)}%</span>
              </div>
              <Slider
                className="mt-2"
                value={[posY]}
                min={0.05}
                max={0.95}
                step={0.01}
                onValueChange={([v]) => setPosY(v ?? posY)}
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setPhoto(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <UploadCloud className="mr-1.5 size-4" /> {photo ? "Trocar foto" : "Enviar foto"}
            </Button>
            {photo && (
              <Button variant="ghost" className="w-full" onClick={() => setPhoto(null)}>
                Remover foto
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
