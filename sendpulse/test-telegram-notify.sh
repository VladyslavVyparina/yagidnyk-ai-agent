#!/bin/bash
# Одноразове тестове сповіщення в Telegram-чат Романа
# Використання: bash sendpulse/test-telegram-notify.sh

BOT_TOKEN="8959686491:AAE1yIi9lzkkKEJjReN3AAKK2d9XhTZ8fG0"
CHAT_ID="-5470958053"

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "'"${CHAT_ID}"'",
    "parse_mode": "HTML",
    "disable_web_page_preview": true,
    "text": "<b>Новий лід — Ягідник</b>\nКанал: TikTok\n\n<b>Клієнт</b>\n• Імʼя: Тест Клієнт\n• Нік: @test_user\n• Телефон: +380991234567\n\n<b>Запит</b>\n• Товар: Полин\n• Обʼєм: 50 кг\n• Локація: Вознесенськ\n\n<b>Підсумок</b>\nКлієнт готовий здати сировину, чекає на дзвінок.",
    "reply_markup": {
      "inline_keyboard": [
        [
          {
            "text": "Відкрити чат у SendPulse",
            "url": "https://login.sendpulse.com/chatbots/chats?contactId=TEST_CONTACT_ID"
          }
        ]
      ]
    }
  }'

echo ""
