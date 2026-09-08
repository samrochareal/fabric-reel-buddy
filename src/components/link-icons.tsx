import {
  BookOpen,
  Globe,
  GraduationCap,
  HelpCircle,
  Instagram,
  Link as LinkIcon,
  MessageCircle,
  Play,
  Send,
  ShoppingBag,
  Star,
  Youtube,
} from "lucide-react";

/** Icons the master user can pick for each external link. */
export const LINK_ICONS = {
  link: LinkIcon,
  globe: Globe,
  youtube: Youtube,
  instagram: Instagram,
  whatsapp: MessageCircle,
  telegram: Send,
  shop: ShoppingBag,
  course: GraduationCap,
  book: BookOpen,
  play: Play,
  star: Star,
  help: HelpCircle,
} as const;

export type LinkIconName = keyof typeof LINK_ICONS;

export const LINK_ICON_NAMES = Object.keys(LINK_ICONS) as LinkIconName[];

export function LinkGlyph({ name, className }: { name?: string; className?: string }) {
  const Icon = LINK_ICONS[(name ?? "link") as LinkIconName] ?? LinkIcon;
  return <Icon className={className} />;
}
