# Pharus Post-it (Chrome Extension)

## Modo barra lateral (Side Panel)

1. Abra `chrome://extensions` no Chrome.
2. Ative o modo desenvolvedor.
3. Clique em **Carregar sem compactacao**.
4. Selecione a pasta `chrome-extension` deste projeto.
5. Clique no icone da extensao: o Chrome abre a barra lateral do Pharus Post-it.

## Configuracoes (engrenagem no topo)

- Clique no botao `⚙` para mostrar/ocultar configuracoes.
- Defina:
  - Servidor: `http://localhost:3000`
  - E-mail do responsavel: seu e-mail no Pharus
  - Limite: quantidade de tarefas foco
- Clique em **Salvar**.

## Uso

- A barra lateral mostra tarefas foco em modo compacto (titulo + metadados).
- Clique em uma tarefa para abrir o detalhe no Pharus completo.
- Clique em **Abrir painel completo** para abrir o quadro inteiro.

## Endpoint usado

- `GET /api/tasks/focus?email=<email>&limit=<n>`

## Observacoes

- O backend do Pharus deve estar rodando (`npm.cmd run dev`).
- Se alterar a porta, ajuste no campo Servidor.
