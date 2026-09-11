import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Crop,
  Frame,
  Gauge,
  GripVertical,
  Images,
  Layers,
  LogIn,
  Plus,
  Rocket,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type as TypeIcon,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shown, withSystemName, type LandingContent, type LandingSection } from "@/lib/landing-content";

export type LandingDevice = "desktop" | "mobile";
export type LandingEdit = { update: (fn: (c: LandingContent) => LandingContent) => void };

/* ------------------------------------------------------------------ */
/* click-to-edit text                                                  */
/* ------------------------------------------------------------------ */

function EditableText({
  value,
  onChange,
  as = "span",
  className,
  placeholder = "Texto",
}: {
  value: string;
  onChange?: ((next: string) => void) | undefined;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "li" | "div";
  className?: string | undefined;
  placeholder?: string | undefined;
}) {
  const Tag = as as React.ElementType;

  if (!onChange) {
    if (!shown(value)) return null;
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      data-editable=""
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onBlur={(e: React.FocusEvent<HTMLElement>) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "cursor-text rounded outline-none ring-1 ring-dashed ring-primary/40 transition hover:ring-primary focus:ring-2 focus:ring-primary",
        className,
      )}
    >
      {value}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* drag-and-drop list                                                  */
/* ------------------------------------------------------------------ */

function EditList<T>({
  editing,
  items,
  keep,
  onChange,
  blank,
  render,
  className,
  addLabel = "Adicionar item",
}: {
  editing: boolean;
  items: T[];
  keep: (item: T) => boolean;
  onChange?: ((next: T[]) => void) | undefined;
  blank?: (() => T) | undefined;
  render: (item: T, index: number, setItem: (next: T) => void) => React.ReactNode;
  className?: string | undefined;
  addLabel?: string | undefined;
}) {
  const dragFrom = useRef<number | null>(null);
  const noop = () => {};

  if (!editing || !onChange) {
    const visible = items.filter(keep);
    if (!visible.length) return null;
    return <div className={className}>{visible.map((item, i) => render(item, i, noop))}</div>;
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved as T);
    onChange(next);
  };

  return (
    <>
      <div className={className}>
        {items.map((item, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => {
              dragFrom.current = i;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current !== null) move(dragFrom.current, i);
              dragFrom.current = null;
            }}
            className="relative rounded-xl ring-1 ring-dashed ring-primary/25"
          >
            <div className="absolute right-1 top-1 z-10 flex items-center gap-0.5 rounded-md bg-background/90 p-0.5 shadow">
              <span className="cursor-grab p-1 text-muted-foreground" title="Arraste para reordenar">
                <GripVertical className="size-3.5" />
              </span>
              <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => move(i, i - 1)} title="Subir">
                <ChevronUp className="size-3.5" />
              </button>
              <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => move(i, i + 1)} title="Descer">
                <ChevronDown className="size-3.5" />
              </button>
              <button
                type="button"
                className="p-1 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                title="Excluir"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {render(item, i, (next) => onChange(items.map((it, j) => (j === i ? next : it))))}
          </div>
        ))}
      </div>
      {blank && (
        <button
          type="button"
          onClick={() => onChange([...items, blank()])}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10"
        >
          <Plus className="size-3.5" /> {addLabel}
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* image slot                                                          */
/* ------------------------------------------------------------------ */

function ImageSlot({
  value,
  onChange,
  className,
  label,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  className?: string | undefined;
  label: string;
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-primary/50 bg-background/80 p-3 text-xs", className)}>
      <p className="font-bold">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        {value && <img src={value} alt="" className="size-14 rounded-md object-cover" />}
        <input
          type="file"
          accept="image/*"
          className="text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 400_000) {
              alert("Escolha uma imagem de até 400KB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => onChange(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
        {value && (
          <button type="button" className="font-bold text-muted-foreground hover:text-destructive" onClick={() => onChange(null)}>
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* section shell (reorderable in edit mode)                            */
/* ------------------------------------------------------------------ */

function SectionShell({
  edit,
  order,
  section,
  label,
  onMove,
  children,
}: {
  edit?: LandingEdit | undefined;
  order: LandingSection[];
  section: LandingSection;
  label: string;
  onMove: (section: LandingSection, delta: number) => void;
  children: React.ReactNode;
}) {
  if (!edit) return <>{children}</>;
  const index = order.indexOf(section);
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/landing-section", section)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const from = e.dataTransfer.getData("text/landing-section") as LandingSection;
        if (!from || from === section) return;
        onMove(from, order.indexOf(section) - order.indexOf(from));
      }}
      className="relative border-y-2 border-dashed border-transparent hover:border-primary/40"
    >
      <div className="pointer-events-auto absolute left-2 top-2 z-30 flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-1 text-[11px] font-bold shadow">
        <GripVertical className="size-3.5 cursor-grab text-muted-foreground" />
        {label}
        <button type="button" className="px-1 text-muted-foreground hover:text-foreground" onClick={() => onMove(section, -1)} title="Subir seção">
          <ChevronUp className="size-3.5" />
        </button>
        <button type="button" className="px-1 text-muted-foreground hover:text-foreground" onClick={() => onMove(section, 1)} title="Descer seção">
          <ChevronDown className="size-3.5" />
        </button>
        <span className="text-muted-foreground">{index + 1}</span>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* landing page                                                        */
/* ------------------------------------------------------------------ */

const SECTION_LABELS: Record<LandingSection, string> = {
  hero: "Abertura",
  features: "Recursos",
  benefits: "Benefícios",
  steps: "Como funciona",
  audience: "Para quem é",
  faq: "Perguntas",
  cta: "Chamada final",
};

export function LandingView({
  content,
  systemName,
  brandImage,
  device,
  edit,
}: {
  content: LandingContent;
  systemName: string;
  brandImage: string | null;
  device: LandingDevice;
  edit?: LandingEdit | undefined;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const editing = Boolean(edit);
  const mobile = device === "mobile";

  const featureIcons = [Layers, Crop, Frame, Images, TypeIcon, Wand2, Zap, Gauge, ShieldCheck];

  const pageStyle = {
    "--primary": content.colors.primary,
    "--background": content.colors.background,
    "--accent": content.colors.accent,
  } as React.CSSProperties;

  // group-level setters -------------------------------------------------
  type Group = "nav" | "hero" | "features" | "benefits" | "steps" | "audience" | "faq" | "cta" | "footer" | "mobile";
  const patch = (group: Group, values: Record<string, unknown>) =>
    edit?.update((c) => ({ ...c, [group]: { ...(c[group] as Record<string, unknown>), ...values } }) as LandingContent);
  const on = (group: Group, field: string) =>
    edit ? (v: string) => patch(group, { [field]: v }) : undefined;
  const list = <T,>(group: Group, field: string) =>
    edit ? (next: T[]) => patch(group, { [field]: next }) : undefined;

  const moveSection = (section: LandingSection, delta: number) =>
    edit?.update((c) => {
      const order = [...c.sections];
      const from = order.indexOf(section);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= order.length) return c;
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved as LandingSection);
      return { ...c, sections: order };
    });

  const heroText = mobile && (shown(content.mobile.heroText) || editing) ? content.mobile.heroText : content.hero.text;
  const heroTextField = mobile ? on("mobile", "heroText") : on("hero", "text");
  const ctaText = mobile && (shown(content.mobile.ctaText) || editing) ? content.mobile.ctaText : content.cta.text;
  const ctaTextField = mobile ? on("mobile", "ctaText") : on("cta", "text");

  const heading = (
    group: Group,
    title: string,
    highlight: string,
    className: string,
  ) => (
    <h2 className={className}>
      <EditableText value={title} onChange={on(group, "title")} placeholder="Título" />{" "}
      <EditableText value={highlight} onChange={on(group, "highlight")} className="text-primary" placeholder="Destaque" />
    </h2>
  );

  const eyebrow = (group: Group, value: string) => (
    <EditableText
      as="p"
      value={value}
      onChange={on(group, "eyebrow")}
      className="text-xs font-bold uppercase tracking-[0.2em] text-primary"
      placeholder="Etiqueta"
    />
  );

  /* --------------------------- sections ------------------------------ */

  const sections: Record<LandingSection, React.ReactNode> = {
    hero: (
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
          aria-hidden
        />
        <div className={cn("relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16", !mobile && "md:py-24 lg:grid-cols-2")}>
          <div>
            {eyebrow("hero", content.hero.eyebrow)}
            <h1 className={cn("mt-4 font-display font-bold leading-[1.05] tracking-tight", mobile ? "text-3xl" : "text-4xl sm:text-5xl lg:text-6xl")}>
              <EditableText value={content.hero.title} onChange={on("hero", "title")} placeholder="Título" />{" "}
              <EditableText value={content.hero.highlight} onChange={on("hero", "highlight")} className="text-primary" placeholder="Destaque" />
            </h1>
            {(shown(heroText) || editing) && (
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
                <EditableText
                  value={editing ? heroText : withSystemName(heroText, systemName)}
                  onChange={heroTextField}
                  placeholder={mobile ? "Texto curto do celular" : "Texto da abertura"}
                />
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {(shown(content.hero.primaryCta) || editing) && (
                <LandingCta editing={editing}>
                  <Button size="lg" className="font-bold">
                    <EditableText value={content.hero.primaryCta} onChange={on("hero", "primaryCta")} placeholder="Botão" />
                    <ArrowRight className="size-4" />
                  </Button>
                </LandingCta>
              )}
              {(shown(content.hero.secondaryCta) || editing) && (
                <a href={editing ? undefined : "#como-funciona"}>
                  <Button size="lg" variant="outline" className="font-bold">
                    <EditableText value={content.hero.secondaryCta} onChange={on("hero", "secondaryCta")} placeholder="Botão" />
                  </Button>
                </a>
              )}
            </div>

            <EditList
              editing={editing}
              items={content.hero.badges}
              keep={shown}
              onChange={list<string>("hero", "badges")}
              blank={() => "Novo selo"}
              addLabel="Adicionar selo"
              className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground"
              render={(badge, i, setItem) => {
                const Icon = [Rocket, Zap, Sparkles][i % 3] ?? Sparkles;
                return (
                  <span key={i} className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-primary" />
                    <EditableText value={badge} onChange={editing ? setItem : undefined} placeholder="Selo" />
                  </span>
                );
              }}
            />
          </div>

          <div className="relative rounded-2xl border border-border bg-card p-3 shadow-2xl">
            {content.hero.image ? (
              <img src={content.hero.image} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            ) : (
              <EditorMock />
            )}
            {edit && (
              <ImageSlot
                className="mt-3"
                label="Imagem da abertura"
                value={content.hero.image}
                onChange={(image) => patch("hero", { image })}
              />
            )}
          </div>
        </div>
      </section>
    ),

    features: (
      <section id="recursos" className={cn("border-t border-border/60 bg-card/30 py-16", !mobile && "md:py-24")}>
        <div className="mx-auto max-w-6xl px-4">
          {eyebrow("features", content.features.eyebrow)}
          <div className={cn("mt-3 gap-8", !mobile && "md:flex md:items-end md:justify-between")}>
            {mobile ? (
              <h2 className="max-w-xl font-display text-2xl font-bold tracking-tight">
                <EditableText
                  value={shown(content.mobile.featuresTitle) || editing ? content.mobile.featuresTitle : content.features.title}
                  onChange={on("mobile", "featuresTitle")}
                  placeholder="Título curto do celular"
                />
              </h2>
            ) : (
              heading("features", content.features.title, content.features.highlight, "max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl")
            )}
            {!mobile && (
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground md:mt-0">
                <EditableText value={content.features.intro} onChange={on("features", "intro")} placeholder="Texto de apoio" />
              </p>
            )}
          </div>

          <EditList
            editing={editing}
            items={mobile && !editing ? content.features.items.slice(0, 4) : content.features.items}
            keep={(f) => shown(f.title) || shown(f.text)}
            onChange={list<{ title: string; text: string }>("features", "items")}
            blank={() => ({ title: "Novo recurso", text: "Descrição do recurso." })}
            addLabel="Adicionar recurso"
            className={cn("mt-10 grid gap-4", mobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3")}
            render={(f, i, setItem) => {
              const Icon = featureIcons[i % featureIcons.length] ?? Layers;
              return (
                <div key={i} className="group h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <EditableText as="h3" value={f.title} onChange={editing ? (title) => setItem({ ...f, title }) : undefined} className="mt-4 block text-base font-bold" placeholder="Título" />
                  <EditableText as="p" value={f.text} onChange={editing ? (text) => setItem({ ...f, text }) : undefined} className="mt-2 block text-sm leading-relaxed text-muted-foreground" placeholder="Descrição" />
                </div>
              );
            }}
          />
        </div>
      </section>
    ),

    benefits: (
      <section className="py-16 md:py-24">
        <div className={cn("mx-auto grid max-w-6xl items-center gap-12 px-4", !mobile && "lg:grid-cols-2")}>
          <div>
            {eyebrow("benefits", content.benefits.eyebrow)}
            {heading("benefits", content.benefits.title, content.benefits.highlight, "mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl")}
            <EditList
              editing={editing}
              items={content.benefits.items}
              keep={shown}
              onChange={list<string>("benefits", "items")}
              blank={() => "Novo benefício"}
              addLabel="Adicionar benefício"
              className="mt-7 space-y-3"
              render={(item, i, setItem) => (
                <div key={i} className="flex items-start gap-3 text-sm font-semibold">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                  <EditableText value={item} onChange={editing ? setItem : undefined} placeholder="Benefício" />
                </div>
              )}
            />
          </div>

          <EditList
            editing={editing}
            items={content.benefits.stats}
            keep={(s) => shown(s.title) || shown(s.text)}
            onChange={list<{ title: string; text: string }>("benefits", "stats")}
            blank={() => ({ title: "0", text: "novo número" })}
            addLabel="Adicionar número"
            className={cn("grid gap-4", !mobile && "sm:grid-cols-2")}
            render={(s, i, setItem) => (
              <div key={i} className="h-full rounded-xl border border-border bg-card p-6">
                <EditableText as="p" value={s.title} onChange={editing ? (title) => setItem({ ...s, title }) : undefined} className="block font-display text-3xl font-bold text-primary" placeholder="Número" />
                <EditableText as="p" value={s.text} onChange={editing ? (text) => setItem({ ...s, text }) : undefined} className="mt-1 block text-sm text-muted-foreground" placeholder="Legenda" />
              </div>
            )}
          />
        </div>
      </section>
    ),

    steps: (
      <section id="como-funciona" className="border-y border-border/60 bg-card/30 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          {eyebrow("steps", content.steps.eyebrow)}
          {heading("steps", content.steps.title, content.steps.highlight, "mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl")}
          <EditList
            editing={editing}
            items={content.steps.items}
            keep={(s) => shown(s.title) || shown(s.text)}
            onChange={list<{ title: string; text: string }>("steps", "items")}
            blank={() => ({ title: "Novo passo", text: "Descrição do passo." })}
            addLabel="Adicionar passo"
            className={cn("mt-10 grid gap-4", !mobile && "sm:grid-cols-2 lg:grid-cols-4")}
            render={(s, i, setItem) => (
              <div key={i} className="h-full rounded-xl border border-border bg-card p-5">
                <p className="font-display text-2xl font-bold text-primary">{String(i + 1).padStart(2, "0")}</p>
                <EditableText as="h3" value={s.title} onChange={editing ? (title) => setItem({ ...s, title }) : undefined} className="mt-3 block text-base font-bold" placeholder="Título" />
                <EditableText as="p" value={s.text} onChange={editing ? (text) => setItem({ ...s, text }) : undefined} className="mt-2 block text-sm leading-relaxed text-muted-foreground" placeholder="Descrição" />
              </div>
            )}
          />
        </div>
      </section>
    ),

    audience: (
      <section id="para-quem" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          {eyebrow("audience", content.audience.eyebrow)}
          {heading("audience", content.audience.title, content.audience.highlight, "mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl")}
          <EditList
            editing={editing}
            items={content.audience.items}
            keep={(a) => shown(a.title) || shown(a.text)}
            onChange={list<{ title: string; text: string }>("audience", "items")}
            blank={() => ({ title: "Novo público", text: "Descrição." })}
            addLabel="Adicionar público"
            className={cn("mt-10 grid gap-4", !mobile && "sm:grid-cols-2 lg:grid-cols-4")}
            render={(a, i, setItem) => (
              <div key={i} className="h-full rounded-xl border border-border bg-card p-5">
                <EditableText as="h3" value={a.title} onChange={editing ? (title) => setItem({ ...a, title }) : undefined} className="block text-base font-bold" placeholder="Título" />
                <EditableText as="p" value={a.text} onChange={editing ? (text) => setItem({ ...a, text }) : undefined} className="mt-2 block text-sm leading-relaxed text-muted-foreground" placeholder="Descrição" />
              </div>
            )}
          />
        </div>
      </section>
    ),

    faq: (
      <section id="faq" className="border-t border-border/60 bg-card/30 py-16 md:py-24">
        <div className={cn("mx-auto grid max-w-6xl gap-10 px-4", !mobile && "lg:grid-cols-[1fr_1.4fr]")}>
          <div>
            {eyebrow("faq", content.faq.eyebrow)}
            {heading("faq", content.faq.title, content.faq.highlight, "mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl")}
          </div>

          <EditList
            editing={editing}
            items={content.faq.items}
            keep={(item) => shown(item.q)}
            onChange={list<{ q: string; a: string }>("faq", "items")}
            blank={() => ({ q: "Nova pergunta?", a: "Resposta." })}
            addLabel="Adicionar pergunta"
            className="divide-y divide-border rounded-xl border border-border bg-card"
            render={(item, i, setItem) =>
              editing ? (
                <div key={i} className="px-5 py-4">
                  <EditableText value={item.q} onChange={(q) => setItem({ ...item, q })} className="block text-sm font-bold" placeholder="Pergunta" />
                  <EditableText as="p" value={item.a} onChange={(a) => setItem({ ...item, a })} className="mt-2 block text-sm leading-relaxed text-muted-foreground" placeholder="Resposta" />
                </div>
              ) : (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold transition-colors hover:text-primary"
                    aria-expanded={openFaq === i}
                  >
                    {item.q}
                    <ChevronDown className={cn("size-4 shrink-0 transition-transform", openFaq === i && "rotate-180 text-primary")} />
                  </button>
                  {openFaq === i && shown(item.a) && (
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{withSystemName(item.a, systemName)}</p>
                  )}
                </div>
              )
            }
          />
        </div>
      </section>
    ),

    cta: (
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div
            className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card px-6 py-14 text-center"
            style={
              content.cta.image
                ? {
                    backgroundImage: `linear-gradient(rgb(0 0 0 / .68), rgb(0 0 0 / .68)), url(${content.cta.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div
              className="pointer-events-none absolute inset-x-0 -bottom-24 h-64 opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
              aria-hidden
            />
            <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
              <EditableText value={content.cta.title} onChange={on("cta", "title")} placeholder="Título" />
              <br />
              <EditableText value={content.cta.highlight} onChange={on("cta", "highlight")} className="text-primary" placeholder="Destaque" />
            </h2>
            {(shown(ctaText) || editing) && (
              <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                <EditableText value={ctaText} onChange={ctaTextField} placeholder={mobile ? "Texto curto do celular" : "Texto da chamada"} />
              </p>
            )}
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              {(shown(content.cta.primary) || editing) && (
                <LandingCta editing={editing}>
                  <Button size="lg" className="font-bold">
                    <EditableText value={content.cta.primary} onChange={on("cta", "primary")} placeholder="Botão" />
                    <ArrowRight className="size-4" />
                  </Button>
                </LandingCta>
              )}
              {(shown(content.cta.secondary) || editing) && (
                <a href={editing ? undefined : "#recursos"}>
                  <Button size="lg" variant="outline" className="font-bold">
                    <EditableText value={content.cta.secondary} onChange={on("cta", "secondary")} placeholder="Botão" />
                  </Button>
                </a>
              )}
            </div>
            {edit && (
              <ImageSlot
                className="relative mt-6 text-left"
                label="Imagem de fundo da chamada final"
                value={content.cta.image}
                onChange={(image) => patch("cta", { image })}
              />
            )}
          </div>
        </div>
      </section>
    ),
  };

  const visibleSections = content.sections.filter((s) => (mobile && !editing ? s === "hero" || s === "features" || s === "cta" : true));

  return (
    <div className="min-h-screen bg-background text-foreground" style={pageStyle}>
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {brandImage ? (
              <img src={brandImage} alt="" className="size-9 shrink-0 object-contain" />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scissors className="size-4" />
              </span>
            )}
            <span className="truncate font-display text-lg font-bold">{systemName}</span>
          </div>

          {!mobile && (
            <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex">
              {([
                ["features", "#recursos"],
                ["how", "#como-funciona"],
                ["audience", "#para-quem"],
                ["faq", "#faq"],
              ] as const).map(([field, href]) => {
                const value = content.nav[field];
                if (!editing && !shown(value)) return null;
                return (
                  <a key={field} href={editing ? undefined : href} className="transition-colors hover:text-foreground">
                    <EditableText value={value} onChange={on("nav", field)} placeholder="Link" />
                  </a>
                );
              })}
            </nav>
          )}

          {(shown(content.nav.login) || editing) && (
            <LandingCta editing={editing}>
              <Button size="sm" className="font-bold">
                <LogIn className="size-4" />
                <EditableText value={content.nav.login} onChange={on("nav", "login")} placeholder="Entrar" />
              </Button>
            </LandingCta>
          )}
        </div>
      </header>

      {visibleSections.map((section) => (
        <SectionShell key={section} edit={edit} order={content.sections} section={section} label={SECTION_LABELS[section]} onMove={moveSection}>
          {sections[section]}
        </SectionShell>
      ))}

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex min-w-0 items-center gap-2">
            {brandImage ? (
              <img src={brandImage} alt="" className="size-8 shrink-0 object-contain" />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scissors className="size-3.5" />
              </span>
            )}
            <span className="truncate font-display font-bold text-foreground">{systemName}</span>
          </div>
          <EditableText as="p" value={content.footer.text} onChange={on("footer", "text")} className="text-xs" placeholder="Texto do rodapé" />
          {(shown(content.footer.login) || editing) && (
            <LandingCta editing={editing}>
              <span className="text-xs font-bold text-primary hover:underline">
                <EditableText value={content.footer.login} onChange={on("footer", "login")} placeholder="Link de login" />
              </span>
            </LandingCta>
          )}
        </div>
      </footer>
    </div>
  );
}

/** Links go to /login on the public page and stay inert while editing. */
function LandingCta({ editing, children }: { editing: boolean; children: React.ReactNode }) {
  if (editing) return <span className="inline-flex">{children}</span>;
  return <Link to="/login">{children}</Link>;
}

function EditorMock() {
  return (
    <>
      <div className="flex items-center gap-2 px-2 pb-3">
        <span className="size-2.5 rounded-full bg-primary/70" />
        <span className="size-2.5 rounded-full bg-muted-foreground/40" />
        <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        <span className="ml-2 text-[11px] font-semibold text-muted-foreground">Projeto · Lançamento setembro</span>
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-2 space-y-2">
          {["Ajuste", "Bordas", "Overlay", "Título", "Extras"].map((tab, i) => (
            <div
              key={tab}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-bold",
                i === 0 ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground",
              )}
            >
              {tab}
            </div>
          ))}
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Zoom</p>
            <div className="mt-2 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 w-2/5 rounded-full bg-primary" />
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Posição</p>
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
    </>
  );
}
