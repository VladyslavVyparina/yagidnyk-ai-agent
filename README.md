# Yagidnyk AI agent

One purchasing agent, named Oleksandr, that talks to suppliers on Telegram and TikTok, prices raw materials from a Google Sheet, and lets a manager answer by hand from a web inbox.

## Problem

A buyer of medicinal herbs, berries, flowers, and other raw materials was receiving offers in more than one chat app. Prices changed in a spreadsheet, and the manager needed the same answers in every channel plus a way to step into a conversation.

## What was built

- The same agent (prompt, knowledge base, price list) on Telegram and TikTok, so the tone does not depend on the channel.
- A manager notification channel when a conversation needs a person.
- Google Sheets as the live price source.
- A React admin in the style of a chat inbox: conversation list, thread, and customer card.
- Reminders, lead capture, and a knowledge base the operator can edit.

## How it works

Telegram uses Telegraf long polling. TikTok arrives as a Business Messaging webhook. Both channels call one messaging layer, so outbound replies do not care which app the supplier used. The agent core uses OpenAI function calling against the knowledge base and the current sheet. The admin API covers auth, conversations, contacts, knowledge, and products. PostgreSQL is accessed through Prisma.

On first boot the backend runs migrations and seeds an admin user plus demo FAQ and sample products.

## Stack

Node.js, TypeScript, Express, Prisma, PostgreSQL, React, Vite, Docker, Telegram, TikTok Business Messaging, Google Sheets, OpenAI.

## Run locally

```bash
docker compose up --build
```

Backend: `http://localhost:4000`. Admin: `http://localhost:5173`.

Without Docker: Node 20+, PostgreSQL 16+, copy `backend/.env.example` to `backend/.env`, then `npm install`, `npm run prisma:migrate:dev`, `npm run seed`, and `npm run dev` in `backend` and `admin-frontend`.

## What this public copy leaves out

`backend/.env` and any live tokens. Fill the example env file before running.

## Documents

- `DEPLOY.md` is the Ubuntu install: Docker Compose, the admin on port 5173, Nginx, and HTTPS for the TikTok webhook.
- `sendpulse/SENDPULSE_SETUP.md` is how the sheet row is fetched inside a SendPulse flow and how the manager is notified. Tokens stay in the environment.
- `sendpulse/05_SIMPLE_FLOW.md` is the canvas that SendPulse will save: no arrows back to the same agent, a Message block after the sheet, and a dead end after the hand-over tag.
- The `.txt` prompts next to those guides stay in Ukrainian. That is the language suppliers write in. Translating them would change the agent, not the case write-up.
