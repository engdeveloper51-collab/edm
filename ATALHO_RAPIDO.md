# ⚡ ATALHO RÁPIDO: 3 PASSOS ATÉ O AR

## 📍 Localização Dos Arquivos Importantes

```
C:\Users\Marcos\Desktop\EDM\
├── 📄 COMECE_AQUI.md ............... ⭐ LEIA PRIMEIRO (2 min)
├── 📄 SETUP_VPS_RAPIDO.md .......... GUIA COMPLETO (20 min)
├── 📄 DEPLOYMENT_PRONTO.md ......... RESUMO (5 min)
│
├── 🔧 CONFIGURAÇÕES PRONTAS:
│   ├── .env.production ............ BD + JWT + CORS
│   ├── web.config ................. IIS + Reverse Proxy
│   ├── package.json ............... Scripts npm
│   ├── deploy.ps1 ................. Script PowerShell
│   └── Paginas/config.js .......... Frontend API
│
└── 📚 DOCUMENTAÇÃO EXTRA:
    ├── HOSTING_GUIDE.md ........... Guia completo
    ├── PRODUCAO_CONFIG.md ......... Templates
    └── FRONTEND_API_INTEGRATION.md  Como usar API
```

---

## 🚀 OS 3 PASSOS MAIS RÁPIDOS

### PASSO 1: Na Sua Máquina (5 min)

```powershell
# Abra PowerShell
cd C:\Users\Marcos\Desktop\EDM

# Teste localmente
npm run start:prod

# Resultado esperado:
# "Servidor rodando em port 3000"
# "BD conectada"

# Pressione Ctrl+C para parar
```

✅ Se funcionou, continue

---

### PASSO 2: No VPS (30 min)

**Conecte via RDP:**
```
IP: 192.168.1.100
User: Administrador
```

**No PowerShell (como Admin):**

```powershell
# 1. Instalar Node.js
Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi" -OutFile "$env:TEMP\node.msi"
msiexec /i "$env:TEMP\node.msi" /passive
Start-Sleep 120
node --version

# 2. Instalar PM2
npm install -g pm2

# 3. Preparar projeto
mkdir C:\EDM
cd C:\EDM
# (Copie os arquivos aqui via RDP/Git/FTP)

# 4. Instalar dependências
npm install --production

# 5. Testar
npm run start:prod
# (Ctrl+C para parar)

# 6. Iniciar com PM2
pm2 start server.js --name "EDM" --env production
pm2 list
```

✅ Se viu o app na lista, continue

---

### PASSO 3: Configurar Domínio + HTTPS (20 min)

**Ainda no VPS:**

```powershell
# 7. Configurar IIS (siga SETUP_VPS_RAPIDO.md Passo 9)
iisreset

# 8. Instalar Let's Encrypt (siga SETUP_VPS_RAPIDO.md Passo 10)
choco install certbot -y
certbot certonly --standalone -d SIGEP.com

# 9. Abrir Firewall
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443
```

**No seu Registrador (GoDaddy, etc):**

```
A Record: 192.168.1.100
(Aguarde 5-30 min para propagação)
```

---

## ✅ RESULTADO FINAL

Quando terminar:

```
✅ https://SIGEP.com
   ├─ Frontend carregando
   ├─ Login funcionando
   ├─ API respondendo
   ├─ HTTPS/SSL ativo
   └─ PM2 gerenciando
```

---

## 🎯 SE ALGO DER ERRADO

```powershell
# Ver logs
pm2 logs EDM --lines 50

# Reiniciar
pm2 restart EDM

# Deletar e restar
pm2 delete EDM
pm2 start server.js --name "EDM" --env production

# Ver se está rodando
Get-Process node
```

---

## 📋 INFORMAÇÕES IMPORTANTES

```
🌐 Domínio: SIGEP.com
🖥️ IP: 192.168.1.100
🔌 Porta: 3000 (Node)
🗄️ BD: db_dlaudo_erp
👤 DB User: sa
🔑 DB Pass: 12345
⚙️ Manager: PM2
🔒 SSL: Let's Encrypt
```

---

## 📖 GUIAS DE REFERÊNCIA

Se precisar de mais detalhes:

| Situação | Arquivo |
|----------|---------|
| Passo a passo completo | SETUP_VPS_RAPIDO.md |
| Resumo geral | DEPLOYMENT_PRONTO.md |
| Frontend API | FRONTEND_API_INTEGRATION.md |
| Guia detalhado | HOSTING_GUIDE.md |
| Troubleshooting | SETUP_VPS_RAPIDO.md (final) |

---

## ⏱️ TEMPO TOTAL

- Teste local: 5 min
- Setup Node/PM2: 20 min
- Deploy/IIS: 15 min
- SSL/Firewall: 10 min
- Domínio: Imediato (5-30 min propagação)

**TOTAL: ~1 hora** ⏰

---

## 🎬 COMECE AGORA!

### Opção 1: Leia Primeiro
👉 Abra **COMECE_AQUI.md**

### Opção 2: Direto ao Guia
👉 Abra **SETUP_VPS_RAPIDO.md**

### Opção 3: Copie os Comandos
👉 Use os 3 passos acima

---

## ✨ BOA SORTE! 🚀

Seu site estará online em:
# **https://SIGEP.com**

