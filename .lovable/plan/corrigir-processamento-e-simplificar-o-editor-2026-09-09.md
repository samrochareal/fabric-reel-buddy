# Corrigir processamento e simplificar o editor

## Alterações
- Diagnosticar e corrigir o carregamento do motor de vídeo no desktop, garantindo progresso e conclusão do arquivo editado.
- Renomear a ferramenta “Texto” para “Título” e remover totalmente a opção de texto inferior da interface e da renderização.
- Manter a rolagem independente apenas no painel Título, ocultando visualmente a barra lateral.
- Mover “Resetar todas as edições” para logo abaixo de “Ajuste fino do vídeo”.

## Validação
- Processar um vídeo real no navegador em dimensão desktop e confirmar progresso, conclusão e download.
- Conferir o layout do editor e executar as verificações automáticas do projeto.

## Detalhes técnicos
- Tornar o carregamento do FFmpeg tolerante a falhas de worker/core no desktop, com fallback funcional e limpeza correta entre tentativas.
- Preservar o formato vertical 9:16 e todas as demais opções atuais.
