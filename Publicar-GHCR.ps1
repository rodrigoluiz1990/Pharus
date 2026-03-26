param(
    [Parameter(Mandatory = $true)]
    [string]$GithubUser,

    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function Run-OrFail {
    param([string]$Command)
    Write-Host ">> $Command" -ForegroundColor DarkGray
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao executar: $Command"
    }
}

function Ensure-DockerEngine {
    Write-Step "Validando Docker Engine"
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw @"
Docker nao esta acessivel no momento.

Como corrigir:
1) Abra o Docker Desktop e aguarde o status 'Engine running'
2) Em Docker Desktop, habilite modo Linux containers
3) No PowerShell, teste: docker info
4) Rode novamente este script
"@
    }
}

$githubUserNormalized = $GithubUser.Trim().ToLower()
if (-not $githubUserNormalized) {
    throw "Parametro -GithubUser e obrigatorio."
}

$appImage = "ghcr.io/$githubUserNormalized/pharus-app:$Tag"
$dbImage = "ghcr.io/$githubUserNormalized/pharus-db:$Tag"

Write-Host "Publicacao de imagens no GHCR" -ForegroundColor White
Write-Host "Usuario: $githubUserNormalized" -ForegroundColor DarkGray
Write-Host "Tag: $Tag" -ForegroundColor DarkGray

Write-Step "Verificando Docker"
Run-OrFail "docker --version"
Run-OrFail "docker compose version"
Ensure-DockerEngine

Write-Step "Login seguro no GHCR"
$secureToken = Read-Host "Cole seu token GitHub (PAT classic) para o GHCR" -AsSecureString
$tokenPtr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
    $plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPtr)
}
finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPtr)
}

if (-not $plainToken) {
    throw "Token nao informado. Operacao cancelada."
}

$plainToken | docker login ghcr.io -u $githubUserNormalized --password-stdin
if ($LASTEXITCODE -ne 0) {
    throw "Falha no docker login para ghcr.io"
}
$plainToken = $null
$secureToken = $null

Write-Step "Build e push da imagem APP"
Run-OrFail "docker build -t $appImage -f Dockerfile ."
Run-OrFail "docker push $appImage"

Write-Step "Build e push da imagem DB"
Run-OrFail "docker build -t $dbImage -f Dockerfile.db ."
Run-OrFail "docker push $dbImage"

Write-Host ""
Write-Host "[OK] Publicacao concluida." -ForegroundColor Green
Write-Host "App: $appImage"
Write-Host "DB : $dbImage"
