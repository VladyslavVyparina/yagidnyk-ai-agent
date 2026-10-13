FROM node:20-alpine AS base

# Prisma на Alpine потребує OpenSSL, інакше db push падає і backend у циклі restart
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 4000

# Без tsc під час збірки — на VPS з 1 GB RAM компіляція TypeScript падає з OOM.
# Запускаємо TypeScript напряму через tsx (вже є в devDependencies).
CMD ["sh", "-c", "npx prisma db push && npx tsx src/scripts/seed.ts && npx tsx src/index.ts"]
