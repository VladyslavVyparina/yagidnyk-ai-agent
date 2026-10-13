# SendPulse: Google Таблиця з цінами + сповіщення в Telegram

## Частина 1. Google Таблиця — формат

Рекомендована структура аркуша `Прайс` (або `Аркуш1`):

| ТОВАР | ЦІНА | ПРИЙМАЄТЬСЯ | ПРИМІТКА |
|-------|------|-------------|----------|
| Полин | 50 грн/кг сухий, 10 грн/кг свіжий | так | |
| Листя горіха | 120 грн/кг | так | сушене |
| Туя | 80 грн/кг | так | менше деревʼяної частини |
| Гілки сосни | | ні | не приймаємо |

Посилання на вашу таблицю:
https://docs.google.com/spreadsheets/d/135eS0j72otGtMIsOmSN0eVhvdtOJsm2d15RLa_Piue0/edit

---

## Частина 2. Підключити Google Sheets у SendPulse

1. У SendPulse відкрийте **Chatbots** → ваш бот (TikTok / Telegram).
2. **Bot settings** → **Integrations**.
3. Біля **Google Sheets** натисніть **Grant access**.
4. Увійдіть у Google-акаунт, де лежить таблиця.
5. Дозвольте SendPulse доступ до таблиць.
6. Оберіть таблицю **test** (або як назвете прайс).
7. Збережіть.

Документація SendPulse:
https://sendpulse.com/knowledge-base/chatbot/action/connect-google-sheets

---

## Частина 3. Як AI бере актуальні ціни (2 варіанти)

### Варіант A — Рекомендований для SendPulse: AI Agent + Retrieve data from row

SendPulse AI **не читає таблицю напряму як ChatGPT file search**. Потрібно в воронці:

1. **AI Agent** — клієнт пише запит.
2. AI Agent зберігає назву товару у змінну, наприклад `product_name` (через "Save user response data").
3. Блок **Action** → **Retrieve data from Google Sheets row**:
   - Spreadsheet: ваша таблиця
   - Sheet: Аркуш1
   - Search column: **ТОВАР**
   - Contains value: змінна `{{product_name}}`
   - Map columns:
     - ТОВАР → `product_found`
     - ЦІНА → `product_price`
     - ПРИЙМАЄТЬСЯ → `product_available`
     - ПРИМІТКА → `product_note`
4. Далі знову **AI Agent** з промптом:

```
Клієнт цікавиться товаром: {{product_name}}.
Дані з прайсу:
- Ціна: {{product_price}}
- Приймається: {{product_available}}
- Примітка: {{product_note}}

Відповідай українською як Роман. Якщо product_price порожній — скажи, що зараз не приймаємо або уточниш. Не вигадуй ціну.
```

5. Якщо рядок не знайдено — гілка "не знайдено" → AI каже, що позиція зараз не в прайсі.

### Варіант B — Простіше, але без live-пошуку по рядку

1. Експортуйте аркуш прайсу як **PDF або TXT** раз на день/тиждень.
2. Завантажте файл у **OpenAI Assistant** (SendPulse → OpenAI Assistant integration).
3. У Instructions вставте системний промпт з `01_SYSTEM_PROMPT_OLEKSANDR.txt`.
4. AI шукатиме ціни у файлі, але оновлення — лише після повторного завантаження файлу.

Для **актуальних цін у реальному часі** використовуйте **Варіант A**.

---

## Частина 4. Сповіщення Роману в Telegram

Chat ID: `-5470958053`
Bot token: `8959686491:AAE1yIi9lzkkKEJjReN3AAKK2d9XhTZ8fG0`

Бот має бути доданий у цей чат/групу.

### Спосіб 1 — Без сервера, прямо з SendPulse (найпростіший)

У воронці, коли лід кваліфікований / передача менеджеру:

1. Додайте блок **Action** → **Send API request**.
2. Налаштування:

**Method:** POST

**URL:**
```
https://api.telegram.org/bot8959686491:AAE1yIi9lzkkKEJjReN3AAKK2d9XhTZ8fG0/sendMessage
```

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "chat_id": "-5470958053",
  "text": "Новий лід ({{channel}})\nІмʼя: {{first_name}}\nНік: @{{username}}\nТелефон: {{phone}}\nТовар: {{product_name}}\nОбʼєм: {{volume_kg}} кг\nПідсумок: {{lead_summary}}\nКанал: {{messenger}}"
}
```

Замініть `{{...}}` на реальні змінні SendPulse (імʼя підписника, телефон, товар тощо).

### Спосіб 2 — Через webhook-скрипт на VPS (гнучкіше форматування)

Якщо на VPS ще працює ваш сервер — див. `telegram-notify-server.js` у цій папці.

URL для SendPulse API request:
```
http://173.242.54.197:4000/webhooks/sendpulse/notify
```

Body:
```json
{
  "channel": "TikTok",
  "firstName": "{{first_name}}",
  "username": "{{username}}",
  "phone": "{{phone}}",
  "product": "{{product_name}}",
  "volumeKg": "{{volume_kg}}",
  "summary": "{{lead_summary}}"
}
```

---

## Частина 5. Що вставити в SendPulse AI

| Куди в SendPulse | Що вставити |
|------------------|-------------|
| AI Agent → Instructions / System prompt | `01_SYSTEM_PROMPT_OLEKSANDR.txt` |
| OpenAI Assistant → Instructions | `01_SYSTEM_PROMPT_OLEKSANDR.txt` + `02_BUSINESS_CONTEXT.txt` |
| Knowledge base / Upload file | `03_KNOWLEDGE_BASE_FAQ.txt` |
| Окремий блок AI після Google Sheets | промпт з Частини 3, Варіант A |

---

## Частина 6. Теги і змінні SendPulse (рекомендація)

Створіть змінні бота:
- `product_name` — String
- `product_price` — String
- `product_available` — String
- `volume_kg` — String
- `client_location` — String
- `phone` — String
- `lead_summary` — String

Теги для сегментації:
- `цікавиться_ціною`
- `готовий_здати`
- `передано_роману`
- `несезонний_товар`

Коли AI збирає лід — поставте тег `передано_роману` і викличте Telegram-сповіщення.
