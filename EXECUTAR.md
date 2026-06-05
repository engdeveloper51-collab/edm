# 🚀 PRONTO PARA EXECUTAR

## ✅ Tudo já está configurado para porta 8080!

---

## 📝 Terminal 1 - NGINX

```powershell
cd C:\nginx
.\nginx.exe
```

**Esperado:**
```
(sem erros - nginx já está rodando)
```

---

## 📝 Terminal 2 - Sua Aplicação

```powershell
cd C:\Users\Marcos\Desktop\EDM
npm start
```

**Esperado:**
```
Server running on port 3000
```

---

## 🌐 Abra seu Navegador

```
https://localhost:8080
```

**⚠️ Clique em "Avançado" → "Continuar para localhost"** (certificado auto-assinado é normal)

---

## 🎯 Fluxo Completo:

```
Você (https://localhost:8080)
        ↓
      NGINX (porta 8080 → 8443)
        ↓
      Express (porta 3000)
```

---

## 🛑 Parar NGINX

```powershell
cd C:\nginx
.\nginx.exe -s stop
```

---

## ✨ É isso! Sucesso! 🎉
