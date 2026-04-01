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
- Cliente de dados no frontend: shim local para PostgreSQL (`app/scripts/local-db-client.js`)

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

## Execucao facil com Docker + PostgreSQL (recomendado para clientes)

1. Garanta que o Docker Desktop esteja instalado e em execucao.

2. Na raiz do projeto, suba os containers:
```bash
docker compose up -d --build
```

Ou no Windows, execute:
```text
Iniciar-Docker.bat
```

3. Acesse:
```text
http://localhost:3000
```

### O que o compose faz

- Sobe o banco PostgreSQL (`postgres:16-alpine`)
- Cria o banco `pharus`
- Executa automaticamente o script `sql/pharus_local.sql` na primeira inicializacao do volume
- Sobe o app Node.js conectado ao Postgres

### Credenciais padrao (Docker)

- DB Host: `localhost`
- DB Port: `5432`
- DB Name: `pharus`
- DB User: `postgres`
- DB Password: `postgres`

### Comandos uteis

Parar:
```bash
docker compose down
```

Parar e remover volumes (recria banco do zero no proximo `up`):
```bash
docker compose down -v
```

Ver logs:
```bash
docker compose logs -f app
docker compose logs -f db
```

## Deploy em cliente sem clonar projeto (via imagens GHCR)

Quando voce publicar as imagens, o cliente precisa apenas de:

- `docker-compose.client.yml`
- Docker instalado

### 1) Publicar imagens (feito por voce)

No seu ambiente de build, build e push da imagem da aplicacao:
```bash
docker build --build-arg APP_VERSION=<TAG_DA_VERSAO> -t ghcr.io/<SEU_USUARIO_GITHUB>/pharus-app:<TAG_DA_VERSAO> -f Dockerfile .
docker push ghcr.io/<SEU_USUARIO_GITHUB>/pharus-app:<TAG_DA_VERSAO>

# opcional: manter latest apontando para a mesma versao
docker tag ghcr.io/<SEU_USUARIO_GITHUB>/pharus-app:<TAG_DA_VERSAO> ghcr.io/<SEU_USUARIO_GITHUB>/pharus-app:latest
docker push ghcr.io/<SEU_USUARIO_GITHUB>/pharus-app:latest
```

Build e push da imagem do banco (com SQL embutido):
```bash
docker build -t ghcr.io/<SEU_USUARIO_GITHUB>/pharus-db:latest -f Dockerfile.db .
docker push ghcr.io/<SEU_USUARIO_GITHUB>/pharus-db:latest
```

Opcional (automacao via PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File .\Publicar-GHCR.ps1 -GithubUser <SEU_USUARIO_GITHUB> -Tag latest
```

Ao executar o script, ele pede o token de forma segura no prompt (sem expor no historico de comando).

### 2) No cliente final

1. Baixe apenas o arquivo `docker-compose.client.yml`
2. Edite as imagens para seu usuario/organizacao GHCR:
   - `ghcr.io/seu_usuario/pharus-app:latest`
   - `ghcr.io/seu_usuario/pharus-db:latest`
3. Suba:
```bash
docker compose -f docker-compose.client.yml up -d
```

4. Acesse:
```text
http://localhost:3000
```

### Observacoes importantes

- O SQL de inicializacao do banco roda apenas na primeira criacao do volume.
- Para checagem automatica de novas versoes na interface:
  - publique imagens do app com tag de versao (ex.: `v1.9.13-2026-04-01.1`)
  - configure no ambiente do app `PHARUS_UPDATE_REPO=<owner>/<repo>` (ex.: `rodrigoluiz1990/pharus`)
  - opcional para repositorio privado/rate limit: `PHARUS_UPDATE_GITHUB_TOKEN=<token>`
- Para resetar banco no cliente:
```bash
docker compose -f docker-compose.client.yml down -v
docker compose -f docker-compose.client.yml up -d
```

## Usuario inicial

- Email: `admin@pharus.local`
- Senha: `admin123`

## Estrutura relevante

- `backend/server.js` - API local + servidor de arquivos estaticos
- `sql/pharus_local.sql` - schema único e atualizado do sistema

- `app/scripts/local-db-client.js` - cliente local do banco para o frontend
- `pages/*.html` - paginas principais organizadas por pasta
- `*.html` na raiz - wrappers de redirecionamento para manter compatibilidade de URLs antigas





