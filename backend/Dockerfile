FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
# Devdependencies werden bewusst mitinstalliert: die Prisma CLI (für
# "migrate deploy" beim Container-Start) liegt in devDependencies.
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN mkdir -p uploads data

EXPOSE 4000

CMD sh -c "npx prisma migrate deploy && node src/index.js"
