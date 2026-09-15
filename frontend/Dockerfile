FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
# Default passt zum Service-Namen "backend" in docker-compose.yml. Wird zur
# Laufzeit gelesen (next.config.js), lässt sich also ohne Rebuild per
# "docker run -e BACKEND_INTERNAL_URL=..." bzw. Portainer-Stack-Env
# überschreiben - z.B. wenn Backend und Frontend nicht im selben
# Compose-Netzwerk laufen.
ENV BACKEND_INTERNAL_URL=http://backend:4000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
