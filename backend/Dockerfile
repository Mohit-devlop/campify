FROM node:20-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production run stage
FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
