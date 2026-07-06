# 🚀 Deployment Rápido: Passo a Passo

## 📊 Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│  SEU PROJETO LOCAL                                      │
│  ✅ Frontend (HTML/JS)                                  │
│  ✅ Backend (Node.js + Express)                         │
│  ✅ BD (SQL Server)                                     │
│  ✅ Tudo funcionando em http://localhost:3000           │
└────────────┬────────────────────────────────────────────┘
             │
             │ DEPLOYMENT
             ▼
┌─────────────────────────────────────────────────────────┐
│  WINDOWS SERVER VPS                                     │
│  ✅ Frontend (mesmos arquivos HTML/JS)                  │
│  ✅ Backend (PM2 + Node.js)                             │
│  ✅ BD (SQL Server)                                     │
│  ✅ Domínio: https://seu-dominio.com                    │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ 5 Passos Rápidos

### 📝 PASSO 1: Preparar Código (10 min)

**No seu computador local:**

```bash
# 1. Criar arquivo .env.production
# Copie e adapte:

DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=SuaSenha123!
DB_NAME=EDM
PORT=3000
NODE_ENV=production
JWT_SECRET=ChaveSecretaMuitoLongga123456789
CORS_ORIGINS=https://seu-dominio.com
```

**Atualizar `package.json`:**
```json
"scripts": {
  "start": "node server.js",
  "start:prod": "NODE_ENV=production node server.js"
}
```

**Criar `web.config`** (veja arquivo PRODUCAO_CONFIG.md)

---

### 🖥️ PASSO 2: Preparar VPS (20 min)

**No Windows Server VPS:**

```powershell
# 1. Instalar Node.js
Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi" `
    -OutFile "$env:TEMP\nodejs.msi"
msiexec /i "$env:TEMP\nodejs.msi" /passive

# 2. Instalar PM2 globalmente
npm install -g pm2

# 3. Criar pasta do projeto
mkdir C:\EDM
cd C:\EDM
```

---

### 📦 PASSO 3: Transferir Projeto (10 min)

**Via RDP:** Copie pasta do projeto para `C:\EDM` no VPS

**Ou via Git:**
```powershell
cd C:\
git clone https://seu-repo.git EDM
cd EDM
npm install
```

---

### ⚙️ PASSO 4: Configurar e Testar (15 min)

**No VPS:**

```powershell
cd C:\EDM

# 1. Copiar .env.production para .env
copy .env.production .env

# 2. Instalar dependências
npm install --production

# 3. Testar localmente
npm run start:prod

# Se tudo OK, pressione Ctrl+C
```

---

### 🚀 PASSO 5: Deploy com PM2 (5 min)

**No VPS:**

```powershell
# 1. Iniciar com PM2
pm2 start server.js --name "EDM" --env production

# 2. Ver status
pm2 list

# 3. Ver logs
pm2 logs EDM

# 4. Salvar config para auto-iniciar no reboot
pm2 startup
pm2 save
```

---

## 🌐 Configurar Domínio (5-15 min)

### No Registrador do Seu Domínio (GoDaddy, Namecheap, etc)

1. Aponte seu domínio para o **IP do VPS**
2. Aguarde propagação (até 24h)
3. Configure **SSL/HTTPS** (Let's Encrypt gratuito)

---

## 🔒 Configurar HTTPS/SSL (10 min)

```powershell
# 1. Instalar Let's Encrypt
choco install certbot -y

# 2. Gerar certificado (se domínio já apontando)
certbot certonly --standalone -d seu-dominio.com

# 3. Copiar certificado para `server.js`
# Ou usar IIS como reverse proxy
```

---

## 🔄 Como o Frontend Funciona Automaticamente

**Seu JavaScript já funciona em ambos os ambientes:**

```javascript
// Este código se adapta automaticamente:
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : `https://${window.location.hostname}`;

// Desenvolvimento: http://localhost:3000/api/activos
// Produção: https://seu-dominio.com/api/activos
fetch(`${API_BASE}/api/activos`);
```

**NÃO precisa mudar código JavaScript!** 🎉

---

## ✅ Checklist Final

- [ ] `.env.production` criado com valores corretos
- [ ] `web.config` criado
- [ ] Node.js instalado no VPS
- [ ] Projeto transferido para `C:\EDM`
- [ ] `npm install` executado
- [ ] Teste local funcionou
- [ ] PM2 rodando
- [ ] Domínio apontando para VPS
- [ ] HTTPS/SSL configurado
- [ ] Acesso em `https://seu-dominio.com` ✅

---

## 🆘 Troubleshooting

| Erro | Solução |
|------|---------|
| `Cannot find module` | Execute `npm install --production` |
| Port 3000 já em uso | `pm2 delete EDM` depois `pm2 start server.js --name EDM` |
| BD não conecta | Verificar `.env` com credenciais corretas |
| `PM2 not found` | `npm install -g pm2` |
| Domínio não resolve | Aguarde propagação DNS (até 24h) |
| CORS error | Adicionar domínio em `.env` `CORS_ORIGINS` |

---

## 📞 Documentação Completa

Consulte estes arquivos para mais detalhes:

- **HOSTING_GUIDE.md** - Guia detalhado de deployment
- **PRODUCAO_CONFIG.md** - Configurações de produção
- **FRONTEND_API_INTEGRATION.md** - Como usar API no frontend
- **TESTING_GUIDE.md** - Testar endpoints

---

## 🎯 Resultado Final

Quando completar:

```
✅ https://seu-dominio.com funciona
✅ Frontend (HTML/JS) servido pelo servidor
✅ API disponível em /api/*
✅ Banco de dados conectado
✅ HTTPS/SSL ativo
✅ PM2 gerenciando aplicação
✅ Auto-restart no reboot
```

---

## 🚀 Próximos Passos Avançados

1. **Backups automáticos** (SQL Server)
2. **Monitoramento** (PM2 Plus)
3. **CI/CD** (GitHub Actions)
4. **CDN** (Cloudflare)
5. **Load Balancing** (múltiplos servidores)

---

**Tempo estimado total: 1-2 horas** ⏱️

**Tempo de downtime: 10-15 minutos** 📉

