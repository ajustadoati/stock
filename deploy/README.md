Guia de despliegue VPS (stock.reclib.com)

Este repositorio es un monorepo con:
- API Express en `artifacts/api-server`
- Frontend Vite en `artifacts/inventario`
- PostgreSQL con Drizzle en `lib/db`

La idea es servir el frontend como archivos estaticos y hacer proxy a la API en `/api`.

Requisitos del VPS (Ubuntu 24.04)
1. Dominio `stock.reclib.com` apuntando al VPS con un registro A.
2. Usuario de despliegue con sudo (ejemplo `deploy`).
3. PostgreSQL instalado y una base creada.

Instalacion base en el VPS
1. `sudo apt update`
2. `sudo apt install -y git nginx curl ca-certificates`
3. Instalar Node.js (ejemplo Node 22):
4. `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -`
5. `sudo apt install -y nodejs`
6. `sudo corepack enable`
7. `sudo corepack prepare pnpm@latest --activate`

PostgreSQL (configuracion basica)
1. `sudo apt install -y postgresql`
2. `sudo systemctl enable --now postgresql`
3. Crear base y usuario:
4. `sudo -u postgres psql`
5. Dentro de psql:
```
CREATE USER inventario_user WITH PASSWORD 'CAMBIA_ESTA_PASSWORD';
CREATE DATABASE inventario OWNER inventario_user;
GRANT ALL PRIVILEGES ON DATABASE inventario TO inventario_user;
```
6. `\q`

Clonar el repo
1. `sudo mkdir -p /opt/inventario`
2. `sudo chown -R deploy:deploy /opt/inventario`
3. `git clone <tu-repo-git> /opt/inventario`
4. `cd /opt/inventario`

Variables de entorno (API)
1. `sudo mkdir -p /etc/inventario`
2. `sudo nano /etc/inventario/api.env`
3. Contenido sugerido:
```
PORT=3000
DATABASE_URL=postgres://inventario_user:CAMBIA_ESTA_PASSWORD@127.0.0.1:5432/inventario
```

Systemd (API)
1. Copia `deploy/systemd-inventario-api.service` a `/etc/systemd/system/inventario-api.service`
2. `sudo systemctl daemon-reload`
3. `sudo systemctl enable inventario-api`

Nginx (frontend + proxy)
1. Copia `deploy/nginx-stock.reclib.com.conf` a `/etc/nginx/sites-available/stock.reclib.com`
2. `sudo ln -s /etc/nginx/sites-available/stock.reclib.com /etc/nginx/sites-enabled/stock.reclib.com`
3. `sudo nginx -t`
4. `sudo systemctl reload nginx`

Primer build y despliegue manual
1. `cd /opt/inventario`
2. `pnpm install --frozen-lockfile`
3. `BASE_PATH=/ PORT=5173 pnpm --filter @workspace/inventario run build`
4. `pnpm --filter @workspace/api-server run build`
5. `sudo systemctl restart inventario-api`

Migraciones de base de datos
1. `cd /opt/inventario`
2. `DATABASE_URL=postgres://... pnpm --filter @workspace/db run push`

HTTPS (recomendado)
1. `sudo apt install -y certbot python3-certbot-nginx`
2. `sudo certbot --nginx -d stock.reclib.com`
