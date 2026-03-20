# Pharus - Sistema de Controle de Tarefas

Sistema de gerenciamento de tarefas estilo Monday.com com autenticacao de usuarios e persistencia em PostgreSQL local.

## Funcionalidades

- Autenticacao de usuarios
- Quadro de tarefas com arrastar e soltar
- Visualizacao em tabela
- CRUD completo de tarefas
- Filtros por status, prioridade, tipo, responsavel, titulo, cliente e periodo

## Stack atual

- Frontend: HTML, CSS, JavaScript
- Backend local: Node.js + Express
- Banco de dados: PostgreSQL
- Cliente de dados no frontend: shim compativel com API de Supabase (`scripts/local-supabase-client.js`)

## Execucao local com PostgreSQL

1. Crie o banco no PostgreSQL:
```sql
CREATE DATABASE pharus;
```

2. Execute o script de schema e dados iniciais:
```bash
psql -U postgres -d pharus -f sql/pharus_local.sql
```

3. Configure variaveis de ambiente:
```bash
cp .env.example .env
```
Edite `.env` com usuario/senha do seu PostgreSQL.

4. Instale dependencias:
```bash
npm install
```

5. Inicie o servidor:
```bash
npm run dev
```

6. Acesse:
```text
http://localhost:3000
```

## Usuario inicial

- Email: `admin@pharus.local`
- Senha: `admin123`

## Estrutura relevante

- `backend/server.js` - API local + servidor de arquivos estaticos
- `sql/pharus_local.sql` - schema/tabelas/views/seeds
- `scripts/local-supabase-client.js` - cliente compativel para o frontend
- `login.html`, `quadrodetarefas.html`, `users.html` - paginas principais
