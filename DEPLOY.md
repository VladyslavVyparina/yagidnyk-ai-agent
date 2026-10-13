# Deploy on a server

`backend/.env` holds the live keys (OpenAI, the Telegram bot, the Google Sheet, the manager chat). That file is gitignored. Copy it to the server yourself, with the rest of the project. The steps below assume a clean Ubuntu 22.04 or newer.

## 0. Connect

In Termius, create a connection (host, user such as `root`, the provider’s password or SSH key) and open an SSH session.

## 1. Copy the project

Use Termius SFTP and drop the project folder into the server home, for example `/root/yagidnyk`.

From your own machine:

```bash
rsync -avz --exclude node_modules --exclude dist \
  /path/to/AI-Agent_Yagidnyk/ \
  root@YOUR_SERVER_IP:/root/yagidnyk/
```

## 2. Install Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install -y docker-compose-plugin
docker --version && docker compose version
```

## 3. Check `.env` before the first start

```bash
cd /root/yagidnyk
test -s backend/.env && echo "env present"
```

If the admin and the webhooks will use a public domain, set these in `backend/.env` before you start:

- `PUBLIC_BASE_URL` to `https://your-domain.com`, so photo and video links in the admin work from outside
- `ADMIN_PANEL_ORIGIN` to the same origin

## 4. Start

```bash
cd /root/yagidnyk
docker compose up -d --build
```

The first start builds images, runs database migrations, and creates the admin account and demo data. That is in `backend/Dockerfile`.

## 5. Check

```bash
docker compose ps
curl http://localhost:4000/health
```

Expect `{"ok":true}`.

```bash
docker compose logs -f backend
```

The log should show the backend on port 4000, the Telegram bot in polling mode, and the Google Sheet sync on `*/15 * * * *`. Ctrl+C leaves the log view. The containers keep running.

The admin listens on port 5173: `http://YOUR_SERVER_IP:5173`, or on the domain after the Nginx step below.

## Day to day

Restart:

```bash
cd /root/yagidnyk && docker compose restart
```

Stop:

```bash
cd /root/yagidnyk && docker compose down
```

Logs:

```bash
docker compose logs -f backend
docker compose logs -f admin-frontend
docker compose logs -f postgres
```

After you upload new code:

```bash
cd /root/yagidnyk && docker compose up -d --build
```

Sync prices from the sheet without waiting for the cron:

```bash
curl -X POST http://localhost:4000/api/products/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Database shell:

```bash
docker compose exec postgres psql -U yagidnyk -d yagidnyk
```

## Domain and HTTPS

A public HTTPS domain is required for the TikTok webhook, for a Telegram webhook if you leave polling, and so the admin is not opened as `IP:5173`.

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Replace `your-domain.com` with a name whose A record already points at this server:

```bash
cat > /etc/nginx/sites-available/yagidnyk <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location /api/ { proxy_pass http://localhost:4000; proxy_set_header Host $host; }
    location /webhooks/ { proxy_pass http://localhost:4000; proxy_set_header Host $host; }
    location /uploads/ { proxy_pass http://localhost:4000; proxy_set_header Host $host; }

    location / { proxy_pass http://localhost:5173; proxy_set_header Host $host; }
}
EOF
ln -s /etc/nginx/sites-available/yagidnyk /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d your-domain.com
```

After that the admin is `https://your-domain.com` and the TikTok webhook is `https://your-domain.com/webhooks/tiktok`.

## Secrets

`backend/.env` stays off git and out of public chats. Change the seeded admin password in Postgres, or add a password-change endpoint, before anyone else can open the admin. SSH keys instead of a password are ordinary server practice and are not specific to this project.
