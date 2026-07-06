# 🚀 Setup Rápido: Windows Server VPS

## 📋 Informações do Seu Projeto

```
Domínio: SIGEP.com
IP VPS: 192.168.1.100
Porta: 3000
BD: SQL Server (localhost)
App: Node.js + Express
Gerenciador: PM2
```

---

## ⚡ PASSO 1: Conectar ao VPS (5 min)

### Via RDP (Windows)

```
Abra: Conexão de Área de Trabalho Remota
Server: 192.168.1.100
Username: Administrador
Password: [sua senha]
```

### Ou via SSH (se Linux habilitado)

```bash
ssh Administrator@192.168.1.100
```

---

## ⚡ PASSO 2: Instalar Node.js (10 min)

No VPS, abra **PowerShell como Administrador** e execute:

```powershell
# Baixar Node.js
Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi" `
    -OutFile "$env:TEMP\node-installer.msi"

# Instalar
msiexec /i "$env:TEMP\node-installer.msi" /passive

# Aguardar ~2 minutos
Start-Sleep -Seconds 120

# Verificar
node --version
npm --version
```

**Deve aparecer:**
```
v18.18.0
9.6.7
```

---

## ⚡ PASSO 3: Instalar PM2 (5 min)

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Verificar
pm2 --version

# Deve aparecer: 5.x.x
```

---

## ⚡ PASSO 4: Preparar Projeto (5 min)

```powershell
# Criar pasta do projeto
mkdir C:\EDM
cd C:\EDM

# Se tem acesso ao repositório Git:
git clone https://seu-repo.git .
# Ou copiar manualmente os arquivos

# Instalar dependências
npm install --production

# Criar pasta de logs
mkdir logs
```

---

## ⚡ PASSO 5: Verificar .env.production (2 min)

```powershell
# Ver o arquivo
type .env.production

# Deve conter:
# DB_SERVER=localhost
# DB_USER=sa
# DB_PASSWORD=12345
# DB_NAME=db_dlaudo_erp
# CORS_ORIGINS=https://SIGEP.com
```

---

## ⚡ PASSO 6: Testar Localmente (5 min)

```powershell
# Ir para pasta
cd C:\EDM

# Testar o servidor
npm run start:prod

# Deve aparecer:
# "Servidor rodando em port 3000"
# "BD conectada com sucesso"
```

✅ Se funcionar, pressione **Ctrl+C** para parar

---

## ⚡ PASSO 7: Iniciar com PM2 (5 min)

```powershell
cd C:\EDM

# Iniciar com PM2
pm2 start server.js --name "EDM" --env production

# Ver status
pm2 list

# Ver logs
pm2 logs EDM

# Deve aparecer algo como:
# [0] apps failed to start
# ou
# [0] apps successfully started
```

Se tiver erro, veja os logs:
```powershell
pm2 logs EDM --lines 20
```

---

## ⚡ PASSO 8: Auto-restart (5 min)

```powershell
# Configurar para reiniciar automaticamente
pm2 startup

# Copiar e executar o comando que aparecer

# Salvar configuração
pm2 save

# Verificar
pm2 list
```

---

## ⚡ PASSO 9: Configurar IIS (10 min)

### Abra o IIS Manager:

**Tecla Windows → "IIS" → Server Manager**

**Ou via PowerShell:**
```powershell
iisreset
```

### Criar Site no IIS:

1. **Clique em "Sites"** (esquerda)
2. **Clique em "Add Website"** (direita)

**Preencha:**
```
Site name: SIGEP
Physical path: C:\EDM
Binding: 
  - Tipo: http
  - IP: *
  - Porta: 80
  - Host name: SIGEP.com
```

3. **Clique OK**

### Configurar Reverse Proxy:

1. **Instalar "URL Rewrite" no IIS** (se não tiver)
   ```powershell
   # Via Web Platform Installer
   ```

2. **Criar regra de rewrite:**
   - Abra site "EDM"
   - Duplo clique em "URL Rewrite"
   - Clique "Add Rule"
   - Selecione "Reverse Proxy"
   - Inbound rule: `localhost:3000`
   - OK

---

## ⚡ PASSO 10: Certificado SSL/HTTPS (10 min)

### Instalar Let's Encrypt:

```powershell
# Instalar Certbot
choco install certbot -y

# Criar certificado
certbot certonly --standalone `
    -d SIGEP.com `
    -d www.SIGEP.com `
    --email admin@SIGEP.com

# Será criado em:
# C:\Certbot\live\SIGEP.com\
```

### Adicionar ao IIS:

1. **No IIS Manager → Sites → EDM → Bindings**
2. **Clique em "Add"**
3. **Preencha:**
   ```
   Tipo: https
   IP: *
   Porta: 443
   Host name: SIGEP.com
   Certificado: Selecionar o de Let's Encrypt
   ```
4. **OK**

---

## ⚡ PASSO 11: Firewall (5 min)

```powershell
# Permitir porta 80 (HTTP)
New-NetFirewallRule -DisplayName "HTTP" `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80

# Permitir porta 443 (HTTPS)
New-NetFirewallRule -DisplayName "HTTPS" `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443

# Permitir porta 3000 (Node.js - local apenas)
New-NetFirewallRule -DisplayName "Node.js" `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000

# Verificar
Get-NetFirewallRule -DisplayName "HTTP","HTTPS","Node.js" | Select Name, Enabled
```

---

## ⚡ PASSO 12: Apontar Domínio (Imediato)

### No seu registrador (GoDaddy, Namecheap, etc):

1. **DNS Manager**
2. **A Record (em branco ou @)**
3. **Valor: 192.168.1.100**
4. **Salvar**

⏰ **Esperar 5-30 minutos** para propagação

---

## ✅ TESTES FINAIS

### Testar localmente (no VPS):

```powershell
# 1. Testar HTTP
curl http://localhost

# 2. Testar HTTPS
curl https://localhost

# 3. Testar API
curl http://localhost:3000/api/activos

# 4. Ver PM2
pm2 list
pm2 logs EDM
```

### Testar externamente (seu PC):

```powershell
# 1. Acessar site
Start-Process "https://SIGEP.com"

# 2. Testar API
curl https://SIGEP.com/api/activos

# 3. Fazer login
# Acesse a página de login
```

---

## 🎯 Resultado Final

Quando completar:

```
✅ https://SIGEP.com acessível
✅ Frontend carregando
✅ API respondendo
✅ PM2 gerenciando processo
✅ Auto-restart configurado
✅ SSL/HTTPS ativo
✅ Firewall aberto
```

---

## 🆘 Se der Erro

### "PM2 não inicia"
```powershell
pm2 delete EDM
pm2 logs EDM --lines 50
# Ver mensagem de erro
```

### "BD não conecta"
```powershell
# Verificar arquivo .env.production
type .env.production

# Testar conexão
sqlcmd -S localhost -U sa -P 12345 -d db_dlaudo_erp
```

### "IIS não funciona"
```powershell
# Reiniciar IIS
iisreset /restart

# Ver logs
Get-EventLog -LogName Application -Newest 10
```

### "Domínio não resolve"
```powershell
# Aguardar propagação DNS
# Ou fazer flush:
ipconfig /flushdns

# Testar DNS
nslookup SIGEP.com
```

---

## 📞 Comandos Úteis

```powershell
# Ver status do Node.js
pm2 list
pm2 status
pm2 monit

# Ver logs
pm2 logs EDM
pm2 logs EDM --lines 100

# Reiniciar
pm2 restart EDM

# Parar
pm2 stop EDM

# Deletar
pm2 delete EDM

# Atualizar código
cd C:\EDM
git pull
npm install --production
pm2 restart EDM

# Ver processo
Get-Process node

# Ver porta 3000
netstat -ano | findstr :3000
```

---

## 📊 Checklist Final

- [ ] Node.js instalado
- [ ] PM2 instalado
- [ ] Projeto em C:\EDM
- [ ] `.env.production` com valores corretos
- [ ] `npm install --production` executado
- [ ] PM2 rodando (`pm2 list`)
- [ ] Testes locais funcionando
- [ ] IIS configurado
- [ ] Certificado SSL instalado
- [ ] Firewall aberto (80, 443)
- [ ] Domínio apontando para VPS
- [ ] Acesso externo funcionando

---

## 🎉 Sucesso!

Seu sistema está em produção em:
# **https://SIGEP.com**

