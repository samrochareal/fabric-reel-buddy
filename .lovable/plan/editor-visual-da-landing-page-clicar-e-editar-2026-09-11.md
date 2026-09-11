# Editor visual da Landing Page (clicar e editar)

## Objetivo
Substituir o formulário atual de "Landing Page" no painel master por uma página de edição que mostra a própria landing page em tamanho real. O master escolhe se está editando a versão desktop ou a versão celular, clica direto no texto para alterar, arrasta blocos para mudar a ordem e salva. Campo em branco = elemento não aparece na landing.

## O que será feito

### 1. Uma única landing, dois modos
- A landing page passa a ser um bloco reutilizável, usado tanto na página pública quanto na tela de edição.
- Modo público: só exibe. Modo edição: os mesmos textos ficam clicáveis e editáveis no lugar.
- Assim, o que o master vê enquanto edita é exatamente o resultado final.

### 2. Página de edição
- Nova página aberta pelo item "Landing Page" do menu master (acesso só do master).
- Barra superior fixa com: botão desktop / celular, botão Salvar, botão Desfazer alterações e aviso de "alterações não salvas".
- No modo celular a landing é mostrada dentro de uma moldura estreita, com o conteúdo curto do celular; no modo desktop, em largura cheia.
- Clicar em qualquer texto (menu, títulos, descrições, botões, perguntas e respostas, números, rodapé) permite digitar ali mesmo.
- Campos de imagem (abertura e chamada final) têm botão para enviar, trocar e remover, com prévia imediata.
- As cores da landing continuam editáveis por seletores na barra lateral do editor.

### 3. Campo em branco esconde o elemento
- Todo texto vazio deixa de ser exibido na landing pública e no editor.
- Itens de lista (recursos, passos, públicos, perguntas, benefícios, números, selos da abertura) desaparecem quando ficam sem conteúdo; se a lista inteira ficar vazia, a seção some.
- Isso vale para os dois modos; no celular, os textos curtos vazios caem de volta para o texto completo se houver, senão o elemento não aparece.

### 4. Arrastar e soltar
- Arrastar para reordenar itens dentro de cada lista: recursos, passos, públicos, perguntas frequentes, benefícios, números e selos.
- Arrastar para reordenar as seções da landing (abertura, recursos, benefícios, como funciona, para quem é, perguntas, chamada final).
- Cada item ganha alça de arrastar visível apenas no editor, além de botões de subir/descer para funcionar bem no celular.
- Cada item e cada seção têm botão para excluir e um botão para adicionar novo item ao fim da lista.

### 5. Salvar e atualizar
- Um botão Salvar grava tudo de uma vez e mostra aviso de sucesso ou erro.
- Depois de salvar, a landing pública reflete as mudanças (a página já busca atualizações em intervalos curtos).
- Sair com alterações pendentes mostra confirmação.

## Detalhes técnicos
- Extrair `src/routes/index.tsx` para `src/components/landing/landing-view.tsx`, recebendo `content`, `branding`, `device: "desktop" | "mobile"` e `edit?: { onChange, dragging }`. A rota pública passa a renderizar esse componente sem `edit`.
- Componentes auxiliares: `EditableText` (span/heading com `contentEditable` controlado, placeholder no editor, `null` quando vazio no modo público) e `SortableList` (HTML5 drag events, sem nova dependência).
- Ampliar `LandingContent` em `src/lib/landing-content.ts` com `sections: string[]` (ordem das seções) e manter `normalizeLandingContent` preenchendo padrões e ordem ausente. Adicionar helper `visible(text)` para o corte de vazios.
- Nova rota `src/routes/_authenticated/landing-editor.tsx` com gate de master (mesma checagem usada em `admin.tsx`), estado local do conteúdo, `saveLandingContent` e `useRefreshBranding` após salvar.
- No `admin.tsx`, o item "Landing Page" do menu passa a navegar para a nova rota; o formulário antigo e o `LandingEditor` são removidos.
- `device` no editor controla largura da moldura e escolha dos textos curtos; a landing pública continua decidindo por breakpoints CSS.
- Validar com `bunx tsgo --noEmit`, log de build e uma passada de Playwright em desktop e 430px.
