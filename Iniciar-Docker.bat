@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo Pharus - Inicializacao com Docker
echo ==========================================
echo.

docker --version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker nao encontrado. Instale o Docker Desktop e tente novamente.
  pause
  exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker Compose nao disponivel. Atualize o Docker Desktop.
  pause
  exit /b 1
)

for %%P in (3000 5432) do (
  netstat -ano | findstr /R /C:":%%P .*LISTENING" >nul 2>&1
  if not errorlevel 1 (
    echo [AVISO] Porta %%P ja esta em uso neste computador.
  )
)

echo.
echo Iniciando containers...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao subir os containers.
  echo Verifique os logs com: docker compose logs -f
  pause
  exit /b 1
)

echo.
echo Containers iniciados com sucesso.
echo Acesse: http://localhost:3000
start "" http://localhost:3000/login.html
echo.
echo Para parar: docker compose down
echo Para resetar banco: docker compose down -v
pause
exit /b 0
