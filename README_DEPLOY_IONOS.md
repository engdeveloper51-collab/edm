# Deploy to IONOS Ubuntu Cloud Server

Brief steps:

1. Create a Cloud Server Ubuntu in IONOS and add your SSH public key.
2. Copy the files in `scripts/provision_ubuntu.sh`, `deploy/pm2.ecosystem.config.js` and `deploy/nginx_edm.conf.template` to the server (or clone this repo there).
3. Run the provision script as root. Example:

```bash
# on your local machine (replace with your server IP)
ssh root@SERVER_IP
# on the server, in the repo root
DOMAIN=your-domain.com DB_ENGINE=mysql DB_NAME=edm_db DB_USER=edm_user DB_PASS='StrongPass' GIT_REPO=https://github.com/engdeveloper51-collab/edm.git /var/www/edm/scripts/provision_ubuntu.sh
```

Notes:
- The script installs Node 18, nginx, certbot and MySQL (or PostgreSQL if you set `DB_ENGINE=postgres`).
- After provision, place any environment variables in `/var/www/edm/.env` and restart pm2: `pm2 restart edm` as the app user.
- The script will attempt to obtain a certificate with certbot if `DOMAIN` is provided.
