# For ECS Fargate (x86_64), build with: docker build --platform linux/amd64 -t my-backend .
# Build stage (linux/amd64 for AWS ECS Fargate compatibility)
FROM --platform=linux/amd64 node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock* package-lock.json* ./
RUN yarn install --frozen-lockfile || npm ci || (yarn install || npm install)

COPY . .
# DATABASE_URL: use build-arg (from host env) if set, else fall back to .env.example
ARG DATABASE_URL
RUN cp .env.example .env && \
    if [ -n "$DATABASE_URL" ]; then \
      grep -v '^DATABASE_URL=' .env > .env.tmp && echo "DATABASE_URL=$DATABASE_URL" >> .env.tmp && mv .env.tmp .env; \
    fi
RUN npx prisma generate
RUN yarn build

# Production stage (linux/amd64 for AWS ECS Fargate)
FROM --platform=linux/amd64 node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# DATABASE_URL (PostgreSQL URI) được inject từ docker-compose hoặc env

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/scripts ./scripts
# Sentiment: code expects /app/dist/sentiment/knowledge and /app/datasets (see sentiment.service path resolution)
COPY --from=builder /app/src/sentiment/knowledge ./dist/sentiment/knowledge
COPY --from=builder /app/datasets ./datasets
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

# Bypass node image entrypoint (avoids exec format error when base image arch differs from Fargate)
ENTRYPOINT []
CMD ["/docker-entrypoint.sh"]
