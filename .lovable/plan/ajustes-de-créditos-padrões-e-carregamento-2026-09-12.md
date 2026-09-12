# Ajustes de créditos, padrões e carregamento

## Objetivo
Corrigir os quatro comportamentos solicitados sem alterar o restante da experiência.

## O que será feito
- Mostrar o contador superior como créditos utilizados/créditos disponíveis, mantendo o aviso regressivo quando não houver créditos.
- Salvar as configurações de “System defaults for all users” no banco, recarregá-las no painel e aplicá-las automaticamente a cada novo usuário até a próxima alteração do master.
- Adicionar um controle de ocultar/mostrar em cada link do menu lateral, ao lado da exclusão, preservando o link salvo quando estiver oculto.
- Manter a landing page vazia durante a leitura das configurações públicas, exibindo diretamente a versão salva pelo master sem conteúdo padrão intermediário.

## Detalhes técnicos
- Ampliar as configurações globais com um objeto de padrões de conta e atualizar a criação de perfis para consumi-lo.
- Manter compatibilidade com links já salvos, tratando `hidden` ausente como visível.
- Validar compilação, persistência e as telas afetadas.