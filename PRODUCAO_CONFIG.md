# Configuração para Produção no VPS

Este arquivo contém as mudanças necessárias para preparar seu projeto para produção.

---

## 1️⃣ Criar arquivo `.env.production`

Na raiz do projeto (C:\Users\Marcos\Desktop\EDM\), crie:

### Arquivo: `.env.production`

```env
# ==================== BANCO DE DADOS ====================
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=SuaSenhaDoSQLServer123!
DB_NAME=EDM
DB_PORT=1433

# ==================== APLICAÇÃO ====================
PORT=3000
NODE_ENV=production

# ==================== JWT ====================
JWT_SECRET=MudeIstoParaUmaChaveSecretaMuitoLongaEAleatoria123456789ABCDEF

# ==================== CORS ====================
# Quando estiver no VPS, ajuste para seu domínio real
CORS_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com

# ==================== SSL (Opcional - IIS cuida disso) ====================
# Se usar Let's Encrypt:
# SSL_KEY_PATH=/etc/ssl/private/seu-dominio-key.pem
# SSL_CERT_PATH=/etc/ssl/certs/seu-dominio.pem

# ==================== LOGS ====================
LOG_LEVEL=info
```

---

## 2️⃣ Adicionar scripts no `package.json`

Abra seu `package.json` e atualize a seção `scripts`:

### Antes:
```json
"scripts": {
  "test": "node --test",
  "start": "node server.js"
}
```

### Depois:
```json
"scripts": {
  "test": "node --test",
  "start": "node server.js",
  "start:prod": "NODE_ENV=production node server.js",
  "dev": "NODE_ENV=development nodemon server.js"
}
```

---

## 3️⃣ Arquivo: `web.config` (para IIS)

Crie na raiz do projeto:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <!-- URL Rewrite para redirecionar para Node.js -->
    <rewrite>
      <rules>
        <rule name="ReverseProxyNode" stopProcessing="true">
          <match url="^(.*)$" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="http://localhost:3000/{R:1}" logRewrittenUrl="true" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
          </serverVariables>
        </rule>
      </rules>
      <outboundRules>
        <rule name="OutboundRewriteResponse" stopProcessing="false">
          <match filterByTags="None" pattern="^http://localhost:3000/(.*)$" />
          <action type="Rewrite" value="http://localhost:3000/{R:1}" />
        </rule>
      </outboundRules>
    </rewrite>

    <!-- Headers de Segurança -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
      </customHeaders>
    </httpProtocol>

    <!-- Compressão -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />

    <!-- MIME Types -->
    <staticContent>
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
      <mimeMap fileExtension=".webp" mimeType="image/webp" />
    </staticContent>

  </system.webServer>
</configuration>
```

---

## 4️⃣ Script de Deployment: `deploy.ps1`

Crie na raiz do projeto:

```powershell
param(
    [string]$Environment = "production"
)

Write-Host "=== DEPLOYMENT EDM ===" -ForegroundColor Green
Write-Host "Ambiente: $Environment" -ForegroundColor Yellow

# 1. Instalar/atualizar dependências
Write-Host "`n[1] Instalando dependências..." -ForegroundColor Cyan
npm install --production

# 2. Verificar arquivo .env
if (-not (Test-Path ".env.$Environment")) {
    Write-Host "[ERRO] Arquivo .env.$Environment não encontrado!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Arquivo .env.$Environment encontrado" -ForegroundColor Green

# 3. PM2 - Parar instância anterior
Write-Host "`n[2] Configurando PM2..." -ForegroundColor Cyan
npx pm2 delete EDM 2>$null
Start-Sleep -Seconds 1

# 4. Iniciar nova instância
Write-Host "[3] Iniciando aplicação..." -ForegroundColor Cyan
$env:NODE_ENV = $Environment
npx pm2 start server.js --name "EDM" --log "logs/edm.log" --env $Environment

# 5. Salvar config PM2
Write-Host "[4] Salvando configuração PM2..." -ForegroundColor Cyan
npx pm2 save

# 6. Verificar status
Write-Host "`n[RESULTADO]" -ForegroundColor Green
npx pm2 list

Write-Host "`nDeployment concluído!" -ForegroundColor Green
```

---

## 5️⃣ Executar no VPS

Quando estiver no Windows Server:

```powershell
# 1. Ir para pasta do projeto
cd C:\EDM

# 2. Copiar arquivo de ambiente para produção
copy .env.production .env

# 3. Instalar dependências
npm install

# 4. Iniciar com PM2
npx pm2 start server.js --name "EDM" --env production

# 5. Verificar
npx pm2 list
npx pm2 logs EDM
```

---

## 🔧 Mudanças no `server.js` (Opcionais)

Se quiser aplicar essas mudanças no seu `server.js`:

### 1. Adicione no topo:

```javascript
require('dotenv').config({
    path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});
```

### 2. Atualize CORS:

```javascript
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'https://localhost:3000',
    'https://127.0.0.1:3000'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS não permitido'));
        }
    },
    credentials: true
}));
```

### 3. Adicione Health Check:

```javascript
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});
```

---

## 📋 Checklist

- [ ] `.env.production` criado com valores corretos
- [ ] `package.json` atualizado com scripts
- [ ] `web.config` criado na raiz
- [ ] `deploy.ps1` criado na raiz
- [ ] Testar localmente: `npm run start:prod`
- [ ] Transferir para VPS
- [ ] Executar deployment no VPS
- [ ] Verificar logs: `pm2 logs EDM`

---

## 🚀 Comandos Rápidos

```powershell
# Iniciar em produção
npm run start:prod

# Iniciar com PM2
npx pm2 start server.js --name "EDM" --env production

# Ver logs
npx pm2 logs EDM --lines 50

# Reiniciar
npx pm2 restart EDM

# Parar
npx pm2 stop EDM

# Remover
npx pm2 delete EDM
```

---

## 📞 Suporte

Consulte `HOSTING_GUIDE.md` para guia completo.

