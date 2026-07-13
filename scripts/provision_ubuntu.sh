#!/bin/bash
set -euo pipefail

# Provision script for Ubuntu (run as root)
# Usage: DOMAIN=example.com GIT_REPO=https://github.com/engdeveloper51-collab/edm.git ./scripts/provision_ubuntu.sh

DOMAIN=${DOMAIN:-}
GIT_REPO=${GIT_REPO:-https://github.com/engdeveloper51-collab/edm.git}
APP_DIR=${APP_DIR:-/var/www/edm}
APP_USER=${APP_USER:-deploy}
APP_PORT=${APP_PORT:-3000}
DB_ENGINE=${DB_ENGINE:-mysql} # mysql or postgres
DB_NAME=${DB_NAME:-edm_db}
DB_USER=${DB_USER:-edm_user}
DB_PASS=${DB_PASS:-}

if [ -z "$DB_PASS" ]; then
  echo "No DB_PASS provided. The script will prompt for a password."
  read -s -p "Enter DB password: " DB_PASS
  echo
fi

echo "Starting provisioning..."
apt update && apt upgrade -y

apt install -y curl git build-essential ca-certificates

# create app user
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" $APP_USER
  usermod -aG sudo $APP_USER
fi

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# nginx and certbot
apt install -y nginx
apt install -y certbot python3-certbot-nginx

if [ "$DB_ENGINE" = "mysql" ]; then
  apt install -y mysql-server
  # create DB and user
  mysql --execute="CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`; CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS'; GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;"
else
  apt install -y postgresql postgresql-contrib
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
fi

# Clone app
rm -rf "$APP_DIR"
git clone "$GIT_REPO" "$APP_DIR"
chown -R $APP_USER:$APP_USER "$APP_DIR"

su - $APP_USER -c "cd $APP_DIR && npm install --production"

# pm2
npm install -g pm2

cat > /etc/systemd/system/pm2-$APP_USER.service <<'EOF'
[Unit]
Description=PM2 process manager for $APP_USER
After=network.target

[Service]
User=$APP_USER
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/bin:/usr/local/bin
Environment=PM2_HOME=/home/$APP_USER/.pm2
Restart=always
RestartSec=10
ExecStart=/usr/bin/pm2 resurrect
ExecStop=/usr/bin/pm2 save --silent

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now pm2-$APP_USER.service || true

# pm2 start app
su - $APP_USER -c "cd $APP_DIR && pm2 start server.js --name edm --update-env --env production -- --port $APP_PORT || true; pm2 save"

# nginx config
NGINX_CONF=/etc/nginx/sites-available/edm
cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name ${DOMAIN:-_};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/edm
nginx -t && systemctl reload nginx

if [ -n "$DOMAIN" ]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@$DOMAIN || true
fi

echo "Provisioning complete. App directory: $APP_DIR"
echo "If your app requires environment variables, create a .env in $APP_DIR and restart pm2: sudo su - $APP_USER -c 'cd $APP_DIR && pm2 restart edm'"
