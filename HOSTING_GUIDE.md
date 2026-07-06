# 🚀 Guia: Hospedar Sistema EDM no Windows Server VPS

## 📋 Resumo do Sistema Atual

**Arquitetura Atual (Local):**
```
Frontend + Backend + BD = 1 único servidor (localhost:3000)
```

**Arquitetura para Produção (VPS):**
```
Frontend (HTML/JS)  →  Backend (Node.js/Express)  →  SQL Server BD
http://seu-dominio.com    https://api.seu-dominio.com   Windows Server
```

---

## 🎯 3 Opções de Deployment

### ✅ OPÇÃO 1: Mais Simples (Recomendada para começar)
**Tudo num servidor VPS:**
- Frontend + Backend + BD no mesmo Windows Server
- Um único domínio: `https://seu-dominio.com`
- Fácil de configurar

### OPÇÃO 2: Separado (Mais Profissional)
**Frontend e Backend em servidores diferentes:**
- Frontend: estático (sem Node)
- Backend: API Node.js
- BD: SQL Server separado
- Dois domínios: `seu-dominio.com` e `api.seu-dominio.com`

### OPÇÃO 3: Cloud (Azure/AWS)
**Hospedagem gerenciada:**
- Mais caro mas sem preocupações
- Auto-escalável
- Backup automático

---

## ✅ OPÇÃO 1: Deployment Simples (1 VPS)

### Passo 1: Preparar o Código para Produção

#### 1.1 - Criar arquivo `.env.production`

```env
# Banco de Dados
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=SuaSenhaForte123!
DB_NAME=EDM
DB_PORT=1433

# Aplicação
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=MudeIstoParaUmaChaveSecretaMuitoLongggggg

# CORS - Seu domínio real
CORS_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com

# SSL
SSL_KEY_PATH=/etc/ssl/private/seu-dominio-key.pem
SSL_CERT_PATH=/etc/ssl/certs/seu-dominio.pem
```

#### 1.2 - Editar `server.js` para usar `.env`

Adicione no topo:
```javascript
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });
```

#### 1.3 - Atualizar `package.json`

```json
{
  "scripts": {
    "start": "node server.js",
    "start:prod": "NODE_ENV=production node server.js",
    "dev": "nodemon server.js"
  }
}
```

---

### Passo 2: Setup no Windows Server VPS

#### 2.1 - Instalar Dependências

```powershell
# Como Administrador

# Instalar Node.js
$url = "https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi"
Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\nodejs.msi"
msiexec /i "$env:TEMP\nodejs.msi" /passive

# Verificar
node -v
npm -v
```

#### 2.2 - Transferir Projeto para VPS

```powershell
# Via RDP, copie pasta do projeto para: C:\EDM
# Ou via Git:
cd C:\
git clone https://seu-repo.git EDM
cd EDM
npm install
```

#### 2.3 - Configurar `.env.production`

```powershell
notepad C:\EDM\.env.production
# Edite com dados reais do seu VPS
```

#### 2.4 - Testar Localmente no VPS

```powershell
cd C:\EDM
node server.js
# Ou
npm run start:prod
```

**Se funcionar:**
```
✅ Conectado ao SQL Server!
✅ Servidor rodando em https://localhost:3000
```

---

### Passo 3: Configurar PM2 (Gerenciador de Processos)

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação com PM2
pm2 start server.js --name "EDM" --env production

# Ver status
pm2 list

# Ver logs
pm2 logs EDM

# Auto-iniciar ao rebootar
pm2 startup
pm2 save

# Parar/reiniciar
pm2 restart EDM
pm2 stop EDM
pm2 delete EDM
```

---

### Passo 4: Configurar IIS como Reverse Proxy

#### 4.1 - Habilitar IIS

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName IIS-URLRewrite -NoRestart
Restart-Computer
```

#### 4.2 - Criar site no IIS Manager

1. Abra `inetmgr`
2. Clique em **Sites** → **Add Website**
3. Preenchã:
   - **Site name:** EDM
   - **Physical path:** `C:\EDM`
   - **Binding Type:** https
   - **Port:** 443
   - **Certificate:** Seu certificado SSL

#### 4.3 - Criar `web.config` para reverse proxy

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyNode" stopProcessing="true">
          <match url="^(.*)$" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

### Passo 5: Certificado SSL/HTTPS

#### Opção A: Let's Encrypt (GRÁTIS, recomendado)

```powershell
# Instalar Certbot
choco install certbot -y

# Gerar certificado
certbot certonly --standalone -d seu-dominio.com -d www.seu-dominio.com

# Certificados em: C:\Certbot\live\seu-dominio.com\
```

#### Opção B: Auto-assinado (apenas desenvolvimento)

```powershell
$cert = New-SelfSignedCertificate -CertstoreLocation cert:\localmachine\my `
    -DnsName "seu-dominio.com" -FriendlyName "EDM-Cert"
```

---

### Passo 6: Configurar Firewall

```powershell
# Como Administrador

# Abrir HTTPS
New-NetFirewallRule -DisplayName "Allow HTTPS 443" `
    -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# Abrir HTTP (redirecionamento)
New-NetFirewallRule -DisplayName "Allow HTTP 80" `
    -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Bloquear porta 3000 externamente
New-NetFirewallRule -DisplayName "Block Node Port" `
    -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Block
```

---

### Passo 7: Configurar Domínio

1. Aponte seu domínio para o IP do VPS no registrador DNS
2. Aguarde propagação (até 24h)
3. Teste: `https://seu-dominio.com`

---

## 📱 Frontend Consumir API Remota

### Opção A: Mesma URL (Recomendado)

Se frontend e backend estão no mesmo domínio:

```javascript
// Sem mudanças necessárias!
// Manter URLs relativas
fetch('/api/activos')
```

### Opção B: Domínios Diferentes

Se usar `api.seu-dominio.com`:

```javascript
// No frontend, mudar para URL absoluta
const API_BASE_URL = 'https://api.seu-dominio.com';

fetch(`${API_BASE_URL}/api/activos`)
```

### Opção C: Environment Variables

```javascript
// Em arquivo config.js
const API_BASE = process.env.REACT_APP_API_URL || 'https://seu-dominio.com';

export const API = {
  ACTIVOS: `${API_BASE}/api/activos`,
  // ...
};
```

---

## 🔒 Segurança em Produção

### Checklist de Segurança

- [ ] JWT_SECRET é uma string forte (32+ caracteres)
- [ ] CORS está configurado apenas para seu domínio
- [ ] Firewall bloqueia porta 3000
- [ ] HTTPS/SSL ativado
- [ ] SQL Server tem senha forte
- [ ] Backups automáticos configurados
- [ ] Logs monitorados

### Desabilitar Debug em Produção

```javascript
// Em server.js
if (process.env.NODE_ENV === 'production') {
    app.use((err, req, res, next) => {
        res.status(500).json({
            success: false,
            message: 'Erro interno'
            // Não enviar detalhes do erro
        });
    });
}
```

---

## 📊 Monitoramento

### Ver Logs Tempo Real

```powershell
pm2 logs EDM --lines 100
```

### Monitorar Recursos

```powershell
pm2 monit
```

### Alertas

```powershell
pm2 install pm2-auto-pull
pm2 install pm2-logrotate
```

---

## 🔄 CI/CD (Opcional)

### Deploy Automático via GitHub Actions

Crie arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to VPS
        run: |
          # Script de deploy via SSH
          ssh user@seu-vps-ip "cd /C/EDM && git pull && npm install && pm2 restart EDM"
```

---

## 🆘 Troubleshooting

| Erro | Solução |
|------|---------|
| Port 3000 já em uso | `netstat -ano \| findstr :3000` → `taskkill /PID XXX /F` |
| BD não conecta | Verificar credenciais em `.env.production` |
| CORS error | Adicionar domínio em `CORS_ORIGINS` |
| SSL inválido | Renovar certificado Let's Encrypt |
| PM2 não inicia | `pm2 start server.js --name EDM` |

---

## 📋 Checklist Final

- [ ] Node.js instalado no VPS
- [ ] Projeto transferido para `C:\EDM`
- [ ] `.env.production` configurado
- [ ] SQL Server acessível
- [ ] PM2 rodando (`pm2 list`)
- [ ] IIS configurado como reverse proxy
- [ ] SSL/HTTPS funcionando
- [ ] Domínio apontando para VPS
- [ ] Firewall configurado
- [ ] Testes funcionando em `https://seu-dominio.com`

---

## 🚀 Próximos Passos

1. **Hoje:** Seguir os passos 1-7 acima
2. **Amanhã:** Testar em produção
3. **Semana:** Configurar backups
4. **Mês:** Monitoramento e otimizações

---

## 📞 Referências

- Node.js: https://nodejs.org
- PM2: https://pm2.keymetrics.io
- Let's Encrypt: https://letsencrypt.org
- IIS: https://docs.microsoft.com/iis

