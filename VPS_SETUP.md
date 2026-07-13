# Setup no VPS

## 1. Instalar dependências no VPS

```bash
sudo apt update
sudo apt install -y nodejs npm mysql-client
```

## 2. Clonar o projeto

```bash
cd /var/www
sudo git clone <seu-repositorio> edm
cd edm
npm install
```

## 3. Criar o banco MySQL remoto

```bash
mysql -h <host-do-vps> -u <usuario> -p
CREATE DATABASE db_dlaudo_erp;
```

## 4. Aplicar o schema

```bash
mysql -h <host-do-vps> -u <usuario> -p db_dlaudo_erp < mysql-init/01-schema.sql
```

## 5. Configurar variáveis de ambiente

```bash
cp mysql-conn-example.env .env
```

Edite o arquivo .env com os dados do VPS.

## 6. Rodar a aplicação

```bash
npm start
```

## 7. Opcional: usar PM2

```bash
npm install -g pm2
pm2 start server.js --name edm
pm2 save
pm2 startup
```
