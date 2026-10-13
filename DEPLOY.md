# Розгортання на сервері (Termius)

Ваш `backend/.env` вже заповнений реальними ключами (OpenAI, Telegram-бот, Google Таблиця, чат Романа) —
цей файл **не потрапляє в git** (він у `.gitignore`), тому його треба перенести на сервер окремо, разом
із рештою проєкту. Нижче — повний покроковий сценарій під чистий сервер Ubuntu 22.04+.

## Крок 0. Підключення до сервера

У Termius: створіть нове зʼєднання (Host: IP сервера, User: наприклад `root`, пароль або SSH-ключ від
вашого провайдера сервера) і відкрийте консоль (SSH-сесію).

## Крок 1. Перенести проєкт на сервер

Найпростіше — через вбудований SFTP у Termius (іконка папки/файлового менеджера поруч з SSH-сесією):
перетягніть всю папку `AI-Agent_Yagidnyk` (з вашого Mac) у домашню директорію сервера, наприклад у
`/root/yagidnyk`.

Альтернатива — з терміналу вашого Mac (не в Termius, а у звичайному Terminal.app):

```bash
rsync -avz --exclude node_modules --exclude dist \
  "/Users/macbookpro/Desktop/AI-Agent_Yagidnyk/" \
  root@ВАШ_IP_СЕРВЕРА:/root/yagidnyk/
```

(Заміните `ВАШ_IP_СЕРВЕРА` на реальну адресу; введіть пароль сервера, коли попросить.)

## Крок 2. Встановити Docker на сервері

У консолі Termius (вже підключені до сервера) виконайте по черзі:

```bash
apt update && apt upgrade -y
```

```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

```bash
apt install -y docker-compose-plugin
```

```bash
docker --version && docker compose version
```

## Крок 3. Перевірити .env перед запуском

```bash
cd /root/yagidnyk
cat backend/.env | head -5
```

Переконайтесь, що файл на місці і не порожній. Якщо плануєте публічний домен для адмінки/вебхуків —
одразу оновіть у `backend/.env`:

```bash
nano backend/.env
```

І змініть:
- `PUBLIC_BASE_URL` → `https://ваш-домен.com` (потрібно, щоб посилання на фото/відео в адмінці працювали ззовні)
- `ADMIN_PANEL_ORIGIN` → `https://ваш-домен.com` (домен, з якого відкриватиметься адмінка)

Збережіть: `Ctrl+O`, `Enter`, вихід — `Ctrl+X`.

## Крок 4. Запустити всю систему

```bash
cd /root/yagidnyk
docker compose up -d --build
```

Перший запуск збере образи і застосує міграції бази даних + створить адмін-акаунт і демо-дані
автоматично (це прописано в `backend/Dockerfile`).

## Крок 5. Перевірити, що все працює

```bash
docker compose ps
```

```bash
curl http://localhost:4000/health
```

Очікується: `{"ok":true}`.

```bash
docker compose logs -f backend
```

У логах має з�явитись:
```
[server] Backend запущено на порту 4000
[telegram] Клієнтський бот запущено у режимі polling
[scheduler] Синхронізація Google Таблиці запланована за розкладом: */15 * * * *
```

Натисніть `Ctrl+C`, щоб вийти з перегляду логів (сам сервіс продовжить працювати у фоні).

Адмінка буде доступна на порту `5173` сервера — `http://ВАШ_IP_СЕРВЕРА:5173` (або через домен, якщо
налаштуєте Nginx нижче).

## Корисні команди для щоденної роботи

Перезапустити все:
```bash
cd /root/yagidnyk && docker compose restart
```

Зупинити все:
```bash
cd /root/yagidnyk && docker compose down
```

Подивитись логи конкретного сервісу:
```bash
docker compose logs -f backend
docker compose logs -f admin-frontend
docker compose logs -f postgres
```

Оновити після зміни коду (якщо перезаливали файли через SFTP):
```bash
cd /root/yagidnyk && docker compose up -d --build
```

Вручну запустити синхронізацію цін з Google Таблиці (без очікування розкладу), або будь-який інший
запит до API — зручно через `curl` з сервера:
```bash
curl -X POST http://localhost:4000/api/products/sync -H "Authorization: Bearer ВАШ_ТОКЕН_З_АДМІНКИ"
```

Зайти в базу даних напряму (для діагностики):
```bash
docker compose exec postgres psql -U yagidnyk -d yagidnyk
```

## (Рекомендовано) Домен + HTTPS через Nginx

Публічний домен з HTTPS потрібен для: TikTok-вебхука (коли отримаєте доступ), Telegram-вебхука (якщо
захочете відмовитись від polling), і щоб адмінка відкривалась по-людськи, а не через `IP:5173`.

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Створіть конфіг (замініть `ваш-домен.com` на реальний, який вже вказує A-записом на IP цього сервера):

```bash
cat > /etc/nginx/sites-available/yagidnyk <<'EOF'
server {
    listen 80;
    server_name ваш-домен.com;

    location /api/ { proxy_pass http://localhost:4000; proxy_set_header Host $host; }
    location /webhooks/ { proxy_pass http://localhost:4000; proxy_set_header Host $host; }
    location /uploads/ { proxy_pass http://localhost:4000; proxy_set_header Host $host; }

    location / { proxy_pass http://localhost:5173; proxy_set_header Host $host; }
}
EOF
ln -s /etc/nginx/sites-available/yagidnyk /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Отримати безкоштовний SSL-сертифікат:

```bash
certbot --nginx -d ваш-домен.com
```

Після цього адмінка доступна на `https://ваш-домен.com`, а вебхук для TikTok — на
`https://ваш-домен.com/webhooks/tiktok`.

## Безпека

- Файл `backend/.env` містить реальні ключі — ніколи не додавайте його в git, не пересилайте у публічні
  чати.
- Рекомендую згодом змінити пароль адміна прямо в базі (через `docker compose exec postgres psql`) або
  додати окремий ендпоінт зміни пароля, якщо потрібно.
- Обмежте доступ по SSH (ключ замість пароля, зміна порту 22) — стандартна практика для будь-якого
  сервера, не повʼязана напряму з цим проєктом.
