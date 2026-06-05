# Configuração Nginx para o Projeto

## 📋 O que foi criado:

1. **nginx.conf** - Configuração do nginx como proxy reverso
2. **docker-compose.yml** - Arquivo para rodar app + nginx com Docker
3. **Dockerfile** - Imagem Docker da aplicação Node.js

## 🚀 Como usar:

### Opção 1: Com Docker Compose (Recomendado)

```bash
# Instalar Docker: https://www.docker.com/products/docker-desktop

# Iniciar aplicação + nginx
docker-compose up

# Acessar em http://localhost
```

### Opção 2: Nginx instalado localmente no Windows

1. **Baixar nginx:**
   - [nginx para Windows](http://nginx.org/en/download.html)
   - Ou usar Windows Package Manager: `winget install nginx`

2. **Configurar:**
   ```bash
   # Copiar nginx.conf para a pasta do nginx
   cp nginx.conf "C:\Program Files\nginx\conf\nginx.conf"
   
   # Ou editar: C:\Program Files\nginx\conf\nginx.conf
   # E substituir o conteúdo de `http { }` com o arquivo nginx.conf
   ```

3. **Iniciar nginx:**
   ```bash
   cd "C:\Program Files\nginx"
   nginx.exe
   
   # Ou para rodar como serviço:
   # Baixar e instalar: https://github.com/winsw/winsw
   ```

4. **Iniciar sua aplicação Node.js:**
   ```bash
   npm start
   ```

5. **Acessar em:** `http://localhost`

## ✅ O que nginx faz:

- ✔️ Ouve porta 80
- ✔️ Redireciona tráfego para Express (porta 3000)
- ✔️ Adiciona headers de segurança (X-Real-IP, X-Forwarded-For)
- ✔️ Suporta WebSocket
- ✔️ Permite uploads até 50MB

## 🔧 Comandos úteis:

```bash
# Docker Compose
docker-compose up -d          # Rodar em background
docker-compose down           # Parar tudo
docker-compose logs -f        # Ver logs

# Nginx local (Windows)
nginx -s reload              # Recarregar config
nginx -s stop                # Parar nginx
nginx -t                      # Testar configuração
```

## 📝 Próximos passos (se necessário):

- [ ] Adicionar HTTPS/SSL
- [ ] Configurar rate limiting
- [ ] Adicionar compressão gzip
- [ ] Configurar cache
- [ ] Load balancing

Dúvidas? Edite `nginx.conf` conforme necessário! 🎯
