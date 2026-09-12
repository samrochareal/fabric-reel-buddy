# Criador visual da Landing Page

## Objetivo
Transformar o editor atual em um criador de páginas com uma área de visualização central e um painel lateral. O master seleciona um elemento na página e todas as opções daquele elemento aparecem somente no painel.

## O que será feito

### 1. Painel lateral contextual
- Remover os controles sobrepostos aos elementos da página.
- Um clique seleciona texto, botão, imagem, item, cabeçalho, rodapé ou seção e abre suas opções na lateral.
- O elemento selecionado recebe apenas um contorno visual discreto na prévia.
- O painel permitirá editar conteúdo, ocultar/mostrar, excluir quando aplicável e trocar imagens.

### 2. Links e aparência por elemento
- Textos, botões e itens selecionáveis poderão receber um endereço clicável, incluindo páginas internas, âncoras e links externos.
- Adicionar controles de cor do texto, cor de fundo, tamanho, largura e alinhamento, com opção de voltar ao padrão visual.
- As alterações serão aplicadas imediatamente na prévia e respeitarão desktop e celular.

### 3. Adicionar e reorganizar
- O painel terá “Adicionar elemento”, oferecendo os tipos compatíveis com a seção selecionada: texto, botão, item, pergunta, número ou imagem.
- Seções e elementos repetidos continuarão aceitando arrastar e soltar, agora sem botões flutuantes sobre o conteúdo.
- O painel mostrará subir, descer, duplicar e excluir para reposicionamento acessível também no celular.
- A organização será responsiva: reposicionamento significa alterar a ordem dentro da seção, evitando posições livres que quebrariam a página em outras telas.

### 4. Compatibilidade e publicação
- Ampliar o conteúdo salvo com configurações opcionais por elemento; páginas já salvas continuarão usando o visual atual.
- Links serão inativos durante a edição para não tirar o master do editor e funcionarão normalmente para visitantes.
- O botão Salvar continuará gravando tudo de uma vez e atualizará a landing pública para todos.

## Detalhes técnicos
- Adicionar ao `LandingContent` mapas opcionais de links e estilos, normalizados com valores vazios para compatibilidade.
- Fazer `LandingView` emitir uma seleção tipada para a rota do editor, em vez de renderizar edição de texto e ações dentro da página.
- Criar um painel lateral fixo na rota do editor com formulários específicos por tipo de seleção e uma lista estrutural para inserção e ordem.
- Manter o arrastar HTML5 existente, corrigindo os índices após filtros e centralizando mutações de lista para seleção, duplicação, inclusão e remoção.
- Validar compilação, estado salvo, links públicos e visual em desktop e 430px.