FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod=false --dangerously-allow-all-builds

COPY . ./
RUN pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
RUN apk add --no-cache python3 make g++

COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/index.js"]
