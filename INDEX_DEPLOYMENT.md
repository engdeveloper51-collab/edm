# 📚 Índice Completo: Hospedar Sistema EDM no VPS

## 🎯 Objetivo
Levar seu sistema EDM (que funciona localmente) para produção num **Windows Server VPS**.

---

## 📖 Documentação Criada

### 🟢 COMECE POR AQUI
1. **[QUICK_DEPLOYMENT.md](QUICK_DEPLOYMENT.md)** ← **LEIA ISTO PRIMEIRO**
   - 5 passos rápidos
   - Tempo estimado: 1-2 horas
   - Ideal para deploy rápido

---

### 🟡 GUIAS DETALHADOS

2. **[HOSTING_GUIDE.md](HOSTING_GUIDE.md)** - Guia Completo
   - 7 passos detalhados
   - 3 opções de arquitetura
   - Troubleshooting completo

3. **[PRODUCAO_CONFIG.md](PRODUCAO_CONFIG.md)** - Configurações
   - `.env.production` template
   - Scripts de deployment
   - Instruções passo a passo

4. **[FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md)** - Frontend
   - Como chamar API no frontend
   - Configuração dinâmica
   - Exemplos de código

---

## 🗂️ Estrutura de Decisão

```
┌─ Seu Sistema Local (Funcionando)
│
├─ PERGUNTA 1: Qual é o melhor primeiro passo?
│  └─ RESPOSTA: Leia QUICK_DEPLOYMENT.md (5 minutos)
│
├─ PERGUNTA 2: Preciso de mais detalhes?
│  └─ RESPOSTA: Leia HOSTING_GUIDE.md (20 minutos)
│
├─ PERGUNTA 3: Como configurar .env para produção?
│  └─ RESPOSTA: Veja PRODUCAO_CONFIG.md (10 minutos)
│
├─ PERGUNTA 4: O frontend não conecta à API?
│  └─ RESPOSTA: Veja FRONTEND_API_INTEGRATION.md (15 minutos)
│
└─ RESULTADO: Sistema em Produção ✅
```

---

## 🎬 Workflow Recomendado

### Semana 1: Preparação
- [ ] Ler QUICK_DEPLOYMENT.md
- [ ] Preparar `.env.production`
- [ ] Criar `web.config`
- [ ] Testar localmente com `npm run start:prod`

### Semana 2: Deploy
- [ ] Comprar/acessar Windows Server VPS
- [ ] Instalar Node.js no VPS
- [ ] Transferir projeto
- [ ] Configurar PM2
- [ ] Testar em produção

### Semana 3: Produção
- [ ] Apontar domínio
- [ ] Configurar SSL/HTTPS
- [ ] Monitorar com PM2
- [ ] Backups automáticos

---

## 📋 Checklist Pré-Deployment

### Frontend
- [ ] HTML/JS funciona localmente
- [ ] API chamadas usam URLs relativas ou dinâmicas
- [ ] Sem hardcode de `localhost`

### Backend
- [ ] `server.js` funciona com `npm run start:prod`
- [ ] `.env.production` criado
- [ ] `package.json` tem scripts corretos
- [ ] `web.config` criado

### VPS
- [ ] Node.js instalado
- [ ] SQL Server acessível
- [ ] Firewall aberto para porta 443
- [ ] Domínio pronto

---

## 🔧 Arquivos a Criar/Modificar

| Arquivo | Ação | Ref |
|---------|------|-----|
| `.env.production` | Criar | PRODUCAO_CONFIG.md |
| `package.json` | Atualizar scripts | PRODUCAO_CONFIG.md |
| `web.config` | Criar (na raiz) | PRODUCAO_CONFIG.md |
| `deploy.ps1` | Criar (na raiz) | PRODUCAO_CONFIG.md |
| `Paginas/config.js` | Criar (frontend) | FRONTEND_API_INTEGRATION.md |

---

## 🚀 Comandos Principais

```powershell
# Preparação Local
npm run start:prod

# No VPS
npm install --production
pm2 start server.js --name "EDM" --env production
pm2 logs EDM
pm2 restart EDM

# Monitorar
pm2 list
pm2 monit
```

---

## 🎯 Arquitetura Final

```
┌──────────────────────────────────────────────┐
│  WINDOWS SERVER VPS (seu-dominio.com)        │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ IIS (Reverse Proxy, porta 443 HTTPS)   │
│  │                                          │
│  ├─ Node.js (express, porta 3000)          │
│  │  ├─ /index.html (Frontend)              │
│  │  ├─ /Paginas/* (Frontend)               │
│  │  └─ /api/* (Backend)                    │
│  │                                          │
│  └─ SQL Server (BD)                        │
│                                              │
└──────────────────────────────────────────────┘
         ↑ (HTTPS/SSL)
    seu-dominio.com
```

---

## 💰 Custos Estimados

| Componente | Custo | Notas |
|-----------|-------|-------|
| VPS Windows | $30-50/mês | Basic até advanced |
| Domínio | $10-15/ano | Namecheap, GoDaddy |
| SSL | Grátis | Let's Encrypt |
| BD (SQL Server) | Incluído | Vem com Windows |
| **Total** | **$40-65/mês** | - |

---

## ⏱️ Tempos Estimados

| Tarefa | Tempo |
|--------|-------|
| Ler documentação | 30 min |
| Preparar código | 20 min |
| Setup VPS | 30 min |
| Deploy | 10 min |
| Testes | 20 min |
| **Total** | **1.5-2h** |

---

## 🆘 Precisa de Ajuda?

### Erros Comuns

1. **"Cannot find module"**
   - Solução: `npm install --production`

2. **"Port 3000 already in use"**
   - Solução: `pm2 delete EDM` + `pm2 start server.js`

3. **API não conecta à BD**
   - Solução: Verificar `.env` com credenciais corretas

4. **Frontend não conecta à API**
   - Solução: Ver FRONTEND_API_INTEGRATION.md

5. **CORS errors**
   - Solução: Adicionar domínio em `.env` `CORS_ORIGINS`

---

## 📚 Estrutura de Arquivos Recomendada

```
C:\EDM\
├── server.js              ← Servidor principal
├── package.json           ← Scripts npm
├── .env.production        ← Config produção
├── web.config             ← Config IIS
├── deploy.ps1             ← Script deploy
├── Index.html             ← Frontend
├── Paginas/
│   ├── config.js          ← Config API
│   ├── *.html             ← Páginas
│   ├── *.js               ← Scripts
│   └── *.css              ← Estilos
├── scripts/
│   └── *.js
├── Imag/
│   └── (imagens)
└── node_modules/          ← Dependências (gerado)
```

---

## 🎓 Resumo em 30 Segundos

1. **Local:** Seu projeto já funciona ✅
2. **Preparar:** Criar `.env.production` e `web.config`
3. **VPS:** Transferir projeto, instalar PM2
4. **Deploy:** `pm2 start server.js --env production`
5. **Domínio:** Apontar DNS
6. **HTTPS:** Let's Encrypt
7. **Result:** Seu site está no ar! 🚀

---

## 📞 Próximas Ações

### Hoje
- [ ] Ler QUICK_DEPLOYMENT.md
- [ ] Preparar .env.production

### Esta Semana
- [ ] Testar localmente com npm run start:prod
- [ ] Comprar VPS

### Próxima Semana
- [ ] Fazer deployment
- [ ] Testar em produção
- [ ] Apontar domínio

---

## 🔗 Links Úteis

- Node.js: https://nodejs.org
- PM2: https://pm2.keymetrics.io
- Let's Encrypt: https://letsencrypt.org
- IIS: https://docs.microsoft.com/iis
- Windows Server: https://docs.microsoft.com/windows-server

---

## ✨ Sucesso!

Quando completar todos os passos:
- ✅ Sistema rodando em https://seu-dominio.com
- ✅ BD sincronizada
- ✅ Frontend funcionando
- ✅ API respondendo
- ✅ HTTPS/SSL ativo
- ✅ PM2 gerenciando

**Parabéns! Seu sistema está em produção!** 🎉

