# Pharus - Sistema de Controle de Tarefas

Sistema de gerenciamento de tarefas estilo Monday.com com autenticação de usuários e armazenamento em banco de dados.

## Funcionalidades

- Autenticação de usuários
- Quadro de tarefas com arrastar e soltar
- Visualização em tabela (estilo Socíus)
- Diferentes tipos de colunas personalizáveis
- CRUD completo de tarefas

## Tecnologias Utilizadas

- HTML5, CSS3, JavaScript (ES6+)
- LocalStorage (para demonstração)
- Supabase (banco de dados em produção)

## Como Executar

1. Clone o repositório
2. Abra o arquivo `index.html` em um navegador web
3. Para versão com banco de dados, configure as variáveis de ambiente do Supabase

## Estrutura do Projeto

- `index.html` - Página inicial com redirecionamento
- `login.html` - Página de autenticação
- `quadrodetarefas.html` - Aplicação principal
- `styles/` - Arquivos CSS organizados por funcionalidade
- `scripts/` - Módulos JavaScript separados por responsabilidade