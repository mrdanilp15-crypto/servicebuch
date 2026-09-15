FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN mkdir -p uploads data

EXPOSE 4000

CMD sh -c "npx prisma migrate deploy && node src/index.js"
