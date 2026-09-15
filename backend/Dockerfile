FROM node:18-alpine

WORKDIR /app

# Alpine hat standardmäßig kein OpenSSL installiert. Ohne die Shared Libs
# kann Prismas Schema-/Query-Engine sich nicht initialisieren und crasht
# beim Start mit "Could not parse schema engine response" - muss vor
# "prisma generate" (Build) UND vor "prisma migrate deploy" (Laufzeit) da
# sein, deshalb ganz am Anfang.
RUN apk add --no-cache openssl

# Verhindert, dass die Prisma CLI beim Start eine Netzwerkanfrage an
# checkpoint.prisma.io schickt (Telemetry/Update-Check) - unnötig und auf
# manchen Hosts mit eingeschränktem Netzwerk nur eine Verzögerung.
ENV CHECKPOINT_DISABLE=1

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
