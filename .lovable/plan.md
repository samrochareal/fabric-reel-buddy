# Landing Page editável pelo master

## Objetivo
Transformar a landing page em conteúdo gerenciado pelo painel master, mantendo sua estrutura atual. No celular, mostrar uma versão mais curta, direta e focada nos benefícios principais.

## O que será implementado

### 1. Conteúdo centralizado da landing page
- Criar uma configuração estruturada com valores padrão para toda a página.
- Incluir textos do menu, abertura, benefícios, recursos, números, passos, públicos, perguntas frequentes, chamada final e rodapé.
- Manter quantidades e posições dos blocos fixas para preservar o design; o master altera somente o conteúdo.
- Usar automaticamente o nome, slogan, logo/ícone e identidade já definidos pelo master.

### 2. Versão móvel resumida
- Exibir textos móveis próprios e mais curtos na abertura e nas chamadas principais.
- No celular, destacar apenas os recursos essenciais e reduzir listas secundárias, números e perguntas frequentes.
- Manter acesso rápido ao login e aos principais benefícios, sem alterar a versão completa do desktop.

### 3. Nova opção “Landing Page” no painel master
- Adicionar uma área própria no menu lateral do painel.
- Organizar os campos por seção, com títulos claros e edição de todos os textos visíveis.
- Permitir editar as cores específicas da landing page sem afetar sua estrutura.
- Permitir enviar ou remover imagens para a abertura e para a chamada final, com prévia antes de salvar.
- Incluir campos específicos para o conteúdo reduzido do celular.
- Salvar toda a landing page em uma única ação, com aviso de sucesso ou erro.

### 4. Persistência e atualização
- Adicionar uma configuração pública de landing page às configurações da plataforma no Lovable Cloud.
- Manter leitura pública somente para exibição e escrita restrita ao master pelas regras já existentes.
- Após salvar, atualizar imediatamente a prévia aberta pelo master e fazer páginas públicas abertas buscarem mudanças automaticamente em intervalos curtos.
- Preservar valores padrão para instalações existentes e para campos ainda não preenchidos.

### 5. Validação
- Confirmar o painel master, salvamento, recarregamento e restauração dos dados.
- Validar a landing em desktop e celular, incluindo imagens, textos longos e ausência de sobreposição.
- Confirmar que login, navegação e identidade visual existente continuam funcionando.

## Detalhes técnicos
- Expandir `platform_settings` com um campo JSON para o conteúdo da landing, mantendo as permissões públicas de leitura e administrativas de escrita existentes.
- Criar tipos, normalização e valores padrão em um módulo dedicado, evitando que dados incompletos quebrem a página.
- Reutilizar React Query para cache, invalidação imediata e atualização periódica.
- Aplicar cores da landing por variáveis sem valores visuais soltos nos elementos.
- Usar os componentes de formulário já existentes no painel e manter o editor responsivo.
