import { useSyncExternalStore } from "react";

/**
 * Tiny language store. Interface text is written in English in the code and
 * translated to Portuguese through the dictionary below.
 */
export type Lang = "en" | "pt";

const KEY = "fdr.lang";
const listeners = new Set<() => void>();
let current: Lang = "en";

function read(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(KEY);
  return saved === "pt" ? "pt" : "en";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snapshot(): Lang {
  if (typeof window === "undefined") return "en";
  current = read();
  return current;
}

export function setLang(lang: Lang) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, lang);
  current = lang;
  listeners.forEach((fn) => fn());
}

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, snapshot, () => "en" as Lang);
  return [lang, setLang];
}

/** English source string -> Portuguese */
const PT: Record<string, string> = {
  // header / shell
  "Batch editor": "Editor em lote",
  "Master panel": "Painel master",
  "Sign out": "Sair",
  "Leave guest mode": "Sair do modo visitante",
  "Guest · nothing is saved": "Visitante · nada é salvo",
  "in queue": "na fila",
  "Language": "Idioma",

  // limits line
  "Up to {max} videos per batch · {mb}MB max · {s}s each":
    "Até {max} vídeos por lote · máximo {mb}MB · {s}s cada",
  "Drag videos here or click": "Arraste vídeos ou clique",
  "MP4, MOV, WebM · {mb}MB max · {s}s each": "MP4, MOV, WebM · máximo {mb}MB · {s}s cada",
  "Select video files.": "Selecione arquivos de vídeo.",
  "{n} video(s) over {mb} MB were skipped.": "{n} vídeo(s) acima de {mb} MB foram ignorados.",
  "{n} video(s) longer than {s}s were skipped.": "{n} vídeo(s) acima de {s}s foram ignorados.",
  "Maximum of {max} videos per batch.": "Máximo de {max} vídeos por lote.",
  "Your queue is empty.": "Sua fila está vazia.",
  "Clear queue": "Limpar fila",
  "Remove from queue": "Remover da fila",
  "Download this video": "Baixar este vídeo",
  "ready": "prontos",
  "video": "vídeo",
  "videos": "vídeos",
  "queued": "aguardando",
  "processing": "processando",
  "done": "pronto",
  "failed": "falhou",

  // downloads
  "Download all": "Baixar todos",
  "How do you want to download?": "Como você quer baixar?",
  "Choose between a single zip file or separate downloads for each video.":
    "Escolha entre um único arquivo zip ou downloads separados para cada vídeo.",
  "Single .zip file": "Arquivo .zip único",
  "All {n} videos in one compressed file.": "Todos os {n} vídeos em um arquivo compactado.",
  "Separate video files": "Arquivos de vídeo separados",
  "Starts {n} downloads at once.": "Inicia {n} downloads de uma vez.",
  "Cancel": "Cancelar",
  "Downloading {n} video(s) separately…": "Baixando {n} vídeo(s) separadamente…",

  // preview / controls
  "Preview": "Prévia",
  "no video": "sem vídeo",
  "Play": "Reproduzir",
  "Pause": "Pausar",
  "Unmute": "Ativar som",
  "Mute": "Silenciar",
  "Batch settings": "Config. em lote",
  "This video only": "Só este vídeo",
  "Framing": "Enquadramento",
  "No crop": "Sem cortar",
  "Fill": "Preencher",
  "Fine tuning": "Ajuste fino do vídeo",
  "Default": "Padrão",
  "Zoom": "Zoom",
  "Vertical position": "Posição vertical",
  "Horizontal position": "Posição horizontal",
  "Background colour": "Cor de fundo",
  "Video borders": "Bordas do vídeo",
  "Crop top": "Cortar no topo",
  "Crop bottom": "Cortar no rodapé",
  "Centre content:": "Conteúdo central:",
  "Reset all edits": "Resetar todas as edições",

  // tabs
  "Text": "Texto",
  "Overlay": "Overlay",
  "Extras": "Extras",
  "Video title": "Título no vídeo",
  "One title per line. Each line goes to the matching video in the queue.":
    "Uma lista de títulos — um por linha. Cada linha vai para o vídeo correspondente da fila.",
  "Video title 1\nVideo title 2": "Título do vídeo 1\nTítulo do vídeo 2",
  "{n} title(s) for {v} video(s)": "{n} título(s) para {v} vídeo(s)",
  "Bottom text": "Texto inferior",
  "The same caption on every video — great for a handle or CTA.":
    "Mesma legenda em todos os vídeos — ideal para @ ou CTA.",
  "@yourhandle · follow for more": "@seuperfil · siga para mais",
  "Font": "Fonte",
  "Colour": "Cor",
  "Size": "Tamanho",
  "Background overlay": "Overlay de fundo",
  "Behind the video": "Atrás do vídeo",
  "In front": "Na frente",
  "Upload background image": "Enviar imagem de fundo",
  "Background image loaded.": "Imagem de fundo carregada.",
  "Background image in use": "Imagem de fundo em uso",
  "Remove background image": "Remover imagem de fundo",
  "Transparency": "Transparência",
  "Saved overlays": "Overlays salvos",
  "Refresh": "Atualizar",
  "You haven't saved any profile in the Overlay creator yet.":
    "Você ainda não salvou nenhum perfil no Criador de Overlay.",
  "Open the Overlay creator": "Abrir Criador de Overlay",
  "Overlay “{name}” applied.": "Overlay “{name}” aplicada.",
  "Colour overlay": "Overlay de cor",
  "A colour layer over the video — handy to darken the background and make the title pop.":
    "Uma camada de cor sobre o vídeo — útil para escurecer o fundo e destacar o título.",
  "Intensity": "Intensidade",
  "Mirror videos": "Espelhar vídeos",
  "Anti-duplicate mode": "Modo anti duplicidade",
  "Applies small variations to every video to reduce duplicate detection.":
    "Aplica pequenas variações em todos os vídeos para reduzir detecção de duplicidade.",
  "Speed": "Velocidade",
  "Everything runs in your browser: your files are never uploaded to any server.":
    "Todo o processamento roda no seu navegador: os arquivos nunca são enviados para nenhum servidor.",

  // processing
  "Add videos to process.": "Adicione vídeos para processar.",
  "Preparing the video engine (first time only)…":
    "Preparando o motor de vídeo (só na primeira vez)…",
  "Processing {n} video(s)…": "Processando {n} vídeo(s)…",
  "Failed to process": "Falha ao processar",
  "Error while processing.": "Erro ao processar.",
  "Processing paused. Click “Resume processing” to continue.":
    "Processamento pausado. Clique em “Retomar processamento” para continuar.",
  "Batch finished! Use “Download all” to save everything.":
    "Lote concluído! Use “Baixar todos” para salvar tudo.",
  "Processing…": "Processando…",
  "Resume processing": "Retomar processamento",
  "Process {n} video(s)": "Processar {n} vídeo(s)",
  "Pause processing": "Pausar processamento",
  "Processing will pause after the current video.":
    "O processamento será pausado após o vídeo atual.",

  // credits & access
  "Credits": "Créditos",
  "credits left": "créditos restantes",
  "Unlimited": "Ilimitado",
  "Premium": "Premium",
  "1 credit = 1 processed video": "1 crédito = 1 vídeo processado",
  "You are out of credits.": "Seus créditos acabaram.",
  "New credits arrive {when}.": "Novos créditos chegam {when}.",
  "Out of credits — processing stopped.": "Créditos esgotados — processamento interrompido.",
  "Your access has expired. Please contact the administrator.":
    "Seu acesso expirou. Fale com o administrador.",
  "Your account is blocked. Please contact the administrator.":
    "Sua conta está bloqueada. Fale com o administrador.",
  "This tool was disabled for your account.":
    "Esta ferramenta foi desativada para a sua conta.",
  "Access expires {when}": "Acesso expira {when}",

  // admin
  "How the platform is being used": "Como a plataforma está sendo usada",
  "Numbers refresh automatically every minute.":
    "Os números são atualizados automaticamente a cada minuto.",
  "Loading numbers…": "Carregando números…",
  "We couldn't load the numbers right now.": "Não foi possível carregar os números agora.",
  "Registered accounts": "Contas cadastradas",
  "{n} in the last 7 days": "{n} nos últimos 7 dias",
  "Processed videos": "Vídeos processados",
  "Active people (30 days)": "Pessoas ativas (30 dias)",
  "{n} videos in the period": "{n} vídeos no período",
  "Saved overlays total": "Overlays salvas",
  "{n} min of video in total": "{n} min de vídeo no total",
  "Videos per day (last 2 weeks)": "Vídeos por dia (últimas 2 semanas)",
  "System identity": "Identidade do sistema",
  "System name": "Nome do sistema",
  "Tagline (optional)": "Frase de apoio (opcional)",
  "Colour palette": "Paleta de cores",
  "Primary colour": "Cor principal",
  "Background": "Fundo",
  "Accent": "Destaque",
  "Logo (shown at the top)": "Logo (aparece no topo)",
  "Browser icon": "Ícone do navegador",
  "Remove": "Remover",
  "Save identity": "Salvar identidade",
  "System identity updated.": "Identidade do sistema atualizada.",
  "We couldn't save your changes.": "Não foi possível salvar as alterações.",
  "Enter the system name.": "Informe o nome do sistema.",
  "Pick an image up to 400KB.": "Escolha uma imagem de até 400KB.",
  "We couldn't read the image.": "Não foi possível ler a imagem.",
  "Invalid image.": "Imagem inválida.",
  "This area is for the master user only.": "Esta área é exclusiva do usuário master.",
  "Editor": "Editor",
  "Top links": "Links do topo",
  "Icons shown at the top of the editor. Leave empty to hide them.":
    "Ícones que aparecem no topo do editor. Deixe vazio para escondê-los.",
  "Title": "Título",
  "Address": "Endereço",
  "Add link": "Adicionar link",
  "Save links": "Salvar links",
  "Links updated.": "Links atualizados.",
  "People using the system": "Pessoas usando o sistema",
  "Name": "Nome",
  "E-mail": "E-mail",
  "Signed up": "Inscrição",
  "Available": "Disponíveis",
  "Used": "Utilizados",
  "Videos": "Vídeos",
  "Access": "Acesso",
  "Manage": "Gerenciar",
  "No accounts yet.": "Nenhuma conta ainda.",
  "Search by name or e-mail": "Buscar por nome ou e-mail",
  "Master": "Master",
  "Blocked": "Bloqueado",
  "Active": "Ativo",
  "Expired": "Expirado",
  "Credits available": "Créditos disponíveis",
  "Refill amount": "Créditos por recarga",
  "Refill every (hours)": "Recarregar a cada (horas)",
  "Premium (no credit limit)": "Premium (sem limite de créditos)",
  "Block access": "Bloquear acesso",
  "Access for how many days": "Acesso por quantos dias",
  "No time limit": "Sem limite de tempo",
  "Allowed editing tools": "Ferramentas de edição liberadas",
  "Save changes": "Salvar alterações",
  "Account updated.": "Conta atualizada.",
  "We couldn't update this account.": "Não foi possível atualizar esta conta.",
  "Close": "Fechar",
  "days": "dias",
  "never": "nunca",
  "Fine tuning & framing": "Ajuste fino e enquadramento",
  "Borders": "Bordas",
  "no name": "sem nome",

  // sign-in
  "Sign in to your account": "Entrar na sua conta",
  "Create a new account": "Criar nova conta",
  "Your overlays and last editing settings stay saved in your account.":
    "Seus overlays e as últimas configurações de edição ficam salvos na sua conta.",
  "Keep me signed in": "Continuar conectado",
  "Stay signed in on this device so you don't have to sign in again.":
    "Mantenha o acesso salvo neste dispositivo e não precise entrar novamente.",
  "Continue with Google": "Continuar com Google",
  or: "ou",
  "We sent a confirmation link to": "Enviamos um link de confirmação para",
  "Confirm it and then sign in with your e-mail and password.":
    "Confirme e depois entre com seu e-mail e senha.",
  "Your name": "Seu nome",
  Password: "Senha",
  "At least 6 characters": "Mínimo de 6 caracteres",
  "Sign in": "Entrar",
  "Create account": "Criar conta",
  "No account yet? Create one now": "Não tem conta? Criar uma agora",
  "Already have an account? Sign in": "Já tem conta? Entrar com e-mail e senha",
  "Continue as guest": "Entrar como visitante",
  "Use the full editor without an account. Nothing is saved: everything disappears when you close the page.":
    "Use o editor completo sem criar conta. Nada fica salvo: tudo desaparece quando você fechar a página.",
  "We couldn't sign you in with Google. Please try again.":
    "Não foi possível entrar com o Google. Tente novamente.",
  "Enter your e-mail and a password with at least 6 characters.":
    "Informe o e-mail e uma senha com pelo menos 6 caracteres.",
  "Check your e-mail to confirm your account.": "Confira seu e-mail para confirmar a conta.",
  "Wrong e-mail or password.": "E-mail ou senha incorretos.",
};


function fill(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? `{${k}}`));
}

export function useT() {
  const [lang] = useLang();
  return (text: string, vars?: Record<string, string | number>) =>
    fill(lang === "pt" ? (PT[text] ?? text) : text, vars);
}

/** Language toggle used in the top bars. */
export function LanguageToggle() {
  const [lang, set] = useLang();
  return (
    <div className="flex items-center overflow-hidden rounded-full border border-border bg-card">
      {(["en", "pt"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
