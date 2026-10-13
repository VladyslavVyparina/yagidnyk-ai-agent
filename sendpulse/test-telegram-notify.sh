#!/bin/bash
# One test notice to the manager chat.
# Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_NOTIFY_CHAT_ID=... bash sendpulse/test-telegram-notify.sh

: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN}"
: "${TELEGRAM_NOTIFY_CHAT_ID:?Set TELEGRAM_NOTIFY_CHAT_ID}"

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "'"${TELEGRAM_NOTIFY_CHAT_ID}"'",
    "parse_mode": "HTML",
    "disable_web_page_preview": true,
    "text": "<b>New lead — Yagidnyk</b>\nChannel: TikTok\n\n<b>Client</b>\n• Name: Test Client\n• Username: @test_user\n• Phone: +380501112233\n\n<b>Request</b>\n• Product: wormwood\n• Volume: 50 kg\n• Location: example city\n\n<b>Summary</b>\nThe supplier is ready to deliver and is waiting for a call.",
    "reply_markup": {
      "inline_keyboard": [
        [
          {
            "text": "Open the chat in SendPulse",
            "url": "https://login.sendpulse.com/chatbots/chats?contactId=TEST_CONTACT_ID"
          }
        ]
      ]
    }
  }'
echo
