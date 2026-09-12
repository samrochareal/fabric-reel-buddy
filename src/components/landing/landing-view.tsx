import { Link } from "@tanstack/react-router";
import { createContext, useContext, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Crop,
  Frame,
  Gauge,
  Images,
  Layers,
  Rocket,
  ShieldCheck,
  Sparkles,
  Type as TypeIcon,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shown, withSystemName, type LandingContent, type LandingSection } from "@/lib/landing-content";

export type LandingDevice = "desktop" | "mobile";
export type LandingSelection = {
  key: string;
  label: string;
  kind: "text" | "button" | "image" | "item" | "section" | "plan";
  value?: string;
  onChange?: (value: string) => void;
  hidden: boolean;
  onToggleHidden: () => void;
  onDelete?: (() => void) | undefined;
  planIndex?: number | undefined;
};
export type LandingEdit = {
  update: (fn: (c: LandingContent) => LandingContent) => void;
  selectedKey?: string | undefined;
  onSelect?: ((selection: LandingSelection) => void) | undefined;
};

const LandingEditorContext = createContext<{ edit: LandingEdit | undefined; content: LandingContent | undefined }>({ edit: undefined, content: undefined });

function elementStyle(content: LandingContent | undefined, key: string | undefined): CSSProperties | undefined {
  if (!content || !key) return undefined;
  const value = content.styles?.[key];
  if (!value) return undefined;
  return {
    color: value.color,
    backgroundColor: value.backgroundColor,
    fontSize: value.fontSize ? `${value.fontSize}px` : undefined,
    width: value.width ? `${value.width}%` : undefined,
    transform: value.x || value.y ? `translate(${value.x ?? 0}px, ${value.y ?? 0}px)` : undefined,
    textAlign: value.textAlign,
  };
}

/* ------------------------------------------------------------------ */
/* click-to-edit text                                                  */
/* ------------------------------------------------------------------ */

function EditableText({
  value,
  onChange,
  as = "span",
  className,
  placeholder = "Texto",
  hidden = false,
  onToggleHidden,
  onDelete,
  elementKey,
  label,
}: {
  value: string;
  onChange?: ((next: string) => void) | undefined;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "li" | "div";
  className?: string | undefined;
  placeholder?: string | undefined;
  hidden?: boolean | undefined;
  onToggleHidden?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
  elementKey?: string | undefined;
  label?: string | undefined;
}) {
  const Tag = as as React.ElementType;
  const editor = useContext(LandingEditorContext);
  const style = elementStyle(editor.content, elementKey);
  const selected = Boolean(elementKey && editor.edit?.selectedKey === elementKey);
  const select = () => {
    if (!onChange || !elementKey) return;
    editor.edit?.onSelect?.({
      key: elementKey,
      label: label ?? placeholder,
      kind: placeholder === "Botão" || placeholder === "Entrar" || placeholder === "Link de login" ? "button" : "text",
      value,
      onChange,
      hidden,
      onToggleHidden: onToggleHidden ?? (() => {}),
      onDelete: onDelete ?? (() => onChange("")),
    });
  };

  if (!onChange) {
    if (hidden || !shown(value)) return null;
    const node = <Tag className={className} style={style}>{value}</Tag>;
    const href = elementKey ? editor.content?.links?.[elementKey] : undefined;
    return href ? <a href={href}>{node}</a> : node;
  }

  return (
    <span
      className={cn("relative inline-flex items-center", hidden && "opacity-35", selected && "outline-2 outline-offset-4 outline-primary")}
      style={style}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); select(); }}
    >
      <Tag
        data-editable=""
        className={cn(
          "cursor-pointer rounded outline-none ring-1 ring-dashed ring-transparent transition hover:ring-primary/60",
          className,
        )}
      >
        {value || placeholder}
      </Tag>
    </span>
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
  addLabel: _addLabel = "Adicionar item",
  render,
  className,
  hiddenKey,
  isHidden,
  onToggleHidden,
}: {
  editing: boolean;
  items: T[];
  keep: (item: T) => boolean;
  onChange?: ((next: T[]) => void) | undefined;
  blank?: (() => T) | undefined;
  addLabel?: string | undefined;
  render: (item: T, index: number, setItem: (next: T) => void) => React.ReactNode;
  className?: string | undefined;
  hiddenKey?: string | undefined;
  isHidden?: ((key: string) => boolean) | undefined;
  onToggleHidden?: ((key: string) => void) | undefined;
}) {
  const dragFrom = useRef<number | null>(null);
  const noop = () => {};

  if (!editing || !onChange) {
    const visible = items.map((item, index) => ({ item, index })).filter(({ item, index }) => keep(item) && !(hiddenKey && isHidden?.(`${hiddenKey}.${index}`)));
    if (!visible.length) return null;
    return <div className={className}>{visible.map(({ item, index }) => render(item, index, noop))}</div>;
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
            className="relative cursor-grab rounded-xl ring-1 ring-dashed ring-transparent hover:ring-primary/50"
          >
            <div className={cn(isHidden?.(`${hiddenKey}.${i}`) && "opacity-35")}>
              {render(item, i, (next) => onChange(items.map((it, j) => (j === i ? next : it))))}
            </div>
          </div>
        ))}
      </div>
    </>
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
  hidden,
  onToggleHidden,
  onDelete,
  children,
}: {
  edit?: LandingEdit | undefined;
  order: LandingSection[];
  section: LandingSection;
  label: string;
  onMove: (section: LandingSection, delta: number) => void;
  hidden: boolean;
  onToggleHidden: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  if (!edit) return hidden ? null : <>{children}</>;
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
      className={cn("relative cursor-move border-y-2 border-dashed border-transparent hover:border-primary/40", hidden && "opacity-35")}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        edit.onSelect?.({ key: `section.${section}`, label, kind: "section", hidden, onToggleHidden, onDelete });
      }}
    >
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
  plans: "Planos",
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
  type Group = "nav" | "hero" | "features" | "benefits" | "steps" | "audience" | "plans" | "faq" | "cta" | "footer" | "mobile";
  const patch = (group: Group, values: Record<string, unknown>) =>
    edit?.update((c) => ({ ...c, [group]: { ...(c[group] as Record<string, unknown>), ...values } }) as LandingContent);
  const on = (group: Group, field: string) =>
    edit ? (v: string) => patch(group, { [field]: v }) : undefined;
  const list = <T,>(group: Group, field: string) =>
    edit ? (next: T[]) => patch(group, { [field]: next }) : undefined;
  const isHidden = (key: string) => Boolean(content.hidden?.[key]);
  const toggleHidden = (key: string) =>
    edit?.update((c) => ({ ...c, hidden: { ...c.hidden, [key]: !c.hidden?.[key] } }));
  /** Removing an item drops it from the page for good. */
  const removeItem = (group: Group, field: string, index: number) =>
    edit?.update((c) => {
      const arr = [...(((c[group] as Record<string, unknown>)[field] as unknown[]) ?? [])];
      arr.splice(index, 1);
      return { ...c, [group]: { ...(c[group] as Record<string, unknown>), [field]: arr } } as LandingContent;
    });
  const deleteSection = (section: LandingSection) =>
    edit?.update((c) => ({
      ...c,
      sections: c.sections.filter((s) => s !== section),
      removedSections: [...(c.removedSections ?? []), section],
    }));
  const visibility = (key: string, label?: string, onDelete?: () => void) => ({
    elementKey: key,
    label,
    hidden: isHidden(key),
    onToggleHidden: edit ? () => toggleHidden(key) : undefined,
    onDelete: edit ? onDelete : undefined,
  });
  const selectImage = (key: string, label: string, value: string | null, onChange: (value: string) => void) => {
    edit?.onSelect?.({ key, label, kind: "image", value: value ?? "", onChange, hidden: isHidden(key), onToggleHidden: () => toggleHidden(key), onDelete: () => onChange("") });
  };


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
      <EditableText value={title} onChange={on(group, "title")} placeholder="Título" {...visibility(`${group}.title`)} />{" "}
      <EditableText value={highlight} onChange={on(group, "highlight")} className="text-primary" placeholder="Destaque" {...visibility(`${group}.highlight`)} />
    </h2>
  );

  const eyebrow = (group: Group, value: string) => (
    <EditableText
      as="p"
      value={value}
      onChange={on(group, "eyebrow")}
      className="text-xs font-bold uppercase tracking-[0.2em] text-primary"
      placeholder="Etiqueta"
      {...visibility(`${group}.eyebrow`)}
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
              <EditableText value={content.hero.title} onChange={on("hero", "title")} placeholder="Título" {...visibility("hero.title")} />{" "}
              <EditableText value={content.hero.highlight} onChange={on("hero", "highlight")} className="text-primary" placeholder="Destaque" {...visibility("hero.highlight")} />
            </h1>
            {(shown(heroText) || editing) && (
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
                <EditableText
                  value={editing ? heroText : withSystemName(heroText, systemName)}
                  onChange={heroTextField}
                  placeholder={mobile ? "Texto curto do celular" : "Texto da abertura"}
                  {...visibility(mobile ? "mobile.heroText" : "hero.text")}
                />
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {((shown(content.hero.primaryCta) && !isHidden("hero.primaryCta")) || editing) && (
                <LandingCta editing={editing} href={content.links["hero.primaryCta"]}>
                  <Button size="lg" className="font-bold">
                    <EditableText value={content.hero.primaryCta} onChange={on("hero", "primaryCta")} placeholder="Botão" {...visibility("hero.primaryCta")} />
                    <ArrowRight className="size-4" />
                  </Button>
                </LandingCta>
              )}
              {((shown(content.hero.secondaryCta) && !isHidden("hero.secondaryCta")) || editing) && (
                <a href={editing ? undefined : content.links["hero.secondaryCta"] || "#como-funciona"}>
                  <Button size="lg" variant="outline" className="font-bold">
                    <EditableText value={content.hero.secondaryCta} onChange={on("hero", "secondaryCta")} placeholder="Botão" {...visibility("hero.secondaryCta")} />
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
              hiddenKey="hero.badges"
              isHidden={isHidden}
              onToggleHidden={toggleHidden}
              className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground"
              render={(badge, i, setItem) => {
                const Icon = [Rocket, Zap, Sparkles][i % 3] ?? Sparkles;
                return (
                  <span key={i} className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-primary" />
                    <EditableText value={badge} onChange={editing ? setItem : undefined} placeholder="Selo" {...visibility(`hero.badges.${i}`, "Selo")} />
                  </span>
                );
              }}
            />
          </div>

          <div
            className={cn("relative rounded-2xl border border-border bg-card p-3 shadow-2xl", editing && "cursor-pointer hover:ring-2 hover:ring-primary/60", isHidden("hero.image") && editing && "opacity-35")}
            onClick={() => selectImage("hero.image", "Imagem da abertura", content.hero.image, (image) => patch("hero", { image: image || null }))}
          >
            {content.hero.image && !isHidden("hero.image") ? (
              <img src={content.hero.image} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            ) : (
              <EditorMock />
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
                  {...visibility("mobile.featuresTitle")}
                />
              </h2>
            ) : (
              heading("features", content.features.title, content.features.highlight, "max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl")
            )}
            {!mobile && (
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground md:mt-0">
                <EditableText value={content.features.intro} onChange={on("features", "intro")} placeholder="Texto de apoio" {...visibility("features.intro")} />
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
            hiddenKey="features.items"
            isHidden={isHidden}
            onToggleHidden={toggleHidden}
            className={cn("mt-10 grid gap-4", mobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3")}
            render={(f, i, setItem) => {
              const Icon = featureIcons[i % featureIcons.length] ?? Layers;
              return (
                <div key={i} className="group h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <EditableText as="h3" value={f.title} onChange={editing ? (title) => setItem({ ...f, title }) : undefined} className="mt-4 block text-base font-bold" placeholder="Título" {...visibility(`features.items.${i}.title`, "Título do recurso")} />
                  <EditableText as="p" value={f.text} onChange={editing ? (text) => setItem({ ...f, text }) : undefined} className="mt-2 block text-sm leading-relaxed text-muted-foreground" placeholder="Descrição" {...visibility(`features.items.${i}.text`, "Descrição do recurso")} />
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
              hiddenKey="benefits.items"
              isHidden={isHidden}
              onToggleHidden={toggleHidden}
              className="mt-7 space-y-3"
              render={(item, i, setItem) => (
                <div key={i} className="flex items-start gap-3 text-sm font-semibold">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                  <EditableText value={item} onChange={editing ? setItem : undefined} placeholder="Benefício" {...visibility(`benefits.items.${i}`, "Benefício")} />
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
            hiddenKey="benefits.stats"
            isHidden={isHidden}
            onToggleHidden={toggleHidden}
            className={cn("grid gap-4", !mobile && "sm:grid-cols-2")}
            render={(s, i, setItem) => (
              <div key={i} className="h-full rounded-xl border border-border bg-card p-6">
                <EditableText as="p" value={s.title} onChange={editing ? (title) => setItem({ ...s, title }) : undefined} className="block font-display text-3xl font-bold text-primary" placeholder="Número" {...visibility(`benefits.stats.${i}.title`, "Número")} />
                <EditableText as="p" value={s.text} onChange={editing ? (text) => setItem({ ...s, text }) : undefined} className="mt-1 block text-sm text-muted-foreground" placeholder="Legenda" {...visibility(`benefits.stats.${i}.text`, "Legenda do número")} />
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
            hiddenKey="steps.items"
            isHidden={isHidden}
            onToggleHidden={toggleHidden}
            className={cn("mt-10 grid gap-4", !mobile && "sm:grid-cols-2 lg:grid-cols-4")}
            render={(s, i, setItem) => (
              <div key={i} className="h-full rounded-xl border border-border bg-card p-5">
                <p className="font-display text-2xl font-bold text-primary">{String(i + 1).padStart(2, "0")}</p>
                <EditableText as="h3" value={s.title} onChange={editing ? (title) => setItem({ ...s, title }) : undefined} className="mt-3 block text-base font-bold" placeholder="Título" {...visibility(`steps.items.${i}.title`, "Título do passo")} />
                <EditableText as="p" value={s.text} onChange={editing ? (text) => setItem({ ...s, text }) : undefined} className="mt-2 block text-sm leading-relaxed text-muted-foreground" placeholder="Descrição" {...visibility(`steps.items.${i}.text`, "Descrição do passo")} />
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
            hiddenKey="audience.items"
            isHidden={isHidden}
            onToggleHidden={toggleHidden}
            className={cn("mt-10 grid gap-4", !mobile && "sm:grid-cols-2 lg:grid-cols-4")}
            render={(a, i, setItem) => (
              <div key={i} className="h-full rounded-xl border border-border bg-card p-5">
                <EditableText as="h3" value={a.title} onChange={editing ? (title) => setItem({ ...a, title }) : undefined} className="block text-base font-bold" placeholder="Título" {...visibility(`audience.items.${i}.title`, "Título do público")} />
                <EditableText as="p" value={a.text} onChange={editing ? (text) => setItem({ ...a, text }) : undefined} className="mt-2 block text-sm leading-relaxed text-muted-foreground" placeholder="Descrição" {...visibility(`audience.items.${i}.text`, "Descrição do público")} />
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
            hiddenKey="faq.items"
            isHidden={isHidden}
            onToggleHidden={toggleHidden}
            className="divide-y divide-border rounded-xl border border-border bg-card"
            render={(item, i, setItem) =>
              editing ? (
                <div key={i} className="px-5 py-4">
                  <EditableText value={item.q} onChange={(q) => setItem({ ...item, q })} className="block text-sm font-bold" placeholder="Pergunta" {...visibility(`faq.items.${i}.q`, "Pergunta")} />
                  <EditableText as="p" value={item.a} onChange={(a) => setItem({ ...item, a })} className="mt-2 block text-sm leading-relaxed text-muted-foreground" placeholder="Resposta" {...visibility(`faq.items.${i}.a`, "Resposta")} />
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
            className={cn("relative overflow-hidden rounded-2xl border border-primary/40 bg-card px-6 py-14 text-center", editing && "hover:ring-2 hover:ring-primary/60")}
            style={
              content.cta.image && !isHidden("cta.image")
                ? {
                    backgroundImage: `linear-gradient(rgb(0 0 0 / .68), rgb(0 0 0 / .68)), url(${content.cta.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
            onClick={(event) => {
              if (!editing || event.target !== event.currentTarget) return;
              selectImage("cta.image", "Imagem da chamada final", content.cta.image, (image) => patch("cta", { image: image || null }));
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 -bottom-24 h-64 opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
              aria-hidden
            />
            <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
              <EditableText value={content.cta.title} onChange={on("cta", "title")} placeholder="Título" {...visibility("cta.title")} />
              <br />
              <EditableText value={content.cta.highlight} onChange={on("cta", "highlight")} className="text-primary" placeholder="Destaque" {...visibility("cta.highlight")} />
            </h2>
            {(shown(ctaText) || editing) && (
              <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                <EditableText value={ctaText} onChange={ctaTextField} placeholder={mobile ? "Texto curto do celular" : "Texto da chamada"} {...visibility(mobile ? "mobile.ctaText" : "cta.text")} />
              </p>
            )}
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              {((shown(content.cta.primary) && !isHidden("cta.primary")) || editing) && (
                <LandingCta editing={editing} href={content.links["cta.primary"]}>
                  <Button size="lg" className="font-bold">
                    <EditableText value={content.cta.primary} onChange={on("cta", "primary")} placeholder="Botão" {...visibility("cta.primary")} />
                    <ArrowRight className="size-4" />
                  </Button>
                </LandingCta>
              )}
              {((shown(content.cta.secondary) && !isHidden("cta.secondary")) || editing) && (
                <a href={editing ? undefined : content.links["cta.secondary"] || "#recursos"}>
                  <Button size="lg" variant="outline" className="font-bold">
                    <EditableText value={content.cta.secondary} onChange={on("cta", "secondary")} placeholder="Botão" {...visibility("cta.secondary")} />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    ),
    plans: (
      <section id="planos" className={cn("border-t border-border/60", mobile ? "py-12" : "py-20")}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <EditableText as="p" value={content.plans.eyebrow} onChange={on("plans", "eyebrow")} className="text-xs font-bold uppercase tracking-[0.2em] text-primary" placeholder="Selo" {...visibility("plans.eyebrow")} />
            <h2 className={cn("mt-3 font-display font-bold", mobile ? "text-2xl" : "text-4xl")}>
              <EditableText value={content.plans.title} onChange={on("plans", "title")} placeholder="Título" {...visibility("plans.title")} />{" "}
              <EditableText value={content.plans.highlight} onChange={on("plans", "highlight")} className="text-primary" placeholder="Destaque" {...visibility("plans.highlight")} />
            </h2>
            <EditableText as="p" value={content.plans.intro} onChange={on("plans", "intro")} className="mt-4 text-sm text-muted-foreground" placeholder="Descrição" {...visibility("plans.intro")} />
          </div>

          <div className={cn("mt-10 grid gap-5", mobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3")}>
            {content.plans.items.map((plan, i) => {
              if (!editing && (!plan.active || isHidden(`plans.item.${i}`))) return null;
              const setPlan = (values: Partial<typeof plan>) =>
                list<typeof plan>("plans", "items")?.(content.plans.items.map((p, j) => (j === i ? { ...p, ...values } : p)));
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-card p-6",
                    plan.highlight ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]" : "border-border",
                    editing && (!plan.active || isHidden(`plans.item.${i}`)) && "opacity-40",
                  )}
                  onClick={(event) => {
                    if (!editing || event.target !== event.currentTarget) return;
                    edit?.onSelect?.({
                      key: `plans.item.${i}`,
                      label: `Plano ${plan.name}`,
                      kind: "plan",
                      planIndex: i,
                      hidden: isHidden(`plans.item.${i}`),
                      onToggleHidden: () => toggleHidden(`plans.item.${i}`),
                      onDelete: () => removeItem("plans", "items", i),
                    });
                  }}
                >
                  <EditableText as="h3" value={plan.name} onChange={editing ? (v) => setPlan({ name: v }) : undefined} className="font-display text-lg font-bold" placeholder="Nome do plano" {...visibility(`plans.item.${i}.name`, "Nome do plano", () => removeItem("plans", "items", i))} />
                  <div className="mt-2 flex items-end gap-1">
                    <EditableText value={plan.price} onChange={editing ? (v) => setPlan({ price: v }) : undefined} className="font-display text-3xl font-bold" placeholder="Preço" {...visibility(`plans.item.${i}.price`, "Preço")} />
                    <EditableText value={plan.period} onChange={editing ? (v) => setPlan({ period: v }) : undefined} className="pb-1 text-sm font-semibold text-muted-foreground" placeholder="/mês" {...visibility(`plans.item.${i}.period`, "Periodicidade")} />
                  </div>
                  <EditableText as="p" value={plan.description} onChange={editing ? (v) => setPlan({ description: v }) : undefined} className="mt-2 text-sm text-muted-foreground" placeholder="Descrição" {...visibility(`plans.item.${i}.description`, "Descrição do plano")} />
                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {plan.features.map((feature, f) => {
                      if (!editing && (!shown(feature) || isHidden(`plans.item.${i}.feature.${f}`))) return null;
                      return (
                        <li key={f} className="flex items-start gap-2">
                          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                          <EditableText
                            value={feature}
                            onChange={editing ? (v) => setPlan({ features: plan.features.map((x, k) => (k === f ? v : x)) }) : undefined}
                            placeholder="Benefício"
                            {...visibility(`plans.item.${i}.feature.${f}`, "Benefício do plano", () => setPlan({ features: plan.features.filter((_, k) => k !== f) }))}
                          />
                        </li>
                      );
                    })}
                  </ul>
                  {editing ? (
                    <Button className="mt-6 w-full font-bold" variant={plan.highlight ? "default" : "outline"}>
                      <EditableText value={plan.cta} onChange={(v) => setPlan({ cta: v })} placeholder="Botão" {...visibility(`plans.item.${i}.cta`, "Botão do plano")} />
                    </Button>
                  ) : (
                    <Link to="/checkout" search={{ plan: plan.id }} className="mt-6">
                      <Button className="w-full font-bold" variant={plan.highlight ? "default" : "outline"}>{plan.cta}</Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    ),
  };

  const visibleSections = content.sections.filter((s) => (mobile && !editing ? s === "hero" || s === "features" || s === "plans" || s === "cta" : true));


  return (
    <LandingEditorContext.Provider value={{ edit, content }}>
    <div className="min-h-screen bg-background text-foreground" style={pageStyle}>
      {/* header */}
      <header className={cn("sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur", isHidden("header") && !editing && "hidden", isHidden("header") && editing && "opacity-35")}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {brandImage && !isHidden("header.brand") ? (
              <img src={brandImage} alt="" className="size-9 shrink-0 object-contain" />
            ) : null}
            {!isHidden("header.brand") && <span className="truncate font-display text-lg font-bold">{systemName}</span>}
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
                if (!editing && (!shown(value) || isHidden(`nav.${field}`))) return null;
                return (
                  <a key={field} href={editing ? undefined : href} className="transition-colors hover:text-foreground">
                    <EditableText value={value} onChange={on("nav", field)} placeholder="Link" {...visibility(`nav.${field}`, "Link do menu")} />
                  </a>
                );
              })}
            </nav>
          )}

          {((shown(content.nav.login) && !isHidden("nav.login")) || editing) && (
            <LandingCta editing={editing} href={content.links["nav.login"]}>
              <Button size="sm" className="font-bold">
                <EditableText value={content.nav.login} onChange={on("nav", "login")} placeholder="Entrar" {...visibility("nav.login", "Botão de login")} />
              </Button>
            </LandingCta>
          )}
        </div>
      </header>

      {visibleSections.map((section) => (
        <SectionShell key={section} edit={edit} order={content.sections} section={section} label={SECTION_LABELS[section]} onMove={moveSection} hidden={isHidden(`section.${section}`)} onToggleHidden={() => toggleHidden(`section.${section}`)}>
          {sections[section]}
        </SectionShell>
      ))}

      <footer className={cn("relative border-t border-border/60 py-10", isHidden("footer") && !editing && "hidden", isHidden("footer") && editing && "opacity-35")}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex min-w-0 items-center gap-2">
            {brandImage ? (
              <img src={brandImage} alt="" className="size-8 shrink-0 object-contain" />
            ) : null}
            <span className="truncate font-display font-bold text-foreground">{systemName}</span>
          </div>
          <EditableText as="p" value={content.footer.text} onChange={on("footer", "text")} className="text-xs" placeholder="Texto do rodapé" {...visibility("footer.text")} />
          {((shown(content.footer.login) && !isHidden("footer.login")) || editing) && (
            <LandingCta editing={editing} href={content.links["footer.login"]}>
              <span className="text-xs font-bold text-primary hover:underline">
                <EditableText value={content.footer.login} onChange={on("footer", "login")} placeholder="Link de login" {...visibility("footer.login")} />
              </span>
            </LandingCta>
          )}
        </div>
      </footer>
    </div>
    </LandingEditorContext.Provider>
  );
}

/** Links go to /login on the public page and stay inert while editing. */
function LandingCta({ editing, children, href = "/login" }: { editing: boolean; children: React.ReactNode; href?: string | undefined }) {
  if (editing) return <span className="inline-flex">{children}</span>;
  if (href === "/login") return <Link to="/login">{children}</Link>;
  return <a href={href}>{children}</a>;
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
