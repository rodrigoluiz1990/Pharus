param(
    [string]$ProjectName = "pharus_prod",
    [int[]]$Ports = @(3000, 5432),
    [string[]]$ContainerNames = @("pharus_app", "pharus_db")
)

$ErrorActionPreference = "Stop"

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[AVISO] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[ERRO] $Message" -ForegroundColor Red
}

function Run-Cmd {
    param([string]$Command)
    try {
        return Invoke-Expression $Command
    } catch {
        return $null
    }
}

$hasCritical = $false
$warnings = New-Object System.Collections.Generic.List[string]

Write-Host "Validacao de ambiente Docker (pre-deploy)" -ForegroundColor White
Write-Host "Projeto Compose: $ProjectName" -ForegroundColor DarkGray

Write-Section "Dependencias Docker"
$dockerVersion = Run-Cmd "docker --version 2>$null"
if (-not $dockerVersion) {
    Write-Err "Docker nao encontrado ou indisponivel."
    exit 1
}
Write-Ok "$dockerVersion"

$composeVersion = Run-Cmd "docker compose version 2>$null"
if (-not $composeVersion) {
    Write-Err "Docker Compose nao encontrado."
    exit 1
}
Write-Ok "$composeVersion"

Write-Section "Containers em execucao"
$running = Run-Cmd 'docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"'
if ($running) {
    $running | ForEach-Object { Write-Host $_ }
} else {
    Write-Warn "Nao foi possivel listar containers em execucao."
}

Write-Section "Conflito de portas"
$listeningRaw = Run-Cmd "netstat -ano -p tcp | findstr LISTENING"
foreach ($port in $Ports) {
    $matches = @()
    if ($listeningRaw) {
        $matches = $listeningRaw | Where-Object { $_ -match "[:\.]$port\s" }
    }

    if ($matches.Count -gt 0) {
        $warnings.Add("Porta $port ja esta em uso.")
        Write-Warn "Porta $port esta em uso:"
        $matches | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Ok "Porta $port livre."
    }
}

Write-Section "Conflito de nomes de container"
$allContainerNames = Run-Cmd 'docker ps -a --format "{{.Names}}"'
foreach ($name in $ContainerNames) {
    if ($allContainerNames -and ($allContainerNames -contains $name)) {
        $warnings.Add("Container com nome '$name' ja existe.")
        Write-Warn "Container '$name' ja existe no host."
    } else {
        Write-Ok "Nome '$name' disponivel."
    }
}

Write-Section "Recursos e armazenamento Docker"
$stats = Run-Cmd "docker stats --no-stream --format ""table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"""
if ($stats) {
    $stats | ForEach-Object { Write-Host $_ }
} else {
    Write-Warn "Nao foi possivel coletar docker stats."
}

$disk = Run-Cmd "docker system df"
if ($disk) {
    Write-Host ""
    $disk | ForEach-Object { Write-Host $_ }
} else {
    Write-Warn "Nao foi possivel coletar uso de disco Docker."
}

Write-Section "Redes e volumes existentes"
$networks = Run-Cmd 'docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"'
if ($networks) {
    $networks | ForEach-Object { Write-Host $_ }
}
$volumes = Run-Cmd 'docker volume ls --format "table {{.Name}}\t{{.Driver}}"'
if ($volumes) {
    Write-Host ""
    $volumes | ForEach-Object { Write-Host $_ }
}

Write-Section "Validacao do docker-compose"
$composeConfig = Run-Cmd "docker compose -p $ProjectName config 2>&1"
if (-not $composeConfig) {
    $hasCritical = $true
    Write-Err "Falha ao validar docker compose config."
} else {
    if (($composeConfig | Out-String) -match "error|invalid|unsupported|failed") {
        $hasCritical = $true
        Write-Err "Possivel problema no docker-compose detectado."
        $composeConfig | ForEach-Object { Write-Host $_ }
    } else {
        Write-Ok "docker compose config validado com sucesso."
    }
}

Write-Section "Resumo"
if ($warnings.Count -eq 0 -and -not $hasCritical) {
    Write-Ok "Ambiente pronto para subir novo stack."
    exit 0
}

if ($warnings.Count -gt 0) {
    Write-Warn "Riscos encontrados:"
    $warnings | ForEach-Object { Write-Host " - $_" }
}

if ($hasCritical) {
    Write-Err "Existem erros criticos. Corrija antes de subir o deploy."
    exit 2
}

Write-Warn "Ambiente com alertas. Suba somente apos revisar os pontos acima."
exit 0
