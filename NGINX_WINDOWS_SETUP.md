# Instalar e Rodar NGINX no Windows - Passo a Passo

## 📥 PASSO 1: Baixar e Instalar NGINX

### Opção A: Com Package Manager (mais fácil)
```bash
winget install nginx
```

### Opção B: Download Manual
1. Acesse: http://nginx.org/en/download.html
2. Baixe a versão Windows (ex: `nginx-1.26.0.zip`)
3. Descompacte em `C:\nginx` (ou onde quiser)

---

## 🔧 PASSO 2: Copiar Arquivo de Configuração

1. Abra **File Explorer**
2. Navegue para: `C:\Users\Marcos\Desktop\EDM`
3. Copie o arquivo `nginx.conf`
4. Cole em: `C:\nginx\conf\` (sobrescreva o existente)
   - Se instalou com winget: `C:\Program Files\nginx\conf\`

---

## ▶️ PASSO 3: Iniciar NGINX

### Terminal 1 - Abra PowerShell como ADMINISTRADOR

```powershell
# Se instalou em C:\nginx
cd C:\nginx
.\nginx.exe

# Ou se instalou com winget
nginx.exe
```

### Terminal 2 - Abra novo PowerShell (NÃO precisa admin)

```powershell
cd C:\Users\Marcos\Desktop\EDM
npm start
```

---

## ✅ PASSO 4: Testar

Abra navegador e acesse:

```
https://localhost
```

**⚠️ Vai aparecer aviso de certificado?**
- Clique em "Avançado"
- Clique em "Continuar para localhost (não seguro)"
- Pronto! Você está conectando via NGINX + HTTPS

---

## 🛑 Comandos Úteis

```powershell
# Testar configuração (antes de iniciar)
cd C:\nginx
.\nginx.exe -t

# Recarregar sem parar (depois de editar nginx.conf)
.\nginx.exe -s reload

# Parar nginx
.\nginx.exe -s stop

# Ver processos nginx
Get-Process nginx

# Matar processo nginx (se travou)
Stop-Process -Name nginx -Force
```

---

## 🔍 Como Saber se está Funcionando?

1. **Terminal mostra:**
   ```
   npm start → "Server running on port 3000"
   ```

2. **Acesse:** `https://localhost`

3. **Deve abrir sua aplicação** (sem erro 404)

4. **Verifique logs:**
   - NGINX: `C:\nginx\logs\error.log`
   - NGINX: `C:\nginx\logs\access.log`

---

## ❓ Dúvidas Comuns

**P: Porta 80 já está em uso?**
```powershell
# Encontrar processo na porta 80
Get-NetTCPConnection -LocalPort 80 | Select-Object OwningProcess
Get-Process -Id <PID>
```

**P: Erro "permission denied"?**
- Abra PowerShell como ADMINISTRADOR

**P: NGINX não encontra arquivo `nginx.conf`?**
- Verifique caminho: `nginx.exe -t`
- Copie arquivo correto para `conf` folder

---

## 🎯 Fluxo Final:

```
PowerShell 1 (Admin)        PowerShell 2 (Normal)
    ↓                               ↓
cd C:\nginx              cd C:\Users\Marcos\Desktop\EDM
.\nginx.exe              npm start
    ↓                               ↓
 NGINX na porta 80       Express na porta 3000
    ↓                               ↓
  Você → https://localhost → NGINX → Express
```

Sucesso! 🎉
