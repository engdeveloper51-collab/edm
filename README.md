# EDM - Sistema de Geolocalizacao

API em Node.js/Express com frontend HTML para gestao de ativos.

## Requisitos

- Node.js 18+
- SQL Server com base `db_dlaudo_erp`

## Configuracao

1. Copie `.env.example` para `.env`.
2. Ajuste as variaveis de banco e `JWT_SECRET`.

## Executar

```bash
npm install
npm start
```

Acesse:
- `http://localhost:3000/` (tela inicial)
- `http://localhost:3000/login.html` (login)
- `http://localhost:3000/mapa` (mapa)

## Testes

```bash
npm test
```

## Observacoes de compatibilidade

- O login agora suporta senha com hash bcrypt e senha legado em texto simples.
- Quando um usuario legado faz login com sucesso, a senha e migrada automaticamente para hash.
