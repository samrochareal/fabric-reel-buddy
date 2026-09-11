import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Download,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { LanguageToggle, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  OVERLAY_H,
  OVERLAY_SLOTS,
  OVERLAY_W,
  defaultOverlayConfig,
  deleteOverlay,
  listOverlays,
  saveOverlay,
  type OverlayConfig,
  type OverlayPreset,
  type TextAlign,
} from "@/lib/overlays";

export const Route = createFileRoute("/_authenticated/overlay-creator")({
  head: () => ({
    meta: [
      { title: "Overlay creator — batch video editor" },
      {
        name: "description",
        content:
          "Build the background image for your reels with a photo, name and @, drag to position and save up to 10 presets.",
      },
      { property: "og:title", content: "Overlay creator — batch video editor" },
      {
        property: "og:description",
        content: "Create and save overlays with photo, name and @ to use in your projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OverlayCreator,
});

const W = OVERLAY_W;
const H = OVERLAY_H;

function OverlayCreator() {
  const t = useT();
  const [cfg, setCfg] = useState<OverlayConfig>(defaultOverlayConfig);
  const [presets, setPresets] = useState<OverlayPreset[]>([]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [presetName, setPresetName] = useState("");
  const [hint, setHint] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<"photo" | "text" | "image" | null>(null);

  const patch = (next: Partial<OverlayConfig>) => setCfg((prev) => ({ ...prev, ...next }));

  useEffect(() => {
    void listOverlays().then(setPresets);
  }, []);

  // keep the uploaded photo decoded so the canvas redraws instantly while dragging
  useEffect(() => {
    if (!cfg.photo) {
      imgRef.current = null;
      draw();
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.onerror = () => {
      imgRef.current = null;
      draw();
    };
    img.src = cfg.photo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.photo]);

  useEffect(() => {
    if (!cfg.image) {
      bgImgRef.current = null;
      draw();
      return;
    }
    const img = new Image();
    img.onload = () => {
      bgImgRef.current = img;
      draw();
    };
    img.onerror = () => {
      bgImgRef.current = null;
      draw();
    };
    img.src = cfg.image;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.image]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);
    if (!cfg.bgTransparent) {
      ctx.fillStyle = cfg.bgColor;
      ctx.fillRect(0, 0, W, H);
    }

    const bg = bgImgRef.current;
    const drawUploadedImage = () => {
      if (!bg || bg.width <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0.05, cfg.imageOpacity));
      if (cfg.imageMode === "background") {
        const ratio = Math.max(W / bg.width, H / bg.height);
        const iw = bg.width * ratio;
        const ih = bg.height * ratio;
        ctx.drawImage(bg, W * cfg.imageX - iw / 2, H * cfg.imageY - ih / 2, iw, ih);
      } else {
        const iw = W * Math.min(1, Math.max(0.05, cfg.imageSize));
        const ih = (bg.height / bg.width) * iw;
        ctx.drawImage(bg, W * cfg.imageX - iw / 2, H * cfg.imageY - ih / 2, iw, ih);
      }
      ctx.restore();
    };

    if (cfg.imageMode === "background") drawUploadedImage();

    const img = imgRef.current;
    if (img && img.width > 0) {
      const d = W * Math.min(1, Math.max(0.05, cfg.photoSize));
      const cx = W * cfg.photoX;
      const cy = H * cfg.photoY;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const ratio = Math.max(d / img.width, d / img.height);
      const iw = img.width * ratio;
      const ih = img.height * ratio;
      ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
      ctx.restore();
    }

    const size = cfg.textSize;
    const tx = W * cfg.textX;
    const ty = H * cfg.textY;
    ctx.textAlign = cfg.align;
    ctx.textBaseline = "alphabetic";

    const nameText = cfg.name.trim() || "Nome";
    ctx.font = `800 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = cfg.nameColor;
    ctx.fillText(nameText, tx, ty);

    if (cfg.verified) {
      const nw = ctx.measureText(nameText).width;
      const r = size * 0.32;
      const bx =
        cfg.align === "center"
          ? tx + nw / 2 + r * 1.4
          : cfg.align === "right"
            ? tx + r * 1.4
            : tx + nw + r * 1.4;
      const by = ty - size * 0.3;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = "#1d9bf0";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = r * 0.28;
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.45, by);
      ctx.lineTo(bx - r * 0.1, by + r * 0.38);
      ctx.lineTo(bx + r * 0.5, by - r * 0.38);
      ctx.stroke();
    }

    const handleText = cfg.handle.trim() || "@usuario";
    ctx.font = `600 ${size * 0.68}px Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = cfg.handleColor;
    ctx.fillText(handleText, tx, ty + size * 0.95);

    if (cfg.imageMode === "watermark") drawUploadedImage();
  }, [cfg]);


  useEffect(() => {
    draw();
  }, [draw]);

  const pointFromEvent = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  const pickTarget = (x: number, y: number): "photo" | "text" | "image" => {
    if (bgImgRef.current && cfg.imageMode === "watermark") {
      const bg = bgImgRef.current;
      const halfW = Math.min(1, Math.max(0.05, cfg.imageSize)) / 2;
      const halfH = (halfW * W * (bg.height / bg.width)) / H;
      if (Math.abs(x - cfg.imageX) <= halfW && Math.abs(y - cfg.imageY) <= halfH) return "image";
    }
    if (imgRef.current) {
      const r = cfg.photoSize / 2;
      const dx = x - cfg.photoX;
      const dy = ((y - cfg.photoY) * H) / W;
      if (Math.sqrt(dx * dx + dy * dy) <= r) return "photo";
    }
    return "text";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = pointFromEvent(e.clientX, e.clientY);
    if (!p) return;
    setHint(false);
    dragRef.current = pickTarget(p.x, p.y);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    movePoint(p.x, p.y);
  };

  const movePoint = (x: number, y: number) => {
    if (dragRef.current === "photo") patch({ photoX: x, photoY: y });
    else if (dragRef.current === "image") patch({ imageX: x, imageY: y });
    else if (dragRef.current === "text") patch({ textX: x, textY: y });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const p = pointFromEvent(e.clientX, e.clientY);
    if (p) movePoint(p.x, p.y);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const p = pointFromEvent(e.clientX, e.clientY);
    if (!p) return;
    setHint(false);
    const dir = e.deltaY > 0 ? -1 : 1;
    const target = pickTarget(p.x, p.y);
    if (target === "photo") {
      patch({ photoSize: Math.min(1, Math.max(0.05, cfg.photoSize + dir * 0.02)) });
    } else if (target === "image") {
      patch({ imageSize: Math.min(1, Math.max(0.05, cfg.imageSize + dir * 0.02)) });
    } else {
      patch({ textSize: Math.min(200, Math.max(20, cfg.textSize + dir * 4)) });
    }

  };

  const renderDataUrl = () => {
    draw();
    return canvasRef.current?.toDataURL("image/png") ?? null;
  };

  const persist = async (slot: number) => {
    const dataUrl = renderDataUrl();
    if (!dataUrl) return;
    const label =
      presetName.trim() ||
      presets.find((p) => p.slot === slot)?.name ||
      cfg.name.trim() ||
      `Perfil ${slot}`;
    try {
      setPresets(
        await saveOverlay({ slot, name: label, dataUrl, config: cfg, updatedAt: Date.now() }),
      );
    } catch {
      toast.error(t("We could not save the profile to your account."));
      return;
    }
    setEditingSlot(slot);
    setPresetName(label);
    toast.success(`${t("Saved as")} “${label}”.`);
  };

  const rename = async (preset: OverlayPreset, name: string) => {
    setPresets((prev) => prev.map((p) => (p.slot === preset.slot ? { ...p, name } : p)));
    try {
      await saveOverlay({ ...preset, name });
    } catch {
      toast.error(t("We could not rename the profile."));
    }
  };

  const loadPreset = (preset: OverlayPreset) => {
    setCfg({ ...defaultOverlayConfig(), ...preset.config });
    setEditingSlot(preset.slot);
    setPresetName(preset.name);
    toast.success(`“${preset.name}” ${t("loaded")}.`);
  };


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

  const alignButtons: { id: TextAlign; icon: typeof AlignLeft }[] = [
    { id: "left", icon: AlignLeft },
    { id: "center", icon: AlignCenter },
    { id: "right", icon: AlignRight },
  ];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div>
        <h1 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <Sparkles className="size-5 text-primary" /> {t("Overlay creator")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Customise and save up to {n} presets. Drag to move and scroll to resize.").replace("{n}", String(OVERLAY_SLOTS))}
        </p>
        </div>
        <div className="flex items-center gap-2"><LanguageToggle /></div>
      </header>

      <div className="scrollbar-hidden grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Elementos */}
        <section className="scrollbar-hidden space-y-4 rounded-xl border border-border bg-card p-4 lg:h-full lg:overflow-y-auto lg:overscroll-contain">
          <div>
            <p className="text-sm font-bold">{t("Elements")}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("Upload a photo and set the texts.")}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold">{t("Profile photo")}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="size-14 overflow-hidden rounded-full border border-border bg-muted">
                {cfg.photo && (
                  <img src={cfg.photo} alt="" className="size-full object-cover" />
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <UploadCloud className="mr-1.5 size-4" /> {cfg.photo ? t("Replace") : t("Upload")}
              </Button>
              {cfg.photo && (
                <Button variant="ghost" size="sm" onClick={() => patch({ photo: null })}>
                  <Trash2 className="size-4" />
                </Button>
              )}
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
                reader.onload = () => patch({ photo: String(reader.result) });
                reader.readAsDataURL(file);
              }}
            />
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("Photo size")}</span>
                <span className="font-bold">{Math.round(cfg.photoSize * 100)}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={Math.round(cfg.photoSize * 100)}
                onChange={(e) => patch({ photoSize: Number(e.target.value) / 100 })}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border/60 pt-3">
            <p className="text-xs font-semibold">{t("Image (background or watermark)")}</p>
            <div className="flex items-center gap-3">
              <div className="size-14 overflow-hidden rounded-md border border-border bg-muted">
                {cfg.image && <img src={cfg.image} alt="" className="size-full object-cover" />}
              </div>
              <Button variant="secondary" size="sm" onClick={() => bgFileRef.current?.click()}>
                <UploadCloud className="mr-1.5 size-4" /> {cfg.image ? t("Replace") : t("Upload")}
              </Button>
              {cfg.image && (
                <Button variant="ghost" size="sm" onClick={() => patch({ image: null })}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => patch({ image: String(reader.result) });
                reader.readAsDataURL(file);
              }}
            />

            {cfg.image && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(["background", "watermark"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => patch({ imageMode: mode })}
                      className={`rounded-md border py-2 text-[11px] font-semibold transition-colors ${
                        cfg.imageMode === mode
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "background" ? t("Background") : t("Watermark")}
                    </button>
                  ))}
                </div>

                {cfg.imageMode === "watermark" && (
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("Image size")}</span>
                      <span className="font-bold">{Math.round(cfg.imageSize * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={1}
                      value={Math.round(cfg.imageSize * 100)}
                      onChange={(e) => patch({ imageSize: Number(e.target.value) / 100 })}
                      className="mt-2 w-full accent-primary"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("Opacity")}</span>
                    <span className="font-bold">{Math.round(cfg.imageOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={1}
                    value={Math.round(cfg.imageOpacity * 100)}
                    onChange={(e) => patch({ imageOpacity: Number(e.target.value) / 100 })}
                    className="mt-2 w-full accent-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("Horizontal")}</span>
                      <span className="font-bold">{Math.round(cfg.imageX * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(cfg.imageX * 100)}
                      onChange={(e) => patch({ imageX: Number(e.target.value) / 100 })}
                      className="mt-2 w-full accent-primary"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("Vertical")}</span>
                      <span className="font-bold">{Math.round(cfg.imageY * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(cfg.imageY * 100)}
                      onChange={(e) => patch({ imageY: Number(e.target.value) / 100 })}
                      className="mt-2 w-full accent-primary"
                    />
                  </div>
                </div>
              </>
            )}
          </div>



          <div>
            <p className="text-xs font-semibold">{t("Name")}</p>
            <Input
              className="mt-1.5"
              placeholder={t("e.g. Movies I love")}
              value={cfg.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div>
            <p className="text-xs font-semibold">{t("Username (@)")}</p>
            <Input
              className="mt-1.5"
              placeholder="e.g. moviesilove._"
              value={cfg.handle}
              onChange={(e) => patch({ handle: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("Name colour"), value: cfg.nameColor, set: (v: string) => patch({ nameColor: v }) },
              { label: t("@ colour"), value: cfg.handleColor, set: (v: string) => patch({ handleColor: v }) },
              { label: t("Background colour"), value: cfg.bgColor, set: (v: string) => patch({ bgColor: v }) },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-xs font-semibold">{row.label}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    type="color"
                    value={row.value}
                    onChange={(e) => row.set(e.target.value)}
                    className="h-9 w-11 shrink-0 p-1"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => row.set(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={cfg.bgTransparent}
              onChange={(e) => patch({ bgTransparent: e.target.checked })}
              className="size-4 accent-primary"
            />
            {t("Transparent background")}
          </label>

          <div>
            <p className="text-xs font-semibold">{t("Text alignment")}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {alignButtons.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => patch({ align: id })}
                  className={`flex items-center justify-center rounded-md border py-2 transition-colors ${
                    cfg.align === id
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={`${t("Align")} ${id}`}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={cfg.verified}
              onChange={(e) => patch({ verified: e.target.checked })}
              className="size-4 accent-primary"
            />
            {t("Show the blue badge next to the name")}
          </label>

          <div className="space-y-3 border-t border-border/60 pt-3">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("Text size")}</span>
                <span className="font-bold">{cfg.textSize}px</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={2}
                value={cfg.textSize}
                onChange={(e) => patch({ textSize: Number(e.target.value) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="h-fit rounded-xl border border-border bg-card p-4 lg:sticky lg:top-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{t("Preview")}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("Drag to move • Scroll to resize")}
            </p>
          </div>
          <div className="mt-4 flex justify-center">
            <div
              ref={stageRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => (dragRef.current = null)}
              onPointerCancel={() => (dragRef.current = null)}
              onWheel={onWheel}
              className="relative w-full max-w-[300px] cursor-move touch-none overflow-hidden rounded-lg border border-dashed border-border"
              style={{ aspectRatio: `${W} / ${H}` }}
            >
              <canvas ref={canvasRef} width={W} height={H} className="size-full select-none" />
              {hint && (
                <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-foreground/70 px-3 py-2 text-center text-[11px] font-medium text-background">
                  {t("Drag to move • Scroll to resize")}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={download}>
              <Download className="mr-1.5 size-4" /> {t("Download .png")}
            </Button>
            <Button size="sm" onClick={() => void persist(editingSlot ?? 1)}>
              <Save className="mr-1.5 size-4" /> {t("Save to my account")}
            </Button>
          </div>
        </section>

        {/* Pré-definições */}
        <section className="scrollbar-hidden rounded-xl border border-border bg-card p-4 lg:h-full lg:overflow-y-auto lg:overscroll-contain">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold">{t("Presets")}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {editingSlot
                  ? `${t("Editing")} ${presets.find((p) => p.slot === editingSlot)?.name || `${t("Profile")} ${editingSlot}`}`
                  : t("No profile selected")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCfg(defaultOverlayConfig());
                setEditingSlot(null);
                setPresetName("");
              }}
            >
              {t("New")}
            </Button>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold">{t("Profile name")}</p>
            <Input
              className="mt-1.5"
              placeholder={t("e.g. Cinema profile")}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("This name shows up in the saved overlays list inside the editor.")}
            </p>
          </div>

          <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {Array.from({ length: OVERLAY_SLOTS }, (_, i) => i + 1).map((slot) => {
              const preset = presets.find((p) => p.slot === slot);
              const active = editingSlot === slot;
              return (
                <div
                  key={slot}
                  className={`rounded-lg border p-3 ${
                    active ? "border-primary bg-primary/10" : "border-border bg-background/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {preset ? (
                      <Input
                        value={preset.name}
                        onChange={(e) => void rename(preset, e.target.value)}
                        className="h-7 text-xs font-bold"
                        aria-label={`${t("Rename profile")} ${slot}`}
                      />
                    ) : (
                      <p className="truncate text-xs font-bold text-muted-foreground">
                        Vazio · slot {slot}
                      </p>
                    )}
                    {preset && (
                      <button
                        type="button"
                        onClick={() => {
                          void deleteOverlay(slot).then(setPresets);
                          if (editingSlot === slot) setEditingSlot(null);
                        }}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`${t("Delete profile")} ${slot}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {preset && (
                      <img
                        src={preset.dataUrl}
                        alt=""
                        className="h-14 w-8 rounded border border-border object-cover"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => void persist(slot)}
                      >
                        <Save className="mr-1.5 size-3.5" />
                        {preset ? "Salvar" : "Salvar aqui"}
                      </Button>
                      {preset && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => loadPreset(preset)}
                        >
                          <Check className="mr-1.5 size-3.5" /> Carregar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
