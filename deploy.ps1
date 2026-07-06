# ============================================
# SCRIPT DE DEPLOYMENT - Windows Server VPS
# SIGEP.com
# ============================================
# Uso: .\deploy.ps1
# Função: Transferir código, instalar, e iniciar aplicação

param(
    [string]$Action = "full"  # full, update, restart, status
)

# Configurações
$VPS_IP = "192.168.1.100"
$PROJECT_PATH = "C:\EDM"
$APP_NAME = "EDM"
$NODE_PORT = 3000

Write-Host "=====================================" -ForegroundColor Green
Write-Host "SCRIPT DE DEPLOYMENT - SIGEP.COM" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Ação: $Action" -ForegroundColor Yellow
Write-Host ""

# Função: Verificar se Node.js está instalado
function Check-NodeInstalled {
    Write-Host "Verificando Node.js..." -ForegroundColor Cyan
    
    try {
        $node_version = node --version 2>$null
        if ($node_version) {
            Write-Host "✅ Node.js instalado: $node_version" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
        return $false
    }
}

# Função: Instalar Node.js
function Install-Node {
    Write-Host "Instalando Node.js..." -ForegroundColor Yellow
    
    try {
        $url = "https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi"
        $installer = "$env:TEMP\node-installer.msi"
        
        Write-Host "Baixando Node.js..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
        
        Write-Host "Instalando..." -ForegroundColor Cyan
        msiexec /i $installer /passive
        
        Start-Sleep -Seconds 5
        
        Write-Host "✅ Node.js instalado" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Erro ao instalar Node.js: $_" -ForegroundColor Red
        return $false
    }
}

# Função: Instalar PM2
function Install-PM2 {
    Write-Host "Instalando PM2..." -ForegroundColor Yellow
    
    try {
        npm install -g pm2 --silent
        Write-Host "✅ PM2 instalado" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Erro ao instalar PM2: $_" -ForegroundColor Red
        return $false
    }
}

# Função: Criar diretória do projeto
function Create-ProjectDirectory {
    Write-Host "Preparando diretória do projeto..." -ForegroundColor Cyan
    
    if (-not (Test-Path $PROJECT_PATH)) {
        New-Item -ItemType Directory -Path $PROJECT_PATH -Force | Out-Null
        Write-Host "✅ Diretória criada: $PROJECT_PATH" -ForegroundColor Green
    } else {
        Write-Host "✅ Diretória existe: $PROJECT_PATH" -ForegroundColor Green
    }
}

# Função: Copiar arquivos
function Copy-ProjectFiles {
    Write-Host "Copiando arquivos do projeto..." -ForegroundColor Cyan
    
    # Assumindo que estamos a rodar este script localmente
    $local_path = Split-Path -Parent $PSCommandPath
    
    try {
        Copy-Item "$local_path\*" -Destination $PROJECT_PATH -Recurse -Force -Exclude @("node_modules", ".git", "deploy.ps1", "*.log")
        Write-Host "✅ Arquivos copiados" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Erro ao copiar: $_" -ForegroundColor Red
        return $false
    }
}

# Função: Instalar dependências
function Install-Dependencies {
    Write-Host "Instalando dependências (npm install)..." -ForegroundColor Yellow
    
    try {
        Push-Location $PROJECT_PATH
        npm install --production --silent
        Pop-Location
        
        Write-Host "✅ Dependências instaladas" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Erro ao instalar dependências: $_" -ForegroundColor Red
        Pop-Location
        return $false
    }
}

# Função: Criar diretória de logs
function Create-LogDirectory {
    Write-Host "Criando diretória de logs..." -ForegroundColor Cyan
    
    $log_path = "$PROJECT_PATH\logs"
    
    if (-not (Test-Path $log_path)) {
        New-Item -ItemType Directory -Path $log_path -Force | Out-Null
    }
    
    Write-Host "✅ Diretória de logs pronta: $log_path" -ForegroundColor Green
}

# Função: Parar aplicação existente
function Stop-Application {
    Write-Host "Parando aplicação existente..." -ForegroundColor Yellow
    
    try {
        pm2 stop $APP_NAME 2>$null
        pm2 delete $APP_NAME 2>$null
        Write-Host "✅ Aplicação parada" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Nenhuma aplicação anterior" -ForegroundColor Yellow
    }
}

# Função: Iniciar aplicação
function Start-Application {
    Write-Host "Iniciando aplicação com PM2..." -ForegroundColor Yellow
    
    try {
        Push-Location $PROJECT_PATH
        
        # Iniciar com PM2
        pm2 start server.js `
            --name $APP_NAME `
            --env production `
            --error "logs/error.log" `
            --out "logs/out.log" `
            --log-date-format "YYYY-MM-DD HH:mm:ss Z"
        
        Pop-Location
        
        Start-Sleep -Seconds 2
        
        Write-Host "✅ Aplicação iniciada" -ForegroundColor Green
        Write-Host "   Nome: $APP_NAME" -ForegroundColor Gray
        Write-Host "   Porta: $NODE_PORT" -ForegroundColor Gray
        
        return $true
    } catch {
        Write-Host "❌ Erro ao iniciar: $_" -ForegroundColor Red
        Pop-Location
        return $false
    }
}

# Função: Configurar auto-restart
function Configure-AutoRestart {
    Write-Host "Configurando auto-restart..." -ForegroundColor Cyan
    
    try {
        pm2 startup > $null 2>&1
        pm2 save > $null 2>&1
        Write-Host "✅ Auto-restart configurado" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "⚠️  Erro ao configurar auto-restart" -ForegroundColor Yellow
        return $false
    }
}

# Função: Verificar status
function Check-Status {
    Write-Host "Status atual:" -ForegroundColor Cyan
    Write-Host ""
    
    pm2 list
    
    Write-Host ""
    Write-Host "Logs:" -ForegroundColor Cyan
    pm2 logs $APP_NAME --lines 10 --nostream
}

# Função: Teste
function Test-Application {
    Write-Host "Testando aplicação..." -ForegroundColor Cyan
    
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$NODE_PORT" -UseBasicParsing -TimeoutSec 5
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Aplicação respondendo na porta $NODE_PORT" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  Status code: $($response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "⚠️  Erro no teste: $_" -ForegroundColor Yellow
        return $false
    }
}

# ============================================
# EXECUÇÃO PRINCIPAL
# ============================================

switch ($Action.ToLower()) {
    
    "full" {
        Write-Host "Executando FULL DEPLOYMENT..." -ForegroundColor Green
        Write-Host ""
        
        # 1. Verificar Node.js
        if (-not (Check-NodeInstalled)) {
            Install-Node
        }
        
        # 2. Instalar PM2
        Install-PM2
        
        # 3. Criar diretória
        Create-ProjectDirectory
        
        # 4. Copiar arquivos
        Copy-ProjectFiles
        
        # 5. Instalar dependências
        Install-Dependencies
        
        # 6. Criar logs
        Create-LogDirectory
        
        # 7. Parar antiga
        Stop-Application
        
        # 8. Iniciar nova
        Start-Application
        
        # 9. Auto-restart
        Configure-AutoRestart
        
        # 10. Testes
        Test-Application
        
        # 11. Status
        Write-Host ""
        Check-Status
    }
    
    "update" {
        Write-Host "Atualizando aplicação..." -ForegroundColor Green
        Write-Host ""
        
        Copy-ProjectFiles
        Install-Dependencies
        Stop-Application
        Start-Application
        Test-Application
        Check-Status
    }
    
    "restart" {
        Write-Host "Reiniciando aplicação..." -ForegroundColor Green
        Write-Host ""
        
        pm2 restart $APP_NAME
        Start-Sleep -Seconds 2
        Check-Status
    }
    
    "status" {
        Check-Status
    }
    
    default {
        Write-Host "Ações disponíveis:" -ForegroundColor Yellow
        Write-Host "  .\deploy.ps1 full     - Deploy completo" -ForegroundColor Gray
        Write-Host "  .\deploy.ps1 update   - Atualizar código" -ForegroundColor Gray
        Write-Host "  .\deploy.ps1 restart  - Reiniciar app" -ForegroundColor Gray
        Write-Host "  .\deploy.ps1 status   - Ver status" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETO!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Acesse: https://SIGEP.com" -ForegroundColor Cyan
