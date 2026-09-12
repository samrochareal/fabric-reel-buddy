import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Link2, Loader2, Monitor, Plus, RotateCcw, Save, Smartphone, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LandingView, type LandingDevice, type LandingSelection } from "@/components/landing/landing-view";
import { fetchBranding, useBranding, useRefreshBranding } from "@/lib/branding";
import {
  defaultLandingContent,
  normalizeLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/landing-content";
import { useIsAdmin } from "@/lib/admin";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/landing-editor")({
  head: () => ({
    meta: [
      { title: "Editor da Landing Page" },
      { name: "description", content: "Edite textos, cores, imagens e a ordem das seções da landing page." },
      { property: "og:title", content: "Editor da Landing Page" },
      { property: "og:description", content: "Edição visual da landing page: clique no texto, arraste blocos e salve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingEditorPage,
});

function LandingEditorPage() {
  const t = useT();
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();
  const branding = useBranding();
  const refreshBranding = useRefreshBranding();

  const [device, setDevice] = useState<LandingDevice>("desktop");
  const [content, setContent] = useState<LandingContent>(defaultLandingContent);
  const [saved, setSaved] = useState<LandingContent>(defaultLandingContent);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<LandingSelection | null>(null);

  const dirty = JSON.stringify(content) !== JSON.stringify(saved);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error(t("This area is for the master user only."));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, loading, navigate, t]);

  useEffect(() => {
    void fetchBranding().then((b) => {
      const normalized = normalizeLandingContent(b.landing_content);
      setContent(normalized);
      setSaved(normalized);
    });
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveLandingContent(content);
      setSaved(content);
      refreshBranding();
      toast.success("Landing Page atualizada.");
    } catch {
      toast.error("Não foi possível salvar a Landing Page.");
    } finally {
      setSaving(false);
    }
  };

  const patchSelectionStyle = (values: Record<string, string | number | undefined>) => {
    if (!selection) return;
    setContent((current) => ({
      ...current,
      styles: { ...current.styles, [selection.key]: { ...current.styles[selection.key], ...values } },
    }));
  };

  const addElement = (kind: string) => {
    setContent((current) => {
      if (kind === "feature") return { ...current, features: { ...current.features, items: [...current.features.items, { title: "Novo recurso", text: "Descrição do recurso." }] } };
      if (kind === "benefit") return { ...current, benefits: { ...current.benefits, items: [...current.benefits.items, "Novo benefício"] } };
      if (kind === "stat") return { ...current, benefits: { ...current.benefits, stats: [...current.benefits.stats, { title: "0", text: "novo número" }] } };
      if (kind === "step") return { ...current, steps: { ...current.steps, items: [...current.steps.items, { title: "Novo passo", text: "Descrição do passo." }] } };
      if (kind === "audience") return { ...current, audience: { ...current.audience, items: [...current.audience.items, { title: "Novo público", text: "Descrição." }] } };
      if (kind === "faq") return { ...current, faq: { ...current.faq, items: [...current.faq.items, { q: "Nova pergunta?", a: "Resposta." }] } };
      if (kind === "plan") return { ...current, plans: { ...current.plans, items: [...current.plans.items, { id: `plan_${Date.now()}`, priceId: "", name: "Novo plano", price: "R$ 0", period: "pagamento único", amountCents: 0, credits: 0, description: "Descrição do plano", features: ["Benefício"], active: false, highlight: false, free: false, cta: "Comprar créditos" }] } };
      return { ...current, hero: { ...current.hero, badges: [...current.hero.badges, "Novo selo"] } };

    });
  };

  const chooseImage = (file: File | undefined) => {
    if (!file || !selection?.onChange) return;
    if (file.size > 400_000) {
      toast.error("Escolha uma imagem de até 400KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      selection.onChange?.(value);
      setSelection((current) => current ? { ...current, value } : current);
    };
    reader.readAsDataURL(file);
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              if (dirty && !window.confirm("Você tem alterações não salvas. Sair mesmo assim?")) e.preventDefault();
            }}
          >
            <ArrowLeft className="size-3.5" /> {t("Master panel")}
          </Link>
          <span className="font-display text-base font-bold tracking-tight">Landing Page</span>

          <div className="flex rounded-lg border border-border p-0.5">
            {([
              ["desktop", "Desktop", Monitor],
              ["mobile", "Celular", Smartphone],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDevice(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors",
                  device === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {([
              ["primary", "Principal"],
              ["background", "Fundo"],
              ["accent", "Destaque"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-[11px] font-semibold" title={label}>
                <input
                  type="color"
                  className="size-7 cursor-pointer rounded border-0 bg-transparent"
                  value={content.colors[key]}
                  onChange={(e) => setContent((c) => ({ ...c, colors: { ...c.colors, [key]: e.target.value } }))}
                />
                <span className="hidden sm:inline">{label}</span>
              </label>
            ))}
            <Button variant="outline" size="sm" disabled={!dirty} onClick={() => setContent(saved)}>
              <RotateCcw className="size-3.5" /> Desfazer
            </Button>
            <Button size="sm" onClick={() => void onSave()} disabled={saving || !dirty}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Salvar
            </Button>
          </div>
        </div>
        <p className="border-t border-border/60 px-4 py-1.5 text-[11px] text-muted-foreground">
          Clique em qualquer texto para editar. Arraste os blocos e as seções para reordenar. Campo em branco não aparece
          na landing page.
          {dirty && <span className="ml-2 font-bold text-primary">Alterações não salvas</span>}
        </p>
      </header>

      <div className="mx-auto grid w-full max-w-[1720px] gap-4 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className={cn(
            "mx-auto w-full overflow-hidden rounded-2xl border border-border bg-background shadow-xl",
            device === "mobile" ? "max-w-[430px]" : "max-w-[1280px]",
          )}
        >
          <LandingView
            content={content}
            systemName={branding.system_name}
            brandImage={branding.logo_url || branding.icon_url}
            device={device}
            edit={{ update: (fn) => setContent((c) => fn(c)), selectedKey: selection?.key, onSelect: setSelection }}
          />
        </div>
        <aside className="h-fit border border-border bg-background xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Painel de edição</p>
              <p className="mt-0.5 text-sm font-bold">{selection?.label ?? "Estrutura da página"}</p>
            </div>
            {selection && <Button size="icon" variant="ghost" onClick={() => setSelection(null)} aria-label="Fechar seleção"><X className="size-4" /></Button>}
          </div>

          {selection ? (
            <div className="space-y-5 p-4">
              {selection.onChange && selection.kind !== "image" && (
                <label className="block text-xs font-bold">Conteúdo
                  <textarea className="mt-2 min-h-24 w-full resize-y border border-border bg-background p-3 text-sm font-normal outline-none focus:border-primary" value={selection.value ?? ""} onChange={(event) => { selection.onChange?.(event.target.value); setSelection({ ...selection, value: event.target.value }); }} />
                </label>
              )}
              {selection.kind === "image" && (
                <div className="space-y-3">
                  {selection.value && <img src={selection.value} alt="" className="aspect-video w-full border border-border object-cover" />}
                  <label className="block cursor-pointer border border-dashed border-primary p-4 text-center text-xs font-bold">Escolher imagem<input type="file" accept="image/*" className="hidden" onChange={(event) => chooseImage(event.target.files?.[0])} /></label>
                  {selection.value && <Button variant="ghost" className="w-full" onClick={() => { selection.onChange?.(""); setSelection({ ...selection, value: "" }); }}>Remover imagem</Button>}
                </div>
              )}
              {selection.kind !== "section" && selection.kind !== "image" && <>
                <label className="block text-xs font-bold">Link clicável
                  <div className="mt-2 flex items-center border border-border px-2 focus-within:border-primary"><Link2 className="size-4 text-muted-foreground" /><input className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="/login ou https://..." value={content.links[selection.key] ?? ""} onChange={(event) => setContent((current) => ({ ...current, links: { ...current.links, [selection.key]: event.target.value } }))} /></div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold">Cor do texto<input type="color" className="mt-2 h-9 w-full" value={content.styles[selection.key]?.color ?? "#ffffff"} onChange={(event) => patchSelectionStyle({ color: event.target.value })} /></label>
                  <label className="text-xs font-bold">Cor do fundo<input type="color" className="mt-2 h-9 w-full" value={content.styles[selection.key]?.backgroundColor ?? content.colors.background} onChange={(event) => patchSelectionStyle({ backgroundColor: event.target.value })} /></label>
                </div>
                <label className="block text-xs font-bold">Tamanho: {content.styles[selection.key]?.fontSize ?? 16}px<input type="range" min="10" max="96" className="mt-2 w-full accent-primary" value={content.styles[selection.key]?.fontSize ?? 16} onChange={(event) => patchSelectionStyle({ fontSize: Number(event.target.value) })} /></label>
                <label className="block text-xs font-bold">Largura: {content.styles[selection.key]?.width ?? 100}%<input type="range" min="20" max="100" className="mt-2 w-full accent-primary" value={content.styles[selection.key]?.width ?? 100} onChange={(event) => patchSelectionStyle({ width: Number(event.target.value) })} /></label>
                <label className="block text-xs font-bold">Posição horizontal: {content.styles[selection.key]?.x ?? 0}px<input type="range" min="-200" max="200" className="mt-2 w-full accent-primary" value={content.styles[selection.key]?.x ?? 0} onChange={(event) => patchSelectionStyle({ x: Number(event.target.value) })} /></label>
                <label className="block text-xs font-bold">Posição vertical: {content.styles[selection.key]?.y ?? 0}px<input type="range" min="-200" max="200" className="mt-2 w-full accent-primary" value={content.styles[selection.key]?.y ?? 0} onChange={(event) => patchSelectionStyle({ y: Number(event.target.value) })} /></label>
                <div>
                  <p className="mb-2 text-xs font-bold">Alinhamento</p>
                  <div className="grid grid-cols-3 gap-1">{(["left", "center", "right"] as const).map((align) => <Button key={align} size="sm" variant={content.styles[selection.key]?.textAlign === align ? "default" : "outline"} onClick={() => patchSelectionStyle({ textAlign: align })}>{align === "left" ? "Esq." : align === "center" ? "Centro" : "Dir."}</Button>)}</div>
                </div>
              </>}
              {selection.kind === "plan" && selection.planIndex !== undefined && (() => {
                const index = selection.planIndex;
                const plan = content.plans.items[index];
                if (!plan) return null;
                const setPlan = (values: Partial<typeof plan>) =>
                  setContent((current) => ({ ...current, plans: { ...current.plans, items: current.plans.items.map((p, j) => (j === index ? { ...p, ...values } : p)) } }));
                return (
                  <div className="space-y-3 border border-border p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Plano</p>
                    <Button variant={plan.active ? "default" : "outline"} size="sm" className="w-full" onClick={() => setPlan({ active: !plan.active })}>
                      {plan.active ? "Plano ativo (clique para desativar)" : "Plano desativado (clique para ativar)"}
                    </Button>
                    <Button variant={plan.highlight ? "default" : "outline"} size="sm" className="w-full" onClick={() => setPlan({ highlight: !plan.highlight })}>
                      {plan.highlight ? "Em destaque" : "Sem destaque"}
                    </Button>
                    <Button variant={plan.free ? "default" : "outline"} size="sm" className="w-full" onClick={() => setPlan({ free: !plan.free })}>
                      {plan.free ? "Plano gratuito" : "Plano pago"}
                    </Button>
                    <label className="block text-xs font-bold">Créditos entregues
                      <input type="number" min="0" className="mt-2 h-9 w-full border border-border bg-background px-2 text-sm font-normal outline-none focus:border-primary" value={plan.credits} onChange={(event) => setPlan({ credits: Number(event.target.value) })} />
                    </label>
                    <label className="block text-xs font-bold">Valor cobrado (R$)
                      <input type="number" min="0" step="0.01" className="mt-2 h-9 w-full border border-border bg-background px-2 text-sm font-normal outline-none focus:border-primary" value={(plan.amountCents / 100).toFixed(2)} onChange={(event) => setPlan({ amountCents: Math.max(0, Math.round(Number(event.target.value) * 100)) })} />
                    </label>
                    <label className="block text-xs font-bold">Novo benefício
                      <input className="mt-2 h-9 w-full border border-border bg-background px-2 text-sm font-normal outline-none focus:border-primary" placeholder="Escreva e pressione Enter" onKeyDown={(event) => { if (event.key !== "Enter") return; const value = event.currentTarget.value.trim(); if (!value) return; setPlan({ features: [...plan.features, value] }); event.currentTarget.value = ""; }} />
                    </label>
                  </div>
                );
              })()}
              <Button variant="outline" className="w-full" onClick={() => { selection.onToggleHidden(); setSelection({ ...selection, hidden: !selection.hidden }); }}>{selection.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}{selection.hidden ? "Mostrar elemento" : "Ocultar elemento"}</Button>
              {selection.onDelete && (
                <Button variant="destructive" className="w-full" onClick={() => { if (!window.confirm("Excluir este elemento da landing page?")) return; selection.onDelete?.(); setSelection(null); }}>
                  <Trash2 className="size-4" /> Excluir elemento
                </Button>
              )}
              {selection.kind !== "section" && selection.kind !== "image" && <Button variant="ghost" className="w-full" onClick={() => setContent((current) => { const styles = { ...current.styles }; const links = { ...current.links }; delete styles[selection.key]; delete links[selection.key]; return { ...current, styles, links }; })}>Restaurar aparência</Button>}

            </div>
          ) : (
            <div className="p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">Clique em qualquer texto, botão, imagem, plano ou seção na página para editar, ocultar ou excluir. Arraste cartões e seções para mudar a ordem.</p>
              <p className="mb-2 mt-5 text-xs font-bold">Adicionar elemento</p>
              <div className="grid grid-cols-2 gap-2">
                {[["feature", "Recurso"], ["benefit", "Benefício"], ["stat", "Número"], ["step", "Passo"], ["audience", "Público"], ["faq", "Pergunta"], ["badge", "Selo"], ["plan", "Plano"]].map(([kind, label]) => kind && label ? <Button key={kind} variant="outline" size="sm" onClick={() => addElement(kind)}><Plus className="size-3.5" />{label}</Button> : null)}
              </div>
              {(content.removedSections ?? []).length > 0 && (
                <>
                  <p className="mb-2 mt-6 text-xs font-bold">Seções excluídas</p>
                  <div className="space-y-1">
                    {(content.removedSections ?? []).map((section) => (
                      <Button key={section} variant="outline" size="sm" className="w-full justify-start" onClick={() => setContent((current) => ({ ...current, sections: [...current.sections, section], removedSections: (current.removedSections ?? []).filter((s) => s !== section) }))}>
                        <Plus className="size-3.5" /> Restaurar {section}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              <p className="mb-2 mt-6 text-xs font-bold">Ordem das seções</p>
              <div className="space-y-1">{content.sections.map((section, index) => <div key={section} draggable onDragStart={(event) => event.dataTransfer.setData("text/section-index", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/section-index")); if (!Number.isFinite(from) || from === index) return; setContent((current) => { const sections = [...current.sections]; const moved = sections[from]; if (!moved) return current; sections.splice(from, 1); sections.splice(index, 0, moved); return { ...current, sections }; }); }} className="flex cursor-grab items-center justify-between border border-border px-3 py-2 text-xs font-bold"><span className={content.hidden?.[`section.${section}`] ? "opacity-40 line-through" : ""}>{section}</span><div className="flex"><Button size="icon" variant="ghost" title={content.hidden?.[`section.${section}`] ? "Mostrar seção" : "Ocultar seção"} onClick={() => setContent((current) => ({ ...current, hidden: { ...current.hidden, [`section.${section}`]: !current.hidden?.[`section.${section}`] } }))}>{content.hidden?.[`section.${section}`] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button><Button size="icon" variant="ghost" disabled={index === 0} onClick={() => setContent((current) => { if (index === 0) return current; const sections = [...current.sections]; const currentSection = sections[index]; const previousSection = sections[index - 1]; if (!currentSection || !previousSection) return current; sections[index - 1] = currentSection; sections[index] = previousSection; return { ...current, sections }; })}><ArrowUp className="size-3.5" /></Button><Button size="icon" variant="ghost" disabled={index === content.sections.length - 1} onClick={() => setContent((current) => { const sections = [...current.sections]; const currentSection = sections[index]; const nextSection = sections[index + 1]; if (!currentSection || !nextSection) return current; sections[index] = nextSection; sections[index + 1] = currentSection; return { ...current, sections }; })}><ArrowDown className="size-3.5" /></Button></div></div>)}</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
