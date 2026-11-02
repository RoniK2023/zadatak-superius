FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# The schema must be present before npm ci: the postinstall hook runs "prisma generate".
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NODE_ENV=production
EXPOSE 4000
# Apply migrations, run the idempotent seed, start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]
