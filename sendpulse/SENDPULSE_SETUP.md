# SendPulse: price sheet and a Telegram notice

The live bot token, chat id, and spreadsheet URL belong in your own SendPulse account and in `.env`. They are not written in this file.

## 1. Sheet shape

Sheet name `Price` (or the first sheet):

| PRODUCT | PRICE | ACCEPTED | NOTE |
|---|---|---|---|
| wormwood | 50 UAH/kg dried, 10 UAH/kg fresh | yes | |
| walnut leaf | 120 UAH/kg | yes | dried |
| thuja | 80 UAH/kg | yes | less wood |
| pine branches | | no | not accepted |

## 2. Connect Google Sheets in SendPulse

1. Chatbots, then the TikTok or Telegram bot.
2. Bot settings, then Integrations.
3. Next to Google Sheets, Grant access.
4. Sign in to the Google account that owns the sheet.
5. Allow SendPulse to read spreadsheets.
6. Pick the price spreadsheet.
7. Save.

SendPulse documents the same action at `https://sendpulse.com/knowledge-base/chatbot/action/connect-google-sheets`.

## 3. How the agent reads a current price

### A. Recommended: AI Agent, then retrieve one row

SendPulse AI does not read the sheet the way a ChatGPT file search does. The flow has to fetch the row.

1. An AI Agent block receives the visitor’s message.
2. The agent stores the product name in `product_name`.
3. Action, Retrieve data from a Google Sheets row:
   - Spreadsheet: the price file
   - Sheet: the first sheet
   - Search column: PRODUCT
   - Contains: `{{product_name}}`
   - Map PRODUCT to `product_found`, PRICE to `product_price`, ACCEPTED to `product_available`, NOTE to `product_note`
4. A following message or agent answers from those variables. If `product_price` is empty, say the item is not being bought right now. Do not invent a price.
5. If the row is missing, take the “not found” branch and say the item is not on the current list.

The supplier-facing wording stays in Ukrainian, because that is the language of the buying chat. The prompt files in this folder are that wording.

### B. Simpler, and not live

Export the sheet to PDF or text once a day or once a week, upload it to the OpenAI Assistant inside SendPulse, and paste `01_SYSTEM_PROMPT_OLEKSANDR.txt` into the instructions. Prices change only when you upload the file again. Use option A when the price has to be current.

## 4. Notify the manager in Telegram

Add the bot to the manager chat. Store the bot token and the chat id as SendPulse variables or as environment variables for `telegram-notify-server.js`. Do not paste a token into the flow as a permanent URL if you can avoid it. If the flow calls Telegram directly:

- Method POST
- URL `https://api.telegram.org/bot<token>/sendMessage`
- Header `Content-Type: application/json`
- Body with `chat_id` and a `text` built from `{{channel}}`, `{{first_name}}`, `{{username}}`, `{{phone}}`, `{{product_name}}`, `{{volume_kg}}`, `{{lead_summary}}`, `{{messenger}}`

The server option posts to your own `/webhooks/sendpulse/notify` with `channel`, `firstName`, `username`, `phone`, `product`, `volumeKg`, and `summary`. The token stays in the process environment.

## 5. What to paste where

| SendPulse field | File |
|---|---|
| AI Agent instructions | `01_SYSTEM_PROMPT_OLEKSANDR.txt` |
| OpenAI Assistant instructions | that file plus `02_BUSINESS_CONTEXT.txt` |
| Knowledge upload | `03_KNOWLEDGE_BASE_FAQ.txt` |
| The block after the sheet lookup | the price reply from section 3A |

## 6. Variables and tags

String variables: `product_name`, `product_price`, `product_available`, `volume_kg`, `client_location`, `phone`, `lead_summary`.

Tags: interested in a price, ready to deliver, handed to the manager, out of season. When the lead is complete, set the handed-over tag and send the Telegram notice.
